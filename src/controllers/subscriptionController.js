/**
 * Subscription Controller
 * Handles HTTP requests related to subscription management
 */
const SubscriptionService = require('../services/subscriptionService');
const ShopService = require('../services/shopService');
const EmailService = require('../services/emailService');
const EVCPaymentService = require('../services/evcPaymentService');
const PaymentService = require('../services/paymentService');
const FileUploadService = require('../services/fileUploadService');

// Import utility modules
const { 
  AppError, 
  ErrorResponse,
  ResponseHelper,
  logInfo,
  logSuccess,
  logWarning,
  logError,
  idGenerator
} = require('../utils');

/**
 * SubscriptionController handles subscription management HTTP requests
 */
const SubscriptionController = {
  /**
   * Get subscription for the current shop
   * GET /api/subscriptions/current
   */
  getCurrentSubscription: async (req, res, next) => {
    try {
      const { shopId } = req.user;
      
      if (!shopId) {
        return next(new AppError('Shop association required', 400, 'shop_required'));
      }
      
      // Get active subscription using the service
      const subscription = await SubscriptionService.getActiveSubscription(shopId);
      
      // Format response data
      const responseData = {
        subscription: {
          subscriptionId: subscription.subscriptionId,
          plan: subscription.plan,
          status: subscription.status,
          displayStatus: subscription.displayStatus,
          pricing: {
            basePrice: subscription.pricing.basePrice,
            totalPrice: subscription.totalPrice,
            currency: subscription.pricing.currency,
            billingCycle: subscription.pricing.billingCycle
          },
          dates: {
            startDate: subscription.dates.startDate,
            endDate: subscription.dates.endDate,
            trialEndsAt: subscription.dates.trialEndsAt
          },
          daysRemaining: subscription.daysRemaining,
          percentageUsed: subscription.percentageUsed,
          renewalSettings: subscription.renewalSettings
        }
      };
      
      return res.status(200).json({
        success: true,
        message: 'Current subscription retrieved successfully',
        data: responseData
      });
    } catch (error) {
      // Special handling for "no active subscription" error
      if (error.code === 'no_active_subscription') {
        return res.status(200).json({
          success: true,
          message: 'No active subscription found',
          data: { hasActiveSubscription: false }
        });
      }
      
      logError('Failed to get current subscription', 'SubscriptionController', error);
      return next(error);
    }
  },
  
  /**
   * Get subscription history for the current shop
   * GET /api/subscriptions/history
   */
  getSubscriptionHistory: async (req, res, next) => {
    try {
      const { shopId } = req.user;
      
      if (!shopId) {
        return next(new AppError('Shop association required', 400, 'shop_required'));
      }
      
      // Get subscription history using the service
      const subscriptions = await SubscriptionService.getSubscriptionHistory(shopId);
      
      // Format response data
      const formattedSubscriptions = subscriptions.map(subscription => ({
        subscriptionId: subscription.subscriptionId,
        planType: subscription.plan.type,
        status: subscription.status,
        dates: {
          startDate: subscription.dates.startDate,
          endDate: subscription.dates.endDate
        },
        payment: {
          method: subscription.payment.method,
          lastPaymentDate: subscription.payment.lastPaymentDate
        },
        history: subscription.history
      }));
      
      return res.status(200).json({
        success: true,
        message: 'Subscription history retrieved successfully',
        data: { subscriptions: formattedSubscriptions }
      });
    } catch (error) {
      logError('Failed to get subscription history', 'SubscriptionController', error);
      return next(error);
    }
  },
  
  /**
   * Create a new subscription
   * POST /api/subscriptions
   * Note: This endpoint is typically used by admins to manually create subscriptions
   */
  createSubscription: async (req, res, next) => {
    try {
      const { 
        shopId, 
        planType = 'trial',
        paymentMethod,
        paymentDetails
      } = req.validatedData || req.body;
      
      // Verify shop exists
      await ShopService.getShopById(shopId);
      
      // Current user (from auth middleware)
      const { userId, role } = req.user;
      
      // Create subscription using the service
      const subscription = await SubscriptionService.createSubscription({
        shopId,
        planType
      }, {
        actorId: userId,
        actorRole: role
      });
      
      // If payment information provided, record payment
      if (paymentMethod && planType !== 'trial') {
        await SubscriptionService.recordPayment(subscription.subscriptionId, {
          method: paymentMethod,
          ...paymentDetails
        }, {
          actorId: userId,
          actorRole: role
        });
      }
      
      // Get shop information for email
      const shop = await ShopService.getShopById(shopId);
      
      // Send notification email to shop owner
      await EmailService.subscription.sendSubscriptionCreatedEmail({
        email: shop.email,
        shopName: shop.shopName,
        planType,
        endDate: subscription.dates.endDate
      });
      
      return res.status(201).json({
        success: true,
        message: 'Subscription created successfully',
        data: { 
          subscriptionId: subscription.subscriptionId,
          planType: subscription.plan.type,
          status: subscription.status,
          endDate: subscription.dates.endDate
        }
      });
    } catch (error) {
      logError('Failed to create subscription', 'SubscriptionController', error);
      return next(error);
    }
  },
  
  /**
   * Upgrade from trial to paid plan
   * POST /api/subscriptions/upgrade
   */
  upgradeFromTrial: async (req, res, next) => {
    try {
      const { 
        planType, 
        paymentMethod,
        paymentDetails 
      } = req.validatedData || req.body;
      
      const { shopId, userId, role } = req.user;
      
      if (!shopId) {
        return next(new AppError('Shop association required', 400, 'shop_required'));
      }
      
      // Find active subscription
      const subscription = await SubscriptionService.getActiveSubscription(shopId);
      
      // Upgrade from trial
      const updatedSubscription = await SubscriptionService.upgradeFromTrial(
        subscription.subscriptionId,
        {
          planType,
          paymentMethod,
          paymentDetails
        },
        {
          actorId: userId,
          actorRole: role
        }
      );
      
      // Get shop information for email
      const shop = await ShopService.getShopById(shopId);
      
      // Send upgrade confirmation email
      await EmailService.subscription.sendSubscriptionUpgradedEmail({
        email: shop.email,
        shopName: shop.shopName,
        planType,
        endDate: updatedSubscription.dates.endDate,
        price: updatedSubscription.totalPrice,
        currency: updatedSubscription.pricing.currency
      });
      
      return res.status(200).json({
        success: true,
        message: 'Successfully upgraded from trial to paid plan',
        data: {
          subscriptionId: updatedSubscription.subscriptionId,
          planType: updatedSubscription.plan.type,
          status: updatedSubscription.status,
          endDate: updatedSubscription.dates.endDate,
          price: updatedSubscription.totalPrice
        }
      });
    } catch (error) {
      logError('Failed to upgrade from trial', 'SubscriptionController', error);
      return next(error);
    }
  },
  
  /**
   * Change subscription plan
   * POST /api/subscriptions/change-plan
   */
  changePlan: async (req, res, next) => {
    try {
      const { 
        newPlanType, 
        prorated = true
      } = req.validatedData || req.body;
      
      const { shopId, userId, role } = req.user;
      
      if (!shopId) {
        return next(new AppError('Shop association required', 400, 'shop_required'));
      }
      
      // Find active subscription
      const subscription = await SubscriptionService.getActiveSubscription(shopId);
      
      // Change plan
      const updatedSubscription = await SubscriptionService.changePlan(
        subscription.subscriptionId,
        {
          newPlanType,
          prorated
        },
        {
          actorId: userId,
          actorRole: role
        }
      );
      
      // Get shop information for email
      const shop = await ShopService.getShopById(shopId);
      
      // Send plan change confirmation email
      await EmailService.subscription.sendSubscriptionChangedEmail({
        email: shop.email,
        shopName: shop.shopName,
        previousPlan: subscription.plan.type,
        newPlan: newPlanType,
        endDate: updatedSubscription.dates.endDate,
        price: updatedSubscription.totalPrice,
        currency: updatedSubscription.pricing.currency
      });
      
      return res.status(200).json({
        success: true,
        message: 'Successfully changed subscription plan',
        data: {
          subscriptionId: updatedSubscription.subscriptionId,
          planType: updatedSubscription.plan.type,
          status: updatedSubscription.status,
          endDate: updatedSubscription.dates.endDate,
          price: updatedSubscription.totalPrice
        }
      });
    } catch (error) {
      logError('Failed to change subscription plan', 'SubscriptionController', error);
      return next(error);
    }
  },
  
  /**
   * Record payment for subscription
   * POST /api/subscriptions/payment
   */
  recordPayment: async (req, res, next) => {
    try {
      const { amount, transactionId, paymentMethod } = req.body;
      const { shopId, userId } = req.user;
      
      // Validate payment method
      if (paymentMethod !== 'offline' && paymentMethod !== 'evc_plus') {
        return next(new AppError('Invalid payment method', 400, 'invalid_payment_method'));
      }
      
      if (!shopId) {
        return next(new AppError('Shop association required', 400, 'shop_required'));
      }
      
      // Find active subscription
      const subscription = await SubscriptionService.getActiveSubscription(shopId);
      
      // Record payment
      const updatedSubscription = await SubscriptionService.recordPayment(
        subscription.subscriptionId,
        {
          transactionId,
          method: paymentMethod,
          amount,
          extend: true
        },
        {
          actorId: userId,
          actorRole: req.user.role
        }
      );
      
      // Get shop information for email
      const shop = await ShopService.getShopById(shopId);
      
      // Send payment confirmation email
      await EmailService.shop.sendPaymentConfirmationEmail({
        email: shop.email,
        shopName: shop.shopName,
        amount,
        transactionId,
        paymentMethod,
        endDate: updatedSubscription.dates.endDate
      });
      
      return res.status(200).json({
        success: true,
        message: 'Payment recorded successfully',
        data: {
          subscriptionId: updatedSubscription.subscriptionId,
          endDate: updatedSubscription.dates.endDate,
          paymentRecorded: true
        }
      });
    } catch (error) {
      logError('Failed to record payment', 'SubscriptionController', error);
      return next(error);
    }
  },
  
  /**
   * Cancel subscription
   * POST /api/subscriptions/cancel
   */
  cancelSubscription: async (req, res, next) => {
    try {
      const { subscriptionId } = req.params;
      const { userId, role } = req.user;
      const { immediateEffect = false } = req.body;

      // Verify and cancel the subscription
      const canceledSubscription = await SubscriptionService.cancelSubscription(
        subscriptionId,
        {
          actorId: userId,
          actorRole: role,
          immediateEffect
        }
      );

      if (!canceledSubscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found or already canceled',
        });
      }

      // Fetch user info to send email
      const shop = await Shop.findById(canceledSubscription.shopId).select('name owner');
      const user = await User.findById(shop.owner).select('email fullName');

      // Send cancellation email
      if (user && user.email) {
        await EmailService.subscription.sendSubscriptionCanceledEmail({
          email: user.email,
          shopName: shop.name,
          endDate: canceledSubscription.endDate,
          immediateEffect,
          planType: canceledSubscription.planType
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Subscription canceled successfully',
        data: {
          id: canceledSubscription._id,
          status: canceledSubscription.status,
          endDate: canceledSubscription.endDate,
          effectiveImmediately: immediateEffect
        }
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Update auto-renewal settings
   * PATCH /api/subscriptions/auto-renewal
   */
  updateAutoRenewal: async (req, res, next) => {
    try {
      const { subscriptionId } = req.params;
      const { userId, role } = req.user;
      const { autoRenew } = req.body;

      // Update auto-renewal setting
      const updatedSubscription = await SubscriptionService.updateAutoRenewal(
        subscriptionId,
        autoRenew,
        {
          actorId: userId,
          actorRole: role
        }
      );

      if (!updatedSubscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found or update failed',
        });
      }

      // Fetch user info to send email
      const shop = await Shop.findById(updatedSubscription.shopId).select('name owner');
      const user = await User.findById(shop.owner).select('email fullName');

      // Send auto-renewal update email
      if (user && user.email) {
        await EmailService.subscription.sendAutoRenewalUpdatedEmail({
          email: user.email,
          shopName: shop.name,
          autoRenew,
          endDate: updatedSubscription.endDate
        });
      }

      return res.status(200).json({
        success: true,
        message: `Auto-renewal ${autoRenew ? 'enabled' : 'disabled'} successfully`,
        data: {
          id: updatedSubscription._id,
          autoRenew: updatedSubscription.autoRenew
        }
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Renew a subscription
   * POST /api/subscriptions/renew
   */
  renewSubscription: async (req, res, next) => {
    try {
      const { subscriptionId } = req.params;
      const { userId, role } = req.user;
      const { paymentMethod, transactionId } = req.body;

      // Renew the subscription
      const renewedSubscription = await SubscriptionService.renewSubscription(
        subscriptionId,
        {
          paymentMethod,
          transactionId
        },
        {
          actorId: userId,
          actorRole: role
        }
      );

      if (!renewedSubscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found or renewal failed',
        });
      }

      // Fetch user info to send email
      const shop = await Shop.findById(renewedSubscription.shopId).select('name owner');
      const user = await User.findById(shop.owner).select('email fullName');

      // Get pricing information
      const price = renewedSubscription.planType === 'yearly' ? 96 : 10; // Default values

      // Send renewal confirmation email
      if (user && user.email) {
        await EmailService.subscription.sendSubscriptionRenewalEmail({
          email: user.email,
          shopName: shop.name,
          endDate: renewedSubscription.endDate,
          planType: renewedSubscription.planType,
          price,
          currency: 'USD',
          paymentMethod
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Subscription renewed successfully',
        data: {
          id: renewedSubscription._id,
          status: renewedSubscription.status,
          startDate: renewedSubscription.startDate,
          endDate: renewedSubscription.endDate,
          planType: renewedSubscription.planType
        }
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Extend a subscription (admin function)
   * POST /api/subscriptions/:subscriptionId/extend
   */
  extendSubscription: async (req, res, next) => {
    try {
      const { subscriptionId } = req.params;
      const { userId, role } = req.user;
      
      // Only allow admins to extend subscriptions
      if (role !== 'admin' && role !== 'superAdmin') {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to extend subscriptions',
        });
      }
      
      const { days, reason } = req.body;

      if (!days || days <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid extension days must be provided',
        });
      }

      // Extend the subscription
      const extendedSubscription = await SubscriptionService.extendSubscription(
        subscriptionId,
        days,
        {
          actorId: userId,
          actorRole: role,
          reason
        }
      );

      if (!extendedSubscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found or extension failed',
        });
      }

      // Fetch user info to send email
      const shop = await Shop.findById(extendedSubscription.shopId).select('name owner');
      const user = await User.findById(shop.owner).select('email fullName');

      // Send extension email
      if (user && user.email) {
        await EmailService.subscription.sendSubscriptionExtendedEmail({
          email: user.email,
          shopName: shop.name,
          days,
          endDate: extendedSubscription.endDate,
          reason
        });
      }

      return res.status(200).json({
        success: true,
        message: `Subscription extended by ${days} days successfully`,
        data: {
          id: extendedSubscription._id,
          status: extendedSubscription.status,
          endDate: extendedSubscription.endDate,
          extendedDays: days,
          reason
        }
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Get subscription details
   * GET /api/subscriptions/:subscriptionId
   * Note: This endpoint requires admin access as it can view any subscription
   */
  getSubscriptionById: async (req, res, next) => {
    try {
      const { subscriptionId } = req.params;
      
      // Get subscription by ID using the service
      const subscription = await SubscriptionService.getSubscriptionById(subscriptionId);
      
      // Format response data
      const responseData = {
        subscription: {
          subscriptionId: subscription.subscriptionId,
          shopId: subscription.shopId,
          plan: subscription.plan,
          status: subscription.status,
          displayStatus: subscription.displayStatus,
          pricing: subscription.pricing,
          payment: {
            method: subscription.payment.method,
            verified: subscription.payment.verified,
            lastPaymentDate: subscription.payment.lastPaymentDate,
            nextPaymentDate: subscription.payment.nextPaymentDate,
            failedPayments: subscription.payment.failedPayments
          },
          dates: subscription.dates,
          renewalSettings: subscription.renewalSettings,
          daysRemaining: subscription.daysRemaining,
          percentageUsed: subscription.percentageUsed,
          isActive: subscription.isActive(),
          history: subscription.history
        }
      };
      
      return res.status(200).json({
        success: true,
        message: 'Subscription details retrieved successfully',
        data: responseData
      });
    } catch (error) {
      logError(`Failed to get subscription: ${req.params.subscriptionId}`, 'SubscriptionController', error);
      return next(error);
    }
  },
  
  /**
   * Get all subscriptions (admin only)
   * GET /api/subscriptions
   */
  getAllSubscriptions: async (req, res, next) => {
    try {
      // Parse query parameters for filtering and pagination
      const { 
        status, 
        planType, 
        shopId,
        page = 1, 
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;
      
      // Prepare filter object
      const filter = {};
      
      if (status) filter.status = status;
      if (planType) filter.planType = planType;
      if (shopId) filter.shopId = shopId;
      
      // Prepare pagination options
      const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
        populate: {
          path: 'shopId',
          select: 'name owner email'
        }
      };
      
      // Get subscriptions with pagination
      const result = await SubscriptionService.getAllSubscriptions(filter, options);
      
      return res.status(200).json({
        success: true,
        message: 'Subscriptions retrieved successfully',
        data: {
          subscriptions: result.docs,
          pagination: {
            total: result.totalDocs,
            page: result.page,
            pages: result.totalPages,
            limit: result.limit,
            hasNext: result.hasNextPage,
            hasPrev: result.hasPrevPage
          }
        }
      });
    } catch (error) {
      logError('Failed to get all subscriptions', 'SubscriptionController', error);
      return next(error);
    }
  },
  
  /**
   * Pay for subscription using EVC Plus
   * POST /api/subscriptions/pay-evc
   */
  payWithEvc: async (req, res, next) => {
    try {
      const { 
        subscriptionId, 
        phone, 
        amount, 
        planType 
      } = req.body;
      
      // Validate required fields
      if (!subscriptionId) {
        throw new AppError('Subscription ID is required', 400, 'missing_subscription_id');
      }
      
      if (!phone) {
        throw new AppError('Phone number is required', 400, 'missing_phone');
      }
      
      if (!amount || amount <= 0) {
        throw new AppError('Valid amount is required', 400, 'invalid_amount');
      }
      
      // Get subscription details
      const subscription = await SubscriptionService.getSubscriptionById(subscriptionId);
      
      // Verify subscription status
      if (subscription.status !== 'pending' && subscription.status !== 'trial' && subscription.status !== 'expired') {
        throw new AppError('Subscription is not eligible for payment', 400, 'ineligible_subscription');
      }
      
      // Get shop details
      const shop = await ShopService.getShopById(subscription.shopId);
      if (!shop) {
        throw new AppError('Shop not found', 404, 'shop_not_found');
      }
      
      // Generate payment ID
      const paymentId = await idGenerator.generatePaymentId();
      
      // Create a pending payment record
      const pendingPayment = await PaymentService.createPayment({
        paymentId,
        shopId: subscription.shopId,
        customerId: shop.ownerId || req.user.userId,
        customerName: shop.owner?.fullName || shop.name,
        paymentContext: 'subscription',
        subscriptionId: subscription.subscriptionId,
        amount,
        method: 'evc_plus',
        notes: `Subscription ${planType || 'plan'} payment`,
        status: 'pending',
        recordedBy: req.user.userId,
        recordedFromIp: req.ip,
        integrationStatus: 'requested'
      });
      
      logInfo(`Created pending EVC Plus payment: ${paymentId} for subscription: ${subscriptionId}`, 'SubscriptionController');
      
      // Process payment through EVC Plus
      const paymentResult = await EVCPaymentService.payByWaafiPay({
        phone,
        amount,
        description: `Subscription payment for ${shop.name} - ${planType || 'Standard'} Plan`,
        reference: paymentId,
        shopName: shop.name
      });
      
      // Update payment with gateway info
      pendingPayment.gatewayInfo = {
        gatewayName: 'WaafiPay',
        transactionId: paymentResult.transactionId || null,
        responseCode: paymentResult.responseCode,
        responseMessage: paymentResult.responseMessage,
        gatewayFee: 0
      };
      
      // Add verification attempt
      pendingPayment.verificationAttempts.push({
        attemptedAt: new Date(),
        attemptedBy: req.user.userId,
        status: paymentResult.success ? 'successful' : 'failed',
        notes: paymentResult.responseMessage
      });
      
      // Update integration status
      pendingPayment.integrationStatus = paymentResult.success ? 'success' : 'failed';
      
      // If payment succeeded, mark as confirmed and update subscription
      if (paymentResult.success) {
        pendingPayment.status = 'confirmed';
        pendingPayment.isConfirmed = true;
        pendingPayment.confirmedAt = new Date();
        pendingPayment.confirmedBy = req.user.userId;
        
        logSuccess(`EVC Plus payment successful: ${paymentId} for subscription: ${subscriptionId}`, 'SubscriptionController');
        
        // Update subscription with payment
        let updatedSubscription;
        
        if (subscription.status === 'trial') {
          // If upgrading from trial, use the upgrade method
          updatedSubscription = await SubscriptionService.upgradeFromTrial(
            subscriptionId, 
            { 
              planType: planType || 'monthly',
              paymentMethod: 'evc_plus',
              transactionId: paymentResult.transactionId
            },
            {
              actorId: req.user.userId,
              actorRole: req.user.role
            }
          );
        } else {
          // For renewal or reactivation, record payment and extend
          updatedSubscription = await SubscriptionService.recordPayment(
            subscriptionId,
            {
              transactionId: paymentResult.transactionId,
              method: 'evc_plus',
              amount,
              extend: true
            },
            {
              actorId: req.user.userId,
              actorRole: req.user.role
            }
          );
        }
        
        // Send email notification
        try {
          await EmailService.shop.sendPaymentConfirmationEmail({
            email: shop.owner?.email || req.user.email,
            shopName: shop.name,
            amount,
            paymentDate: new Date(),
            method: 'evc_plus',
            referenceNumber: paymentResult.transactionId,
            planType: updatedSubscription.plan.type,
            endDate: updatedSubscription.dates.endDate
          });
        } catch (emailError) {
          // Log but don't fail the request if email fails
          logError(`Failed to send payment confirmation email: ${emailError.message}`, 'SubscriptionController', emailError);
        }
        
        return res.status(200).json({
          success: true,
          message: 'Subscription payment processed successfully',
          data: {
            paymentId: pendingPayment.paymentId,
            subscriptionId: updatedSubscription.subscriptionId,
            status: updatedSubscription.status,
            planType: updatedSubscription.plan.type,
            endDate: updatedSubscription.dates.endDate,
            transactionId: paymentResult.transactionId
          }
        });
      } else {
        // Payment failed
        pendingPayment.status = 'failed';
        logError(`EVC Plus payment failed: ${paymentResult.responseMessage}`, 'SubscriptionController');
        
        return res.status(400).json({
          success: false,
          message: `Payment failed: ${paymentResult.responseMessage}`,
          errorCode: 'payment_failed',
          data: {
            paymentId: pendingPayment.paymentId,
            subscriptionId,
            status: 'failed',
            responseCode: paymentResult.responseCode
          }
        });
      }
      
      // Save updated payment
      await pendingPayment.save();
    } catch (error) {
      logError('Failed to process EVC Plus subscription payment', 'SubscriptionController', error);
      return next(error);
    }
  },
  
  /**
   * Submit offline payment for subscription
   * POST /api/subscriptions/offline-payment
   */
  submitOfflinePayment: async (req, res, next) => {
    try {
      const { subscriptionId, amount, method, payerName, payerPhone, notes, planType } = req.body;
      const { userId, shopId } = req.user;
      
      // Validate method is Cash
      if (method !== 'Cash') {
        return next(new AppError('Only Cash payments are accepted for offline payments', 400));
      }
      
      // Validate required fields
      if (!subscriptionId) {
        throw new AppError('Subscription ID is required', 400, 'missing_subscription_id');
      }
      
      if (!amount || amount <= 0) {
        throw new AppError('Valid amount is required', 400, 'invalid_amount');
      }
      
      // Check if file was uploaded
      if (!req.file) {
        throw new AppError('Payment proof file is required', 400, 'missing_proof_file');
      }
      
      // Get subscription details
      const subscription = await SubscriptionService.getSubscriptionById(subscriptionId);
      
      // Verify subscription status
      if (subscription.status !== 'pending' && subscription.status !== 'trial' && subscription.status !== 'expired') {
        throw new AppError('Subscription is not eligible for payment', 400, 'ineligible_subscription');
      }
      
      // Get shop details
      const shop = await ShopService.getShopById(subscription.shopId);
      if (!shop) {
        throw new AppError('Shop not found', 404, 'shop_not_found');
      }
      
      // Upload payment proof
      const fileMetadata = await FileUploadService.savePaymentProof(
        req.file,
        subscription.shopId,
        'subscription'
      );
      
      // Generate payment ID
      const paymentId = await idGenerator.generatePaymentId();
      
      // Create a pending payment record
      const pendingPayment = await PaymentService.createPayment({
        paymentId,
        shopId: subscription.shopId,
        customerId: shop.ownerId || req.user.userId,
        customerName: payerName || shop.owner?.fullName || shop.name,
        paymentContext: 'subscription',
        subscriptionId: subscription.subscriptionId,
        amount,
        method: 'offline',
        notes: notes || `Offline ${method} payment for ${planType || 'subscription'} plan`,
        status: 'pending',
        isConfirmed: false,
        proofFileId: fileMetadata.fileId,
        recordedBy: req.user.userId,
        recordedFromIp: req.ip,
        integrationStatus: 'not_applicable'
      });
      
      logInfo(`Created pending offline payment: ${paymentId} for subscription: ${subscriptionId}`, 'SubscriptionController');
      
      // Update subscription payment status to pending
      let updatedSubscription;
      
      // For trial upgrades, use a different method
      if (subscription.status === 'trial') {
        updatedSubscription = await SubscriptionService.upgradeFromTrial(
          subscriptionId,
          {
            planType: planType || 'monthly',
            paymentMethod: 'offline',
            paymentStatus: 'pending',
            pendingPaymentId: paymentId
          },
          {
            actorId: req.user.userId,
            actorRole: req.user.role
          }
        );
      } else {
        // For renewals or reactivations
        updatedSubscription = await SubscriptionService.recordPendingPayment(
          subscriptionId,
          {
            transactionId: paymentId,
            method: 'offline',
            amount,
            paymentStatus: 'pending',
            proofFileId: fileMetadata.fileId
          },
          {
            actorId: req.user.userId
          }
        );
      }
      
      // Send notification to super admin
      try {
        await EmailService.shop.sendPaymentVerificationRequest({
          subscriptionId,
          shopName: shop.name,
          amount,
          paymentMethod: 'offline',
          payerName: payerName || shop.owner?.fullName || shop.name,
          paymentId,
          proofFileId: fileMetadata.fileId,
          notes: notes || ''
        });
      } catch (emailError) {
        // Log but don't fail the request if email fails
        logError(`Failed to send payment verification email: ${emailError.message}`, 'SubscriptionController', emailError);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Offline payment submitted successfully and pending verification',
        data: {
          paymentId: pendingPayment.paymentId,
          subscriptionId: subscription.subscriptionId,
          status: 'pending',
          fileId: fileMetadata.fileId
        }
      });
    } catch (error) {
      logError('Failed to process offline payment', 'SubscriptionController', error);
      return next(error);
    }
  },
  
  /**
   * Verify offline payment (Admin only)
   * POST /api/subscriptions/verify-payment/:paymentId
   */
  verifyOfflinePayment: async (req, res, next) => {
    try {
      const { paymentId } = req.params;
      const { status, notes } = req.body;
      
      // Validate status
      if (!status || !['approved', 'rejected'].includes(status)) {
        throw new AppError('Valid status (approved/rejected) is required', 400, 'invalid_status');
      }
      
      // Get payment details
      const payment = await PaymentService.getPaymentById(paymentId);
      
      if (!payment) {
        throw new AppError('Payment not found', 404, 'payment_not_found');
      }
      
      if (payment.paymentContext !== 'subscription') {
        throw new AppError('Not a subscription payment', 400, 'invalid_payment_context');
      }
      
      if (payment.isConfirmed) {
        throw new AppError('Payment is already verified', 400, 'payment_already_verified');
      }
      
      // Update payment based on verification decision
      if (status === 'approved') {
        // Mark payment as confirmed
        await payment.confirm(req.user.userId);
        
        // Update subscription
        const subscription = await SubscriptionService.getSubscriptionById(payment.subscriptionId);
        
        if (subscription.status === 'pending' || subscription.status === 'trial' || subscription.status === 'expired') {
          // Record confirmed payment and activate subscription
          await SubscriptionService.recordPayment(
            payment.subscriptionId,
            {
              transactionId: payment.paymentId,
              method: payment.method,
              amount: payment.amount,
              extend: true,
              notes: notes || 'Payment approved by admin'
            },
            {
              actorId: req.user.userId,
              actorRole: req.user.role
            }
          );
          
          logSuccess(`Approved offline payment ${paymentId} for subscription ${payment.subscriptionId}`, 'SubscriptionController');
        }
        
        // Send confirmation email to shop
        try {
          const shop = await ShopService.getShopById(payment.shopId);
          
          if (shop) {
            await EmailService.shop.sendPaymentConfirmationEmail({
              email: shop.owner?.email,
              shopName: shop.name,
              amount: payment.amount,
              paymentDate: new Date(),
              method: payment.method,
              referenceNumber: payment.paymentId,
              receiptNumber: payment.receiptNumber
            });
          }
        } catch (emailError) {
          // Log but don't fail the request if email fails
          logError(`Failed to send payment confirmation email: ${emailError.message}`, 'SubscriptionController', emailError);
        }
        
        return res.status(200).json({
          success: true,
          message: 'Payment approved and subscription activated',
          data: {
            paymentId,
            status: 'confirmed'
          }
        });
      } else {
        // If rejected, update payment status
        payment.status = 'failed';
        payment.verificationAttempts.push({
          attemptedAt: new Date(),
          attemptedBy: req.user.userId,
          status: 'failed',
          notes: notes || 'Payment rejected by admin'
        });
        
        await payment.save();
        
        logInfo(`Rejected offline payment ${paymentId} for subscription ${payment.subscriptionId}`, 'SubscriptionController');
        
        // Send rejection email to shop
        try {
          const shop = await ShopService.getShopById(payment.shopId);
          
          if (shop) {
            await EmailService.shop.sendPaymentRejectionEmail({
              email: shop.owner?.email,
              shopName: shop.name,
              amount: payment.amount,
              paymentDate: payment.paymentDate,
              method: payment.method,
              reason: notes || 'Payment verification failed',
              subscriptionId: payment.subscriptionId
            });
          }
        } catch (emailError) {
          // Log but don't fail the request if email fails
          logError(`Failed to send payment rejection email: ${emailError.message}`, 'SubscriptionController', emailError);
        }
        
        return res.status(200).json({
          success: true,
          message: 'Payment rejected',
          data: {
            paymentId,
            status: 'rejected'
          }
        });
      }
    } catch (error) {
      logError(`Failed to verify payment: ${error.message}`, 'SubscriptionController', error);
      return next(error);
    }
  },
  
  /**
   * Get payment proof file
   * GET /api/subscriptions/payment-proof/:fileId
   */
  getPaymentProofFile: async (req, res, next) => {
    try {
      const { fileId } = req.params;
      
      // Get file path
      const filePath = await FileUploadService.getFilePath(fileId);
      
      // Send file
      return res.sendFile(filePath);
    } catch (error) {
      logError(`Failed to get payment proof: ${error.message}`, 'SubscriptionController', error);
      return next(error);
    }
  }
};

module.exports = SubscriptionController;
