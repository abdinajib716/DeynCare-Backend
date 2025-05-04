/**
 * Registration Payment Controller
 * Handles payment processing during user/admin registration
 */
const mongoose = require('mongoose');
const EVCPaymentService = require('../services/evcPaymentService');
const UserService = require('../services/userService');
const ShopService = require('../services/shopService');
const EmailService = require('../services/emailService');
const { 
  AppError, 
  logInfo,
  logSuccess,
  logWarning,
  logError,
  idGenerator,
  generateVerificationCode,
  calculateExpiry,
  LogHelper
} = require('../utils');

// Import models
const { RegistrationPayment, User, Setting } = require('../models');

/**
 * RegistrationPaymentController handles payment processing during registration
 */
const RegistrationPaymentController = {
  /**
   * Process EVC Plus payment for new admin registration
   * POST /api/registration-payment/evc
   */
  processEvcPayment: async (req, res, next) => {
    try {
      const { 
        // User data
        fullName, 
        email, 
        phone, 
        password,
        // Shop data
        shopName, 
        shopAddress,
        // Payment data
        customerPhone,
        amount,
        // Optional data
        shopLogo
      } = req.validatedData || req.body;

      // Check if email is already in use
      const existingUser = await User.findOne({ email, isDeleted: false });
      if (existingUser) {
        return next(new AppError('Email already in use', 400, 'email_in_use'));
      }

      // Check if online payment is enabled
      const onlineEnabled = await Setting.findOne({ 
        key: 'enable_online_payment',
        shopId: null
      });
      
      if (onlineEnabled && onlineEnabled.value === false) {
        return next(new AppError(
          'Online payment methods are currently disabled',
          400,
          'payment_method_disabled'
        ));
      }

      // Generate unique registration ID
      const registrationId = await idGenerator.generateUniqueId('reg');
      
      // Generate verification code for email verification
      const verificationCode = generateVerificationCode(6);
      
      // Create registration payment record
      const registrationPayment = new RegistrationPayment({
        registrationId,
        registrationData: {
          fullName,
          email,
          phone,
          password, // This will be hashed by the model middleware
          shopName,
          shopAddress,
          verificationCode,
          verificationCodeExpires: calculateExpiry(24) // 24 hours validity
        },
        paymentMethod: 'EVC Plus',
        paymentStatus: 'pending',
        amount: parseFloat(amount),
        customerPhone,
        expiresAt: calculateExpiry(24) // Registration expires in 24 hours if payment not completed
      });
      
      // Save registration payment record
      await registrationPayment.save();
      
      logInfo(`Created registration payment: ${registrationId}`, 'RegistrationPaymentController');
      
      // Process payment through EVC Plus
      const paymentResult = await EVCPaymentService.payByWaafiPay({
        phone: customerPhone,
        amount: parseFloat(amount),
        description: `DeynCare Registration - ${shopName || 'New Shop'}`,
        reference: registrationId,
        shopName: shopName || 'DeynCare Registration'
      });
      
      // Update registration with payment result
      registrationPayment.transactionId = paymentResult.transactionId || null;
      registrationPayment.paymentResponse = {
        responseCode: paymentResult.responseCode,
        responseMessage: paymentResult.responseMessage,
        transactionId: paymentResult.transactionId
      };
      
      if (paymentResult.success) {
        registrationPayment.paymentStatus = 'processing'; // Will be confirmed by callback
        logSuccess(`EVC payment initiated for registration: ${registrationId}`, 'RegistrationPaymentController');
      } else {
        registrationPayment.paymentStatus = 'failed';
        logError(`EVC payment failed for registration: ${registrationId}`, 'RegistrationPaymentController');
      }
      
      // Save updated registration
      await registrationPayment.save();
      
      // Return response based on payment result
      if (paymentResult.success) {
        return res.status(200).json({
          success: true,
          message: 'Payment initiated successfully. Complete the payment on your mobile device.',
          data: {
            registrationId,
            transactionId: paymentResult.transactionId,
            email,
            status: 'processing'
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          message: `Payment failed: ${paymentResult.responseMessage}`,
          error: {
            code: 'payment_failed',
            details: paymentResult.responseMessage
          }
        });
      }
    } catch (error) {
      logError('Failed to process EVC payment for registration', 'RegistrationPaymentController', error);
      return next(error);
    }
  },
  
  /**
   * Check payment status for a registration
   * GET /api/registration-payment/:registrationId/status
   */
  checkPaymentStatus: async (req, res, next) => {
    try {
      const { registrationId } = req.params;
      
      // Find registration payment
      const registration = await RegistrationPayment.findOne({ registrationId });
      
      if (!registration) {
        return next(new AppError('Registration not found', 404, 'registration_not_found'));
      }
      
      // Return registration status
      return res.status(200).json({
        success: true,
        message: 'Registration payment status retrieved',
        data: {
          registrationId,
          status: registration.paymentStatus,
          transactionId: registration.transactionId,
          createdAt: registration.createdAt,
          expiresAt: registration.expiresAt,
          completedAt: registration.completedAt || null,
          userId: registration.userId || null,
          shopId: registration.shopId || null
        }
      });
    } catch (error) {
      logError(`Failed to check registration status: ${req.params.registrationId}`, 'RegistrationPaymentController', error);
      return next(error);
    }
  },
  
  /**
   * Handle EVC Plus callback
   * POST /api/registration-payment/evc-callback
   */
  handleEvcCallback: async (req, res, next) => {
    try {
      // Get callback data from WaafiPay
      const {
        invoiceId, // This contains our registrationId
        transactionId,
        resultCode,
        resultDesc,
        status
      } = req.body;
      
      logInfo(`Received EVC callback for registration: ${invoiceId}`, 'RegistrationPaymentController');
      
      // Find the registration payment record
      const registration = await RegistrationPayment.findOne({ registrationId: invoiceId });
      
      if (!registration) {
        logError(`Callback received for unknown registration: ${invoiceId}`, 'RegistrationPaymentController');
        return res.status(404).json({
          success: false,
          message: 'Registration not found'
        });
      }
      
      // Check if payment was successful
      const isSuccess = (resultCode === '0' || status === 'success');
      
      // Update registration payment data
      registration.callbackReceived = true;
      registration.callbackData = req.body;
      registration.callbackTime = new Date();
      
      if (isSuccess) {
        // Payment successful - complete registration
        try {
          // Start a database transaction
          const session = await mongoose.startSession();
          session.startTransaction();
          
          try {
            // Extract registration data
            const { 
              fullName, 
              email, 
              phone, 
              password, 
              shopName, 
              shopAddress, 
              verificationCode 
            } = registration.registrationData;
            
            // Set payment as completed
            registration.paymentStatus = 'completed';
            registration.completedAt = new Date();
            
            // Create the shop
            const shop = await ShopService.createShop({
              shopName,
              ownerName: fullName,
              email,
              phone,
              address: shopAddress,
              status: 'pending',
              verified: false,
              subscription: {
                planType: 'monthly', // Default to monthly for paid subscriptions
                startDate: new Date(),
                paymentMethod: 'online',
                initialPaid: true,
                paymentDetails: {
                  transactionId,
                  method: 'EVC Plus',
                  amount: registration.amount
                }
              },
              registeredBy: 'self',
              session
            }, {
              actorId: 'system',
              actorRole: 'system'
            });
            
            // Create admin user
            const userData = await UserService.createUser({
              fullName,
              email,
              phone,
              password,
              role: 'admin',
              shopId: shop.shopId,
              status: 'inactive', // Need email verification
              verified: false,
              emailVerified: false,
              verificationCode,
              verificationCodeExpires: calculateExpiry(24),
              session
            }, {
              createdBy: 'self',
              actorId: 'system',
              actorRole: 'system'
            });
            
            // Store user and shop IDs in registration record
            registration.userId = userData.userId;
            registration.shopId = shop.shopId;
            
            // Create audit log
            await LogHelper.createAuthLog('register_with_payment', {
              actorId: 'system',
              actorRole: 'system',
              targetId: userData.userId,
              shopId: shop.shopId,
              details: { 
                registeredBy: 'self', 
                paymentMethod: 'EVC Plus',
                transactionId
              }
            });
            
            // Send verification email
            await EmailService.auth.sendVerificationEmail({ email, fullName }, verificationCode);
            
            // Commit transaction
            await session.commitTransaction();
            logSuccess(`Registration completed after payment: ${invoiceId}`, 'RegistrationPaymentController');
          } catch (error) {
            // If there's an error, abort the transaction
            await session.abortTransaction();
            throw error;
          } finally {
            // End session
            session.endSession();
          }
        } catch (error) {
          // If registration completion fails, log error but still acknowledge callback
          logError(`Failed to complete registration after payment: ${error.message}`, 'RegistrationPaymentController', error);
          registration.paymentStatus = 'completed_with_errors';
          registration.registrationError = error.message;
        }
      } else {
        // Payment failed
        registration.paymentStatus = 'failed';
        registration.paymentError = resultDesc || 'Payment failed';
        logWarning(`Payment failed for registration: ${invoiceId}`, 'RegistrationPaymentController');
      }
      
      // Save registration changes
      await registration.save();
      
      // Always return success to the payment provider
      return res.status(200).json({
        success: true,
        message: 'Callback processed'
      });
    } catch (error) {
      logError('Failed to process EVC callback', 'RegistrationPaymentController', error);
      
      // Always return success to payment provider even if we have errors
      return res.status(200).json({
        success: true,
        message: 'Callback received'
      });
    }
  }
};

module.exports = RegistrationPaymentController;
