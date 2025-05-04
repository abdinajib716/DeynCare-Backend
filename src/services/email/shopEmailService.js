const BaseEmailService = require('./baseEmailService');
const { logInfo, logError } = require('../../utils/logger');
const AppError = require('../../utils/core/AppError');

/**
 * Email service for sending shop-related emails
 */
class ShopEmailService extends BaseEmailService {
  /**
   * Send shop activation email
   * @param {Object} user - Shop owner user object
   * @param {Object} shop - Activated shop object
   * @param {Object} subscription - Subscription details
   * @returns {Promise<boolean>} - Success status
   */
  async sendShopActivationEmail(user, shop, subscription) {
    try {
      const to = user.email;
      const subject = 'Your DeynCare Shop Has Been Activated';
      const data = {
        fullName: user.fullName,
        shopName: shop.name || shop.shopName,
        shopId: shop._id?.toString() || shop.shopId,
        planType: subscription?.planType || 'standard',
        billingCycle: subscription?.billingCycle || 'monthly',
        nextBillingDate: subscription?.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString() : 'N/A',
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`
      };
      
      const html = this.renderTemplate('Shop/shop-activation', data);
      return this.sendMail(to, subject, html);
    } catch (error) {
      logError(`Failed to send shop activation email to ${user?.email}`, 'ShopEmailService', error);
      throw new AppError('Failed to send shop activation email', 500, 'email_error');
    }
  }

  /**
   * Send payment confirmation email
   * @param {Object} data - Email data containing email, shopName, amount, paymentDate, method, referenceNumber, etc.
   * @returns {Promise<boolean>} - Success status
   */
  async sendPaymentConfirmationEmail(data) {
    try {
      const { 
        email, 
        shopName, 
        amount, 
        paymentDate, 
        method, 
        referenceNumber, 
        receiptNumber,
        planType,
        endDate
      } = data;
      
      // Format payment details
      const formattedPaymentDate = new Date(paymentDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const formattedEndDate = endDate ? new Date(endDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : null;
      
      // Prepare template data
      const templateData = {
        shopName,
        amount: typeof amount === 'number' ? amount.toFixed(2) : amount,
        currency: data.currency || 'USD',
        paymentDate: formattedPaymentDate,
        transactionId: referenceNumber || 'N/A',
        paymentMethod: method,
        planType: planType || 'Standard',
        endDate: formattedEndDate || 'N/A'
      };

      // Send the email
      return await this.sendEmail({
        to: email,
        subject: 'Payment Confirmation - DeynCare',
        template: 'Shop/payment-confirmation',
        data: templateData
      });
    } catch (error) {
      logError(`Failed to send payment confirmation email to ${data?.email}`, 'ShopEmailService', error);
      throw new AppError('Failed to send payment confirmation email', 500, 'email_error');
    }
  }
}

module.exports = new ShopEmailService();
