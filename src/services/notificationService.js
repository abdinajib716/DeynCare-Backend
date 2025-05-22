const EmailService = require('./emailService');
const { logInfo, logError } = require('../utils');

/**
 * Service for handling notification-related operations
 * Centralizes all notification logic in one place
 */
const NotificationService = {
  /**
   * Send user status change notification
   * Non-blocking operation that doesn't interrupt the main workflow
   * @param {Object} user - User object with email and fullName
   * @param {string} status - New status (active, inactive, suspended)
   * @param {string} reason - Reason for status change (required for suspension)
   * @returns {Promise<boolean>} Success status
   */
  sendStatusChangeNotification: async (user, status, reason) => {
    try {
      if (status === 'suspended') {
        await EmailService.admin.sendAccountSuspensionEmail(user.email, {
          name: user.fullName,
          reason: reason,
          contactEmail: 'support@deyncare.com'
        });
        logInfo(`Suspension notification email sent to ${user.email}`, 'NotificationService');
      } else if (status === 'active' && user.isSuspended) {
        await EmailService.admin.sendAccountReactivationEmail(user.email, {
          name: user.fullName,
          contactEmail: 'support@deyncare.com'
        });
        logInfo(`Reactivation notification email sent to ${user.email}`, 'NotificationService');
      }
      return true;
    } catch (error) {
      logError(`Failed to send status change email to ${user.email}: ${error.message}`, 'NotificationService', error);
      return false; // Non-blocking failure
    }
  }
};

module.exports = NotificationService;
