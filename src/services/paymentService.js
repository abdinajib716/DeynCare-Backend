/**
 * Payment Service
 * Handles all business logic related to payments
 */
const { Payment, Shop, Subscription } = require('../models');
const EmailService = require('./emailService');
const { 
  AppError, 
  logInfo, 
  logError, 
  logSuccess,
  idGenerator
} = require('../utils');

/**
 * PaymentService provides methods for managing payments
 */
const PaymentService = {
  /**
   * Create a new payment
   * @param {Object} paymentData - Payment details
   * @returns {Promise<Object>} Created payment
   */
  createPayment: async (paymentData) => {
    try {
      // Validate payment context specific requirements
      if (paymentData.paymentContext === 'debt' && !paymentData.debtId) {
        throw new AppError('Debt ID is required for debt payments', 400, 'missing_debt_id');
      }
      
      if (paymentData.paymentContext === 'subscription' && !paymentData.subscriptionId) {
        throw new AppError('Subscription ID is required for subscription payments', 400, 'missing_subscription_id');
      }
      
      if (paymentData.paymentContext === 'pos' && !paymentData.posOrderId) {
        throw new AppError('POS Order ID is required for POS payments', 400, 'missing_pos_order_id');
      }
      
      // Create the payment
      const payment = new Payment(paymentData);
      
      // Save the payment
      const savedPayment = await payment.save();
      
      logSuccess(`Created payment: ${savedPayment.paymentId} for ${savedPayment.paymentContext}`, 'PaymentService');
      return savedPayment;
    } catch (error) {
      logError('Failed to create payment', 'PaymentService', error);
      
      // If it's a MongoDB duplicate key error, make it more user-friendly
      if (error.code === 11000) {
        throw new AppError('Payment ID already exists', 400, 'duplicate_payment_id');
      }
      
      // Re-throw AppError as is, wrap others
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to create payment', 500, 'payment_creation_error');
    }
  },
  
  /**
   * Get payments by shop with filtering and pagination
   * @param {string} shopId - Shop ID
   * @param {Object} filter - Filter criteria
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Paginated payments
   */
  getPaymentsByShop: async (shopId, filter = {}, options = {}) => {
    try {
      // Default options
      const defaultOptions = {
        page: 1,
        limit: 10,
        sort: { paymentDate: -1 }
      };
      
      // Merge with provided options
      const mergedOptions = { ...defaultOptions, ...options };
      
      // Build filter query
      const query = { 
        shopId,
        isDeleted: false
      };
      
      // Add payment context filter if provided
      if (filter.context) {
        query.paymentContext = filter.context;
      }
      
      // Add status filter if provided
      if (filter.status) {
        query.status = filter.status;
      }
      
      // Add date range filter if provided
      if (filter.startDate || filter.endDate) {
        query.paymentDate = {};
        
        if (filter.startDate) {
          query.paymentDate.$gte = filter.startDate;
        }
        
        if (filter.endDate) {
          query.paymentDate.$lte = filter.endDate;
        }
      }
      
      // Get total count for pagination
      const totalCount = await Payment.countDocuments(query);
      
      // Calculate pagination values
      const totalPages = Math.ceil(totalCount / mergedOptions.limit);
      const skip = (mergedOptions.page - 1) * mergedOptions.limit;
      
      // Get payments with pagination
      const payments = await Payment.find(query)
        .sort(mergedOptions.sort)
        .skip(skip)
        .limit(mergedOptions.limit);
      
      logInfo(`Retrieved ${payments.length} payments for shop ${shopId}`, 'PaymentService');
      
      // Return payments with pagination info
      return {
        payments,
        pagination: {
          total: totalCount,
          page: mergedOptions.page,
          limit: mergedOptions.limit,
          pages: totalPages
        }
      };
    } catch (error) {
      logError(`Failed to get payments for shop: ${shopId}`, 'PaymentService', error);
      throw new AppError('Failed to retrieve payments', 500, 'payment_retrieval_error');
    }
  },
  
  /**
   * Get payment by ID
   * @param {string} paymentId - Payment ID
   * @returns {Promise<Object>} Payment object
   */
  getPaymentById: async (paymentId) => {
    try {
      const payment = await Payment.findOne({ paymentId, isDeleted: false });
      
      if (!payment) {
        throw new AppError('Payment not found', 404, 'payment_not_found');
      }
      
      return payment;
    } catch (error) {
      logError(`Failed to get payment: ${paymentId}`, 'PaymentService', error);
      
      // Re-throw AppError as is, wrap others
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to retrieve payment', 500, 'payment_retrieval_error');
    }
  },
  
  /**
   * Confirm a payment
   * @param {string} paymentId - Payment ID
   * @param {string} userId - User ID confirming the payment
   * @returns {Promise<Object>} Updated payment
   */
  confirmPayment: async (paymentId, userId) => {
    try {
      const payment = await PaymentService.getPaymentById(paymentId);
      
      // Check if already confirmed
      if (payment.isConfirmed) {
        throw new AppError('Payment is already confirmed', 400, 'payment_already_confirmed');
      }
      
      // Call the payment model method to confirm
      const confirmedPayment = await payment.confirm(userId);
      
      // Handle payment context specific logic
      if (payment.paymentContext === 'subscription' && payment.subscriptionId) {
        // You could update subscription status here or through an event system
        logInfo(`Confirmed payment ${paymentId} for subscription ${payment.subscriptionId}`, 'PaymentService');
      }
      
      logSuccess(`Payment ${paymentId} confirmed by ${userId}`, 'PaymentService');
      return confirmedPayment;
    } catch (error) {
      logError(`Failed to confirm payment: ${paymentId}`, 'PaymentService', error);
      
      // Re-throw AppError as is, wrap others
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to confirm payment', 500, 'payment_confirmation_error');
    }
  },
  
  /**
   * Refund a payment
   * @param {string} paymentId - Payment ID
   * @param {Object} refundData - Refund details
   * @returns {Promise<Object>} Updated payment
   */
  refundPayment: async (paymentId, refundData) => {
    try {
      const payment = await PaymentService.getPaymentById(paymentId);
      
      // Check if payment can be refunded
      if (payment.status === 'refunded') {
        throw new AppError('Payment is already refunded', 400, 'payment_already_refunded');
      }
      
      if (payment.status !== 'confirmed') {
        throw new AppError('Only confirmed payments can be refunded', 400, 'payment_not_confirmed');
      }
      
      // Call the payment model method to record refund
      const refundedPayment = await payment.recordRefund(refundData);
      
      logSuccess(`Payment ${paymentId} refunded by ${refundData.processedBy}`, 'PaymentService');
      return refundedPayment;
    } catch (error) {
      logError(`Failed to refund payment: ${paymentId}`, 'PaymentService', error);
      
      // Re-throw AppError as is, wrap others
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to refund payment', 500, 'payment_refund_error');
    }
  },
  
  /**
   * Add verification attempt to a payment
   * @param {string} paymentId - Payment ID
   * @param {Object} attemptData - Verification attempt details
   * @returns {Promise<Object>} Updated payment
   */
  addVerificationAttempt: async (paymentId, attemptData) => {
    try {
      const payment = await PaymentService.getPaymentById(paymentId);
      
      // Call the payment model method to add verification attempt
      const updatedPayment = await payment.addVerificationAttempt(attemptData);
      
      logInfo(`Verification attempt added to payment ${paymentId} by ${attemptData.attemptedBy}`, 'PaymentService');
      return updatedPayment;
    } catch (error) {
      logError(`Failed to add verification attempt to payment: ${paymentId}`, 'PaymentService', error);
      
      // Re-throw AppError as is, wrap others
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to add verification attempt', 500, 'verification_attempt_error');
    }
  },
  
  /**
   * Get payment statistics by date range
   * @param {string} shopId - Shop ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Payment statistics
   */
  getPaymentStatsByDateRange: async (shopId, startDate, endDate) => {
    try {
      // Call the payment model static method to get stats
      const stats = await Payment.getPaymentStatsByDateRange(shopId, startDate, endDate);
      
      logInfo(`Retrieved payment stats for shop ${shopId} from ${startDate.toISOString()} to ${endDate.toISOString()}`, 'PaymentService');
      return stats;
    } catch (error) {
      logError(`Failed to get payment stats for shop: ${shopId}`, 'PaymentService', error);
      throw new AppError('Failed to retrieve payment statistics', 500, 'payment_stats_error');
    }
  },
  
  /**
   * Get unconfirmed payments
   * @param {string} shopId - Shop ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Unconfirmed payments
   */
  getUnconfirmedPayments: async (shopId, options = {}) => {
    try {
      // Call the payment model static method to get unconfirmed payments
      const unconfirmedPayments = await Payment.findUnconfirmedPayments(shopId, options);
      
      logInfo(`Retrieved ${unconfirmedPayments.length} unconfirmed payments for shop ${shopId}`, 'PaymentService');
      return unconfirmedPayments;
    } catch (error) {
      logError(`Failed to get unconfirmed payments for shop: ${shopId}`, 'PaymentService', error);
      throw new AppError('Failed to retrieve unconfirmed payments', 500, 'unconfirmed_payments_error');
    }
  },
  
  /**
   * Send payment confirmation email
   * @param {Object} payment - Payment object
   * @returns {Promise<boolean>} Success status
   */
  sendPaymentConfirmationEmail: async (payment) => {
    try {
      // Get shop details
      const shop = await Shop.findOne({ shopId: payment.shopId });
      if (!shop) {
        throw new AppError('Shop not found', 404, 'shop_not_found');
      }
      
      // Get subscription details if it's a subscription payment
      if (payment.paymentContext === 'subscription' && payment.subscriptionId) {
        const subscription = await Subscription.findOne({ subscriptionId: payment.subscriptionId });
        
        if (subscription) {
          // Send email with subscription details
          await EmailService.sendPaymentConfirmationEmail({
            email: shop.owner.email,
            shopName: shop.name,
            amount: payment.amount,
            paymentDate: payment.paymentDate,
            method: payment.method,
            referenceNumber: payment.referenceNumber,
            receiptNumber: payment.receiptNumber,
            planType: subscription.plan.type,
            endDate: subscription.dates.endDate
          });
          
          logSuccess(`Sent payment confirmation email for subscription ${payment.subscriptionId}`, 'PaymentService');
          return true;
        }
      }
      
      // For non-subscription payments or if subscription not found
      await EmailService.sendPaymentConfirmationEmail({
        email: shop.owner.email,
        shopName: shop.name,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        method: payment.method,
        referenceNumber: payment.referenceNumber,
        receiptNumber: payment.receiptNumber
      });
      
      logSuccess(`Sent payment confirmation email for ${payment.paymentId}`, 'PaymentService');
      return true;
    } catch (error) {
      logError(`Failed to send payment confirmation email: ${error.message}`, 'PaymentService', error);
      throw new AppError('Failed to send payment confirmation email', 500, 'email_sending_error');
    }
  }
};

module.exports = PaymentService;
