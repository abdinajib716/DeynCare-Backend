const BaseEmailService = require('./baseEmailService');
const { logInfo, logError } = require('../../utils/logger');
const AppError = require('../../utils/core/AppError');

/**
 * Email service for sending authentication-related emails
 */
class AuthEmailService extends BaseEmailService {
  /**
   * Send verification email
   * @param {Object} user - User object containing email and fullName
   * @param {string} verificationCode - Verification code
   * @returns {Promise<boolean>} - Success status
   */
  async sendVerificationEmail(user, verificationCode) {
    try {
      const to = user.email;
      const subject = 'Verify Your DeynCare Account';
      const data = {
        fullName: user.fullName,
        verificationCode: verificationCode,
        expiryTime: '24 hours'
      };
      
      const html = this.renderTemplate('Auth/verification', data);
      return this.sendMail(to, subject, html);
    } catch (error) {
      logError(`Failed to send verification email to ${user?.email}`, 'AuthEmailService', error);
      throw new AppError('Failed to send verification email', 500, 'email_error');
    }
  }

  /**
   * Send password reset email
   * @param {Object} user - User object containing email and fullName
   * @param {string} resetToken - Password reset token
   * @returns {Promise<boolean>} - Success status
   */
  async sendPasswordResetEmail(user, resetToken) {
    try {
      const to = user.email;
      const subject = 'Reset Your DeynCare Password';
      
      // Create reset link with token as query parameter
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
      
      const data = {
        fullName: user.fullName,
        resetToken: resetToken,
        resetLink: resetLink,
        expiryTime: '1 hour'
      };
      
      const html = this.renderTemplate('Auth/password-reset', data);
      return this.sendMail(to, subject, html);
    } catch (error) {
      logError(`Failed to send password reset email to ${user?.email}`, 'AuthEmailService', error);
      throw new AppError('Failed to send password reset email', 500, 'email_error');
    }
  }

  /**
   * Send welcome email after registration
   * @param {Object} user - User object containing email and fullName
   * @param {Object} shop - Shop object if applicable
   * @returns {Promise<boolean>} - Success status
   */
  async sendWelcomeEmail(user, shop = null) {
    try {
      const to = user.email;
      const subject = 'Welcome to DeynCare';
      const data = {
        fullName: user.fullName,
        shopName: shop ? shop.shopName : 'N/A',
        shopId: shop ? shop.shopId : 'N/A',
        planType: shop && shop.subscription ? shop.subscription.planType : 'trial',
        shopStatus: shop ? shop.status : 'N/A',
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`,
        isShopOwner: !!shop
      };
      
      // Use template or fallback to the welcome.html at the root
      const templateKey = this.templates['Auth/welcome'] ? 'Auth/welcome' : 'welcome';
      const html = this.renderTemplate(templateKey, data);
      return this.sendMail(to, subject, html);
    } catch (error) {
      logError(`Failed to send welcome email to ${user?.email}`, 'AuthEmailService', error);
      throw new AppError('Failed to send welcome email', 500, 'email_error');
    }
  }

  /**
   * Send password changed notification email
   * @param {Object} user - User object containing email and fullName
   * @param {Object} deviceInfo - Information about the device used for the change
   * @returns {Promise<boolean>} - Success status
   */
  async sendPasswordChangedEmail(user, deviceInfo = {}) {
    try {
      const { email, fullName } = user;
      
      // Format date/time for display
      const changeTime = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Get base URL for links
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      // Prepare template data
      const templateData = {
        fullName: fullName || 'Valued Customer',
        changeTime,
        deviceInfo: deviceInfo.name || 'Unknown Device',
        location: deviceInfo.location || 'Unknown Location',
        loginUrl: `${baseUrl}/login`,
        resetUrl: `${baseUrl}/reset-password`,
        supportUrl: `${baseUrl}/support`
      };

      // Render the template
      const html = this.renderTemplate('Auth/password-changed', templateData);
      
      // Send the email
      return await this.sendMail(
        email,
        'Your DeynCare Password Has Been Changed',
        html
      );
    } catch (error) {
      logError(`Failed to send password changed email to ${user?.email}`, 'AuthEmailService', error);
      throw new AppError('Failed to send password changed notification', 500, 'email_error');
    }
  }
}

module.exports = new AuthEmailService();
