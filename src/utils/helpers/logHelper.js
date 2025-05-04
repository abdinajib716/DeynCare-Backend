const { Log } = require('../../models');
const { logError, logInfo } = require('../logger.js');

/**
 * Helper for centralized audit logging with consistent formatting and error handling
 */
const LogHelper = {
  /**
   * Create an audit log entry with error handling
   * @param {Object} logData - Log data configuration
   * @param {string} logData.action - The action being logged
   * @param {string} logData.actorId - ID of the acting user or system
   * @param {string} logData.targetId - ID of the target entity
   * @param {string} logData.role - Role of the actor
   * @param {string} logData.module - System module (auth, user, shop, etc.)
   * @param {string} logData.shopId - Shop ID (optional)
   * @param {Object} logData.details - Additional details (optional)
   * @returns {Promise<Object|null>} Created log or null if creation failed
   */
  async safeLog(logData) {
    try {
      // Default values for required fields
      const {
        action,
        actorId = 'system',
        targetId = '',
        role = 'system',
        module = 'app',
        shopId = null,
        details = {}
      } = logData;

      // Validate required fields
      if (!action) {
        logError(`Log creation failed: missing action`, 'LogHelper');
        return null;
      }

      // Create log entry
      const log = await Log.create({
        actorId,
        action,
        targetId,
        role,
        module,
        shopId,
        details
      });

      return log;
    } catch (error) {
      // Log error but don't throw - auditing should never block main operations
      logError(`Failed to create audit log: ${error.message}`, 'LogHelper', error);
      return null;
    }
  },

  /**
   * Create an authentication-related log entry
   * @param {string} action - The auth action (login, logout, etc.)
   * @param {Object} actor - Actor performing the action
   * @param {Object} details - Additional details
   * @returns {Promise<Object|null>} Created log or null if creation failed
   */
  async createAuthLog(action, actor, details = {}) {
    return this.safeLog({
      action,
      actorId: actor.actorId || actor._id || 'system',
      targetId: actor.targetId || '',
      role: actor.actorRole || actor.role || 'system',
      module: 'auth',
      shopId: actor.shopId || null,
      details
    });
  },

  /**
   * Create a user-related log entry
   * @param {string} action - The user action (create, update, etc.)
   * @param {string} targetUserId - Target user ID
   * @param {Object} actor - Actor performing the action
   * @param {Object} details - Additional details
   * @returns {Promise<Object|null>} Created log or null if creation failed
   */
  async createUserLog(action, targetUserId, actor, details = {}) {
    return this.safeLog({
      action,
      actorId: actor.actorId || actor._id || 'system',
      targetId: targetUserId,
      role: actor.actorRole || actor.role || 'system',
      module: 'user',
      shopId: actor.shopId || null,
      details
    });
  },

  /**
   * Create a shop-related log entry
   * @param {string} action - The shop action (create, update, etc.)
   * @param {string} shopId - Shop ID
   * @param {Object} actor - Actor performing the action
   * @param {Object} details - Additional details
   * @returns {Promise<Object|null>} Created log or null if creation failed
   */
  async createShopLog(action, shopId, actor, details = {}) {
    return this.safeLog({
      action,
      actorId: actor.actorId || actor._id || 'system',
      targetId: shopId,
      role: actor.actorRole || actor.role || 'system',
      module: 'shop',
      shopId,
      details
    });
  },

  /**
   * Log a subscription-related event
   * @param {string} action - The subscription action
   * @param {string} shopId - Shop ID
   * @param {Object} actor - Actor performing the action
   * @param {Object} details - Subscription details
   * @returns {Promise<Object|null>} Created log or null if creation failed
   */
  async createSubscriptionLog(action, shopId, actor, details = {}) {
    return this.safeLog({
      action,
      actorId: actor.actorId || actor._id || 'system',
      targetId: shopId,
      role: actor.actorRole || actor.role || 'system',
      module: 'subscription',
      shopId,
      details
    });
  },

  /**
   * Create a security-related log entry
   * @param {string} action - The security action (password_reset, failed_login, etc.)
   * @param {Object} actor - Actor object or data related to the security action
   * @param {Object} details - Additional details
   * @returns {Promise<Object|null>} Created log or null if creation failed
   */
  async createSecurityLog(action, actor, details = {}) {
    return this.safeLog({
      action,
      actorId: actor.actorId || actor._id || 'system',
      targetId: actor.targetId || actor.userId || actor.targetEmail || '',
      role: actor.actorRole || actor.role || 'system',
      module: 'security',
      shopId: actor.shopId || null,
      details: actor.details || details
    });
  },

  /**
   * Create an admin action log entry
   * @param {string} action - The admin action (list_all_users, manage_settings, etc.)
   * @param {Object} actor - Actor performing the action 
   * @param {Object} details - Additional details
   * @returns {Promise<Object|null>} Created log or null if creation failed
   */
  async createAdminLog(action, actor, details = {}) {
    return this.safeLog({
      action,
      actorId: actor.actorId || actor._id || 'system',
      targetId: actor.targetId || '',
      role: actor.actorRole || actor.role || 'system',
      module: 'admin',
      shopId: actor.shopId || null,
      details
    });
  }
};

module.exports = LogHelper;
