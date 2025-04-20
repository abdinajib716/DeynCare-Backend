/**
 * EVC Payment Service
 * Handles all interactions with the WaafiPay API for EVC Plus payments
 */
const evcPlus = require('evc-plus');
const { AppError, logError, logSuccess, logInfo } = require('../utils');

/**
 * EVC Payment Service provides methods for processing EVC Plus payments
 */
const EVCPaymentService = {
  /**
   * Format merchant phone number according to WaafiPay requirements
   * @param {string} phone - Phone number to format
   * @returns {string} Formatted phone number
   */
  formatMerchantPhone: (phone) => {
    return evcPlus.formatMerchantPhone(phone);
  },
  
  /**
   * Process a payment using WaafiPay/EVC Plus
   * @param {Object} paymentData - Payment details
   * @param {string} paymentData.phone - Customer phone number
   * @param {number} paymentData.amount - Payment amount
   * @param {string} paymentData.description - Payment description
   * @param {string} paymentData.reference - Internal reference (debtId, subscriptionId, etc.)
   * @param {string} paymentData.shopName - Shop name for transaction description
   * @returns {Promise<Object>} Payment response from WaafiPay
   */
  payByWaafiPay: async (paymentData) => {
    try {
      // Format phone number
      const formattedPhone = EVCPaymentService.formatMerchantPhone(paymentData.phone);
      
      // Get API credentials from environment
      const merchantUid = process.env.WAAFI_MERCHANT_UID;
      const apiUserId = process.env.WAAFI_API_USER_ID;
      const apiKey = process.env.WAAFI_API_KEY;
      
      if (!merchantUid || !apiUserId || !apiKey) {
        throw new AppError('WaafiPay API credentials not configured', 500, 'missing_api_credentials');
      }
      
      // Prepare request payload
      const payload = {
        phone: formattedPhone,
        amount: paymentData.amount,
        merchantUid: merchantUid,
        apiUserId: apiUserId,
        apiKey: apiKey,
        description: paymentData.description || `Payment for ${paymentData.shopName || 'DeynCare'}`,
        invoiceId: paymentData.reference,
        webhook: process.env.EVC_PAYMENT_WEBHOOK_URL || null
      };
      
      logInfo(`Processing EVC Plus payment for ${formattedPhone} of amount ${paymentData.amount}`, 'EVCPaymentService');
      
      // Call EVC Plus payment API
      const response = await evcPlus.payByWaafiPay(payload);
      
      if (!response || !response.responseCode) {
        throw new AppError('Invalid response from WaafiPay', 500, 'invalid_gateway_response');
      }
      
      // Check response code for success
      if (response.responseCode === '0') {
        logSuccess(`EVC Plus payment successful: ${response.transactionId}`, 'EVCPaymentService');
        return {
          success: true,
          transactionId: response.transactionId,
          responseCode: response.responseCode,
          responseMessage: response.responseMsg,
          paymentInfo: response
        };
      } else {
        // Payment failed at WaafiPay
        logError(`EVC Plus payment failed: ${response.responseMsg}`, 'EVCPaymentService', response);
        return {
          success: false,
          responseCode: response.responseCode,
          responseMessage: response.responseMsg,
          paymentInfo: response
        };
      }
    } catch (error) {
      // Handle connection or API errors
      logError(`EVC Plus payment processing error: ${error.message}`, 'EVCPaymentService', error);
      
      // Rethrow AppError instances or wrap other errors
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        `Payment processing failed: ${error.message}`, 
        502, 
        'evc_payment_error'
      );
    }
  },
  
  /**
   * Retry a failed EVC Plus payment with exponential backoff
   * @param {Object} paymentData - Payment details (same as payByWaafiPay)
   * @param {number} retries - Number of retry attempts (default: 2)
   * @param {number} delay - Initial delay in ms before first retry (default: 1000ms)
   * @returns {Promise<Object>} Payment response from WaafiPay
   */
  retryPayment: async (paymentData, retries = 2, delay = 1000) => {
    try {
      // First attempt
      return await EVCPaymentService.payByWaafiPay(paymentData);
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Log retry attempt
      logInfo(`Retrying EVC Plus payment, attempts remaining: ${retries}`, 'EVCPaymentService');
      
      // Retry with exponential backoff
      return EVCPaymentService.retryPayment(paymentData, retries - 1, delay * 2);
    }
  }
};

module.exports = EVCPaymentService;
