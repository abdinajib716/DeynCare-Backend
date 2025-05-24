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
    // Create a log prefix for easier debugging
    const logPrefix = `[NotificationService:${status}:${user.email}]`;
    try {
      // Detailed logging of user object
      console.log(`${logPrefix} Full user data:`, JSON.stringify({
        id: user._id || user.userId,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        isSuspended: user.isSuspended,
        newStatus: status
      }));
      
      logInfo(`${logPrefix} Processing status change notification to ${status}`, 'NotificationService');
      
      if (status === 'suspended') {
        // Handle suspension email
        logInfo(`Sending suspension notification to ${user.email}`, 'NotificationService');
        await EmailService.admin.sendAccountSuspensionEmail(user.email, {
          name: user.fullName,
          reason: reason,
          contactEmail: 'support@deyncare.com'
        });
        logInfo(`Suspension notification email sent to ${user.email}`, 'NotificationService');
      } else if (status === 'active') {
        // IMPORTANT: For testing purposes, always send reactivation email when status is being
        // changed to 'active', regardless of previous status
        logInfo(`${logPrefix} Always sending reactivation notification for testing`, 'NotificationService');
        
        try {
          // Call the reactivation email method directly
          await EmailService.admin.sendAccountReactivationEmail(user.email, {
            name: user.fullName || 'User',
            contactEmail: 'support@deyncare.com'
          });
          logInfo(`${logPrefix} Reactivation email successfully sent`, 'NotificationService');
        } catch (emailError) {
          // Log detailed error but don't throw - this is non-blocking
          console.error(`${logPrefix} DETAILED EMAIL ERROR:`, emailError);
          logError(`${logPrefix} Failed to send reactivation email: ${emailError.message}`, 'NotificationService');
        }
      }
      return true;
    } catch (error) {
      logError(`Failed to send status change email to ${user.email}: ${error.message}`, 'NotificationService', error);
      return false; // Non-blocking failure
    }
  }
};

module.exports = NotificationService;
