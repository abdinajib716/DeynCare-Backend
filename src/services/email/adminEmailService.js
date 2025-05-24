const BaseEmailService = require('./baseEmailService');
const { logInfo, logError } = require('../../utils/logger');
const AppError = require('../../utils/core/AppError');

/**
 * Email service for sending admin-related emails
 */
class AdminEmailService extends BaseEmailService {
  /**
   * Send account suspension notification email
   * @param {string} to - Recipient email
   * @param {Object} data - Email data containing name, reason, and contactEmail
   * @returns {Promise<boolean>} - Success status
   */
  async sendAccountSuspensionEmail(to, data) {
    try {
      // Required data validation
      if (!data.name) {
        logError('Missing name for suspension email', 'AdminEmailService');
        data.name = 'User';
      }

      if (!data.reason) {
        logError('Missing suspension reason for email', 'AdminEmailService');
        data.reason = 'Policy violation';
      }
      
      // Set defaults for any missing fields
      const templateData = {
        name: data.name,
        reason: data.reason,
        contactEmail: data.contactEmail || 'support@deyncare.com',
        suspensionDate: new Date().toLocaleDateString(),
        subject: 'Your Account Has Been Suspended'
      };
      
      // Render email template
      const html = this.renderTemplate('Admin/account-suspension', templateData);
      
      // Send the email
      return await this.sendMail(to, 'Your Account Has Been Suspended', html);
    } catch (error) {
      logError(`Failed to send account suspension email to ${to}`, 'AdminEmailService', error);
      throw new AppError('Failed to send suspension notification', 500, 'email_error');
    }
  }

  /**
   * Send account reactivation notification email
   * @param {string} to - Recipient email
   * @param {Object} data - Email data containing name and activation details
   * @returns {Promise<boolean>} - Success status
   */
  async sendAccountReactivationEmail(to, data) {
    try {
      // Set default template data
      const templateData = {
        name: data.name || 'User',
        activationDate: new Date().toLocaleDateString(),
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
        subject: 'Your Account Has Been Reactivated'
      };
      
      // Log template loading attempt for debugging
      console.log(`[AdminEmailService] Attempting to render reactivation email template for ${to}`);
      
      // Explicitly use the exact case that matches the filesystem
      const html = this.renderTemplate('Admin/account-reactivation', templateData);
      
      // Log if template was found and rendered
      if (html && html.length > 100) {
        console.log(`[AdminEmailService] Successfully rendered reactivation template (${html.length} chars)`);
      } else {
        console.log(`[AdminEmailService] Warning: Template rendered with only ${html?.length} chars`);
      }
      
      // Send email directly with explicit template rendering
      return await this.sendMail(to, 'Your Account Has Been Reactivated', html);
    } catch (error) {
      logError(`Failed to send account reactivation email to ${to}`, 'AdminEmailService', error);
      throw new AppError('Failed to send reactivation notification', 500, 'email_error');
    }
  }
}

module.exports = new AdminEmailService();
