/**
 * Payment Controller
 * Handles HTTP requests related to payments
 */
const { 
  AppError, 
  logInfo, 
  logError, 
  logSuccess,
  idGenerator
} = require('../utils');

const PaymentService = require('../services/paymentService');
const EmailService = require('../services/emailService');
const EVCPaymentService = require('../services/evcPaymentService');

/**
 * PaymentController provides methods for handling payment-related requests
 */
const PaymentController = {
  /**
   * Create a new payment
   * POST /api/payments
   */
  createPayment: async (req, res, next) => {
    try {
      const { shopId, customerId, customerName, paymentContext, debtId, subscriptionId, posOrderId, amount, method, referenceNumber, notes } = req.body;
      
      // Generate unique payment ID
      const paymentId = await idGenerator.generatePaymentId();
      
      // Create payment through service
      const payment = await PaymentService.createPayment({
        paymentId,
        shopId,
        customerId,
        customerName,
        paymentContext,
        debtId,
        subscriptionId,
        posOrderId,
        amount,
        method,
        referenceNumber,
        notes,
        recordedBy: req.user.userId,
        recordedFromIp: req.ip
      });
      
      logSuccess(`Payment created: ${payment.paymentId} for ${payment.paymentContext}`, 'PaymentController');
      
      return res.status(201).json({
        success: true,
        message: 'Payment created successfully',
        data: payment
      });
    } catch (error) {
      logError('Failed to create payment', 'PaymentController', error);
      return next(error);
    }
  },
  
  /**
   * Get payments by shop
   * GET /api/payments/shop/:shopId
   */
  getPaymentsByShop: async (req, res, next) => {
    try {
      const { shopId } = req.params;
      const { context, status, startDate, endDate, page = 1, limit = 10 } = req.query;
      
      // Parse dates if provided
      const parsedStartDate = startDate ? new Date(startDate) : null;
      const parsedEndDate = endDate ? new Date(endDate) : null;
      
      // Get payments
      const result = await PaymentService.getPaymentsByShop(
        shopId, 
        { 
          context: context, 
          status, 
          startDate: parsedStartDate, 
          endDate: parsedEndDate 
        },
        { page: parseInt(page), limit: parseInt(limit) }
      );
      
      return res.status(200).json({
        success: true,
        message: 'Payments retrieved successfully',
        data: {
          payments: result.payments,
          pagination: result.pagination
        }
      });
    } catch (error) {
      logError(`Failed to get payments for shop: ${req.params.shopId}`, 'PaymentController', error);
      return next(error);
    }
  },
  
  /**
   * Get payment by ID
   * GET /api/payments/:paymentId
   */
  getPaymentById: async (req, res, next) => {
    try {
      const { paymentId } = req.params;
      
      const payment = await PaymentService.getPaymentById(paymentId);
      
      return res.status(200).json({
        success: true,
        message: 'Payment retrieved successfully',
        data: payment
      });
    } catch (error) {
      logError(`Failed to get payment: ${req.params.paymentId}`, 'PaymentController', error);
      return next(error);
    }
  },
  
  /**
   * Confirm payment
   * POST /api/payments/:paymentId/confirm
   */
  confirmPayment: async (req, res, next) => {
    try {
      const { paymentId } = req.params;
      const userId = req.user.userId;
      
      const payment = await PaymentService.confirmPayment(paymentId, userId);
      
      // If payment is for a subscription, ensure email notification
      if (payment.paymentContext === 'subscription' && payment.subscriptionId) {
        // This would typically be handled by a queue/job in production
        try {
          await PaymentService.sendPaymentConfirmationEmail(payment);
        } catch (emailError) {
          logError(`Failed to send payment confirmation email: ${emailError.message}`, 'PaymentController', emailError);
          // Don't fail the request if email fails
        }
      }
      
      return res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        data: payment
      });
    } catch (error) {
      logError(`Failed to confirm payment: ${req.params.paymentId}`, 'PaymentController', error);
      return next(error);
    }
  },
  
  /**
   * Record payment refund
   * POST /api/payments/:paymentId/refund
   */
  refundPayment: async (req, res, next) => {
    try {
      const { paymentId } = req.params;
      const { amount, reason } = req.body;
      const userId = req.user.userId;
      
      const payment = await PaymentService.refundPayment(paymentId, {
        amount: parseFloat(amount),
        reason,
        processedBy: userId
      });
      
      return res.status(200).json({
        success: true,
        message: 'Payment refunded successfully',
        data: payment
      });
    } catch (error) {
      logError(`Failed to refund payment: ${req.params.paymentId}`, 'PaymentController', error);
      return next(error);
    }
  },
  
  /**
   * Get payment stats by date range
   * GET /api/payments/shop/:shopId/stats
   */
  getPaymentStats: async (req, res, next) => {
    try {
      const { shopId } = req.params;
      const { startDate, endDate } = req.query;
      
      // Validate dates
      if (!startDate || !endDate) {
        throw new AppError('Start and end dates are required', 400, 'missing_parameters');
      }
      
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);
      
      // Get stats
      const stats = await PaymentService.getPaymentStatsByDateRange(
        shopId,
        parsedStartDate,
        parsedEndDate
      );
      
      return res.status(200).json({
        success: true,
        message: 'Payment statistics retrieved successfully',
        data: {
          stats,
          summary: {
            totalPayments: stats.reduce((sum, day) => sum + day.count, 0),
            totalAmount: stats.reduce((sum, day) => sum + day.totalAmount, 0)
          }
        }
      });
    } catch (error) {
      logError(`Failed to get payment stats for shop: ${req.params.shopId}`, 'PaymentController', error);
      return next(error);
    }
  },
  
  /**
   * Add verification attempt to payment
   * POST /api/payments/:paymentId/verify
   */
  addVerificationAttempt: async (req, res, next) => {
    try {
      const { paymentId } = req.params;
      const { status, notes } = req.body;
      const userId = req.user.userId;
      
      const payment = await PaymentService.addVerificationAttempt(paymentId, {
        attemptedBy: userId,
        status,
        notes
      });
      
      return res.status(200).json({
        success: true,
        message: 'Verification attempt recorded successfully',
        data: payment
      });
    } catch (error) {
      logError(`Failed to add verification attempt: ${req.params.paymentId}`, 'PaymentController', error);
      return next(error);
    }
  },
  
  /**
   * Get unconfirmed payments
   * GET /api/payments/unconfirmed
   */
  getUnconfirmedPayments: async (req, res, next) => {
    try {
      const { shopId } = req.query;
      const { hours, limit } = req.query;
      
      // Ensure shopId is provided
      if (!shopId) {
        throw new AppError('Shop ID is required', 400, 'missing_shop_id');
      }
      
      const options = {};
      if (hours) options.olderThan = parseInt(hours);
      if (limit) options.limit = parseInt(limit);
      
      const unconfirmedPayments = await PaymentService.getUnconfirmedPayments(shopId, options);
      
      return res.status(200).json({
        success: true,
        message: 'Unconfirmed payments retrieved successfully',
        data: unconfirmedPayments
      });
    } catch (error) {
      logError('Failed to get unconfirmed payments', 'PaymentController', error);
      return next(error);
    }
  },
  
  /**
   * Process payment using EVC Plus
   * POST /api/payments/evc
   */
  payWithEvc: async (req, res, next) => {
    try {
      const { 
        shopId, 
        customerId, 
        customerName, 
        phone, 
        amount, 
        paymentContext, 
        debtId, 
        subscriptionId, 
        posOrderId, 
        notes 
      } = req.body;
      
      // Verify required fields
      if (!phone) {
        throw new AppError('Phone number is required', 400, 'missing_phone');
      }
      
      if (!amount || amount <= 0) {
        throw new AppError('Valid amount is required', 400, 'invalid_amount');
      }
      
      // Generate unique payment ID
      const paymentId = await idGenerator.generatePaymentId();
      
      // Create a pending payment first
      const pendingPayment = await PaymentService.createPayment({
        paymentId,
        shopId,
        customerId,
        customerName,
        paymentContext,
        debtId,
        subscriptionId,
        posOrderId,
        amount,
        method: 'EVC Plus',
        notes,
        status: 'pending',
        recordedBy: req.user.userId,
        recordedFromIp: req.ip,
        integrationStatus: 'requested'
      });
      
      logInfo(`Created pending EVC Plus payment: ${paymentId}`, 'PaymentController');
      
      // Get shop name for better payment description
      let shopName = 'DeynCare';
      try {
        const shop = await Shop.findOne({ shopId });
        if (shop) {
          shopName = shop.name;
        }
      } catch (error) {
        // Non-critical error, continue with default shop name
        logInfo(`Unable to fetch shop details for payment description: ${error.message}`, 'PaymentController');
      }
      
      // Process payment through EVC Plus
      const paymentResult = await EVCPaymentService.payByWaafiPay({
        phone,
        amount,
        description: `Payment for ${shopName} - ${paymentContext === 'debt' ? 'Debt' : paymentContext === 'subscription' ? 'Subscription' : 'POS Order'}`,
        reference: paymentId,
        shopName
      });
      
      // Update payment with gateway info
      pendingPayment.gatewayInfo = {
        gatewayName: 'WaafiPay',
        transactionId: paymentResult.transactionId || null,
        responseCode: paymentResult.responseCode,
        responseMessage: paymentResult.responseMessage,
        gatewayFee: 0 // Can be updated if fee info is available
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
      
      // If payment succeeded, mark as confirmed
      if (paymentResult.success) {
        pendingPayment.status = 'confirmed';
        pendingPayment.isConfirmed = true;
        pendingPayment.confirmedAt = new Date();
        pendingPayment.confirmedBy = req.user.userId;
        
        logSuccess(`EVC Plus payment successful: ${paymentId}`, 'PaymentController');
        
        // If it's a subscription payment, update the subscription
        if (paymentContext === 'subscription' && subscriptionId) {
          try {
            await PaymentService.notifySubscriptionOfSuccessfulPayment(subscriptionId, {
              transactionId: paymentResult.transactionId,
              method: 'EVC Plus',
              amount,
              performedBy: req.user.userId
            });
          } catch (subscriptionError) {
            // Log but don't fail the request if subscription update fails
            logError(`Failed to update subscription after payment: ${subscriptionError.message}`, 'PaymentController', subscriptionError);
          }
        }
      } else {
        pendingPayment.status = 'failed';
        logError(`EVC Plus payment failed: ${paymentResult.responseMessage}`, 'PaymentController');
      }
      
      // Save updated payment
      await pendingPayment.save();
      
      // Return appropriate response
      if (paymentResult.success) {
        return res.status(200).json({
          success: true,
          message: 'Payment processed successfully',
          data: {
            paymentId: pendingPayment.paymentId,
            status: pendingPayment.status,
            transactionId: paymentResult.transactionId,
            amount: pendingPayment.amount
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          message: `Payment failed: ${paymentResult.responseMessage}`,
          errorCode: 'payment_failed',
          data: {
            paymentId: pendingPayment.paymentId,
            status: pendingPayment.status,
            responseCode: paymentResult.responseCode
          }
        });
      }
    } catch (error) {
      logError('Failed to process EVC Plus payment', 'PaymentController', error);
      return next(error);
    }
  }
};

module.exports = PaymentController;
