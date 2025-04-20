const { User } = require('../../models');
const { AppError } = require('../index');
const { logInfo, logError } = require('../logger.js');

/**
 * Helper for common user operations and entity retrieval
 */
const UserHelper = {
  /**
   * Find an active user by ID
   * @param {string} userId - User ID to find
   * @param {Object} options - Additional options
   * @param {boolean} options.includeInactive - Whether to include inactive users
   * @param {Array<string>} options.select - Fields to select
   * @param {Object} options.session - MongoDB session
   * @returns {Promise<Object>} User object
   * @throws {AppError} If user not found
   */
  async findActiveUser(userId, options = {}) {
    try {
      const { 
        includeInactive = false, 
        select = null,
        session = null
      } = options;

      // Build query
      const query = { userId };
      
      // Only include active users unless specified
      if (!includeInactive) {
        query.isDeleted = false;
      }

      // Build find operation
      let operation = User.findOne(query);
      
      // Add selection if specified
      if (select) {
        operation = operation.select(select);
      }
      
      // Add session if specified
      if (session) {
        operation = operation.session(session);
      }
      
      // Execute query
      const user = await operation;

      if (!user) {
        throw new AppError('User not found', 404, 'user_not_found');
      }

      return user;
    } catch (error) {
      // Re-throw AppError, wrap others
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Error finding user by ID: ${error.message}`, 'UserHelper', error);
      throw new AppError('Error finding user', 500, 'database_error');
    }
  },

  /**
   * Find an active user by email
   * @param {string} email - Email to find
   * @param {Object} options - Additional options
   * @param {boolean} options.includeInactive - Whether to include inactive users
   * @param {Array<string>} options.select - Fields to select
   * @param {boolean} options.throwIfNotFound - Whether to throw if not found
   * @returns {Promise<Object|null>} User object or null if not found and throwIfNotFound is false
   * @throws {AppError} If user not found and throwIfNotFound is true
   */
  async findUserByEmail(email, options = {}) {
    try {
      const { 
        includeInactive = false, 
        select = null,
        throwIfNotFound = true 
      } = options;

      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase();
      
      // Build query
      const query = { email: normalizedEmail };
      
      // Only include active users unless specified
      if (!includeInactive) {
        query.isDeleted = false;
      }

      // Build find operation
      let operation = User.findOne(query);
      
      // Add selection if specified
      if (select) {
        operation = operation.select(select);
      }
      
      // Execute query
      const user = await operation;

      if (!user && throwIfNotFound) {
        throw new AppError('User not found', 404, 'user_not_found');
      }

      return user;
    } catch (error) {
      // Re-throw AppError, wrap others
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Error finding user by email: ${error.message}`, 'UserHelper', error);
      throw new AppError('Error finding user', 500, 'database_error');
    }
  },

  /**
   * Validate user role assignment
   * @param {string} newRole - Role to assign
   * @param {Object} context - Context information
   * @param {string} context.currentRole - Current user role
   * @param {string} context.actorRole - Role of actor making the change
   * @param {boolean} context.isNewUser - Whether this is a new user creation
   * @returns {string} Validated role (may be different from requested role)
   */
  validateRole(newRole, context = {}) {
    const { 
      currentRole = null, 
      actorRole = 'system',
      isNewUser = false
    } = context;

    // Role assignment rules
    const validRoles = ['superAdmin', 'admin', 'employee'];
    const defaultRole = 'employee';
    
    // Ensure role is valid
    if (!newRole || !validRoles.includes(newRole)) {
      return defaultRole;
    }

    // Only superAdmin can create/assign superAdmin role
    if (newRole === 'superAdmin' && actorRole !== 'superAdmin') {
      return isNewUser ? defaultRole : currentRole;
    }

    // Only superAdmin can demote/promote to admin
    if (newRole === 'admin' && actorRole !== 'superAdmin') {
      // For new users with shop creation, admin is allowed
      if (isNewUser && context.isShopCreation) {
        return 'admin';
      }
      return isNewUser ? defaultRole : currentRole;
    }

    // All can assign employee role
    return newRole;
  },

  /**
   * Sanitize user data for public exposure
   * @param {Object} user - User object from database
   * @returns {Object} Sanitized user object
   */
  sanitizeUser(user) {
    if (!user) return null;
    
    // Extract basic fields
    const sanitized = {
      userId: user.userId,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      shopId: user.shopId,
      status: user.status,
      verified: user.verified,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return sanitized;
  }
};

module.exports = UserHelper;
