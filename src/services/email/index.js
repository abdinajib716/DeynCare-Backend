/**
 * Email Services Index - Main entry point for all email service functionality
 * 
 * This module exports specialized email services organized by functional category.
 * Each service extends the BaseEmailService and handles specific email types.
 */

const adminEmailService = require('./adminEmailService');
const authEmailService = require('./authEmailService');
const shopEmailService = require('./shopEmailService');
const subscriptionEmailService = require('./subscriptionEmailService');
const reportEmailService = require('./reportEmailService');
const BaseEmailService = require('./baseEmailService');

/**
 * EmailService aggregates all specialized email services
 * and provides a unified interface for sending emails.
 */
const EmailService = {
  // Base email functionality (used internally by specialized services)
  baseService: new BaseEmailService(),
  
  // Admin emails (account management, suspensions, etc.)
  admin: adminEmailService,
  
  // Authentication emails (verification, password reset, etc.)
  auth: authEmailService,
  
  // Shop emails (shop activation, payment confirmations, etc.)
  shop: shopEmailService,
  
  // Subscription emails (trial ending, renewal, cancellation, etc.)
  subscription: subscriptionEmailService,
  
  // Report emails (scheduled reports, exports, etc.)
  report: reportEmailService,
  
  /**
   * Verify connection to email server
   * @returns {Promise<boolean>} Connection status
   */
  verifyConnection: async () => {
    return await adminEmailService.verifyConnection();
  },
  
  /**
   * Send a general email with a custom template
   * @param {Object} options - Email options
   * @returns {Promise<boolean>} Success status
   */
  sendEmail: async (options) => {
    return await adminEmailService.sendEmail(options);
  },
  
  /**
   * Backward compatibility method for account suspension emails
   * @param {string} to - Recipient email
   * @param {Object} data - Suspension data
   * @returns {Promise<boolean>} Success status
   */
  sendAccountSuspensionEmail: async (to, data) => {
    return await adminEmailService.sendAccountSuspensionEmail(to, data);
  }
};

module.exports = EmailService;
