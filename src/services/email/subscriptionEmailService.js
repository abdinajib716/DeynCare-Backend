const BaseEmailService = require('./baseEmailService');
const { logInfo, logError, logSuccess } = require('../../utils/logger');
const AppError = require('../../utils/core/AppError');

/**
 * Email service for sending subscription-related emails
 */
class SubscriptionEmailService extends BaseEmailService {
  /**
   * Send trial ending reminder email
   * @param {Object} data - Email data containing email, shopName, trialEndsAt, daysLeft
   * @returns {Promise<boolean>} - Success status
   */
  async sendTrialEndingReminderEmail(data) {
    try {
      if (!this.initialized) {
        throw new AppError('Email service not initialized', 500, 'email_service_error');
      }

      const { email, shopName, trialEndsAt, daysLeft } = data;
      
      // Format date for display
      const formattedEndDate = new Date(trialEndsAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Prepare template data
      const templateData = {
        shopName,
        trialEndsAt: formattedEndDate,
        daysLeft,
        features: data.features || {},
        upgradeUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/subscription/upgrade`,
        upgradeMonthlyUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/subscription/upgrade?plan=monthly`,
        upgradeYearlyUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/subscription/upgrade?plan=yearly`
      };

      // Send the email using the general sendEmail method
      return await this.sendEmail({
        to: email,
        subject: `Your DeynCare trial ends in ${daysLeft} days - Upgrade now`,
        template: 'Subscription/trial-ending',
        data: templateData
      });
    } catch (error) {
      logError('Failed to send trial ending reminder email', 'SubscriptionEmailService', error);
      throw error;
    }
  }

  /**
   * Send subscription upgrade confirmation email
   * @param {Object} data - Email data containing email, shopName, planType, endDate, price, currency
   * @returns {Promise<boolean>} - Success status
   */
  async sendSubscriptionUpgradedEmail(data) {
    try {
      const { email, shopName, planType, endDate, price, currency } = data;
      
      // Format date for display
      const formattedEndDate = new Date(endDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Determine billing cycle based on plan type
      const billingCycle = planType === 'yearly' ? 'year' : 'month';
      
      // Prepare template data
      const templateData = {
        shopName,
        planType: planType.charAt(0).toUpperCase() + planType.slice(1), // Capitalize
        endDate: formattedEndDate,
        price,
        currency: currency || 'USD',
        billingCycle,
        paymentMethod: data.paymentMethod || 'Credit Card'
      };

      return await this.sendEmail({
        to: email,
        subject: 'Your DeynCare subscription has been upgraded',
        template: 'Subscription/subscription-upgraded',
        data: templateData
      });
    } catch (error) {
      logError('Failed to send subscription upgraded email', 'SubscriptionEmailService', error);
      throw error;
    }
  }

  /**
   * Send subscription canceled email
   * @param {Object} data - Email data containing email, shopName, endDate, immediateEffect
   * @returns {Promise<boolean>} - Success status
   */
  async sendSubscriptionCanceledEmail(data) {
    try {
      const { email, shopName, endDate, immediateEffect } = data;
      
      // Format date for display
      const formattedEndDate = new Date(endDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Prepare template data
      const templateData = {
        shopName,
        endDate: formattedEndDate,
        immediateEffect: immediateEffect === true,
        planType: data.planType || 'Standard'
      };

      return await this.sendEmail({
        to: email,
        subject: 'Your DeynCare subscription has been canceled',
        template: 'Subscription/subscription-canceled',
        data: templateData
      });
    } catch (error) {
      logError('Failed to send subscription canceled email', 'SubscriptionEmailService', error);
      throw error;
    }
  }

  /**
   * Send subscription expired email
   * @param {Object} data - Email data containing email, shopName, endDate, planType, gracePeriodDays
   * @returns {Promise<boolean>} - Success status
   */
  async sendSubscriptionExpiredEmail(data) {
    try {
      const { email, shopName, endDate, planType, gracePeriodDays } = data;
      
      // Format date for display
      const formattedEndDate = new Date(endDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Prepare template data
      const templateData = {
        shopName,
        endDate: formattedEndDate,
        planType: planType.charAt(0).toUpperCase() + planType.slice(1), // Capitalize
        gracePeriodDays: gracePeriodDays || 30
      };

      return await this.sendEmail({
        to: email,
        subject: 'Your DeynCare subscription has expired',
        template: 'Subscription/subscription-expired',
        data: templateData
      });
    } catch (error) {
      logError('Failed to send subscription expired email', 'SubscriptionEmailService', error);
      throw error;
    }
  }
}

module.exports = new SubscriptionEmailService();
