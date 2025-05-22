const { User } = require('../../models');
const { AppError } = require('../index');
const { logInfo, logError } = require('../logger.js');

/**
 * Helper for common user operations and entity retrieval
 */
const UserHelper = {
  /**
   * Find an active user by ID
   * This method uses caching for improved performance on frequently accessed users
   * 
   * @param {string} userId - User ID to find
   * @param {Object} options - Additional options
   * @param {boolean} options.includeInactive - Whether to include inactive users
   * @param {Array<string>} options.select - Fields to select
   * @param {Object} options.session - MongoDB session
   * @param {boolean} options.useCache - Whether to use/update cache (default: true)
   * @returns {Promise<Object>} User object
   * @throws {AppError} If user not found
   */
  async findActiveUser(userId, options = {}) {
    try {
      // Validate input
      if (!userId || typeof userId !== 'string') {
        throw new AppError('Invalid user ID', 400, 'invalid_parameter');
      }

      const { 
        includeInactive = false, 
        select = null,
        session = null,
        useCache = true
      } = options;
      
      // Check cache first if we can use it (no session, not including inactive)
      if (useCache && !session && !includeInactive && !select) {
        const cachedUser = this._getCachedUser(`user_${userId}`);
        if (cachedUser) {
          logInfo(`User ${userId} found in cache`, 'UserHelper');
          return cachedUser;
        }
      }

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
      
      // Update cache if appropriate
      if (useCache && !session && !includeInactive && !select) {
        this._cacheUser(`user_${userId}`, user);
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
   * This method uses caching for improved performance on frequently accessed users
   * 
   * @param {string} email - Email to find
   * @param {Object} options - Additional options
   * @param {boolean} options.includeInactive - Whether to include inactive users
   * @param {Array<string>} options.select - Fields to select
   * @param {boolean} options.throwIfNotFound - Whether to throw if not found
   * @param {boolean} options.useCache - Whether to use/update cache (default: true)
   * @returns {Promise<Object|null>} User object or null if not found and throwIfNotFound is false
   * @throws {AppError} If user not found and throwIfNotFound is true
   * @throws {AppError} If email is invalid
   */
  async findUserByEmail(email, options = {}) {
    try {
      // Validate input
      if (!email || typeof email !== 'string') {
        throw new AppError('Invalid email', 400, 'invalid_parameter');
      }

      const { 
        includeInactive = false, 
        select = null,
        throwIfNotFound = true,
        useCache = true
      } = options;

      // Normalize email to lowercase and trim
      const normalizedEmail = email.toLowerCase().trim();
      
      // Email validation (basic format check)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        throw new AppError('Invalid email format', 400, 'invalid_email_format');
      }
      
      // Check cache first if we can use it (no complex options)
      if (useCache && !includeInactive && !select) {
        const cachedUser = this._getCachedUser(`email_${normalizedEmail}`);
        if (cachedUser) {
          logInfo(`User with email ${normalizedEmail} found in cache`, 'UserHelper');
          return cachedUser;
        }
      }
      
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
      
      // Update cache if appropriate and user was found
      if (useCache && user && !includeInactive && !select) {
        this._cacheUser(`email_${normalizedEmail}`, user);
        // Also cache by userId for cross-reference
        this._cacheUser(`user_${user.userId}`, user);
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
   * Validate user role assignment based on DeynCare business rules
   * 
   * Role-Shop Association Rules:
   * - superAdmin: Can operate across the entire system without being tied to a specific shop
   * - admin: Must be associated with a valid shop (shopId required)
   * - employee: Must be associated with a valid shop (shopId required)
   * 
   * Role Assignment Rules:
   * - Only superAdmin can create/assign superAdmin role
   * - Only superAdmin can promote/demote to admin role
   * - All roles can assign employee role
   * - Admin users can only create employees for their own shop
   * 
   * @param {string} newRole - Role to assign (superAdmin, admin, or employee)
   * @param {Object} context - Context information
   * @param {string} context.currentRole - Current user role (for existing users)
   * @param {string} context.actorRole - Role of actor making the change
   * @param {boolean} context.isNewUser - Whether this is a new user creation
   * @param {boolean} context.isShopCreation - Whether this is part of shop creation
   * @param {string} context.shopId - The shop ID (if applicable)
   * @returns {string} Validated role (may be different from requested role based on permissions)
   */
  validateRole(newRole, context = {}) {
    // Validate and set defaults for context parameters
    const { 
      currentRole = null, 
      actorRole = 'system',
      isNewUser = false,
      isShopCreation = false,
      shopId = null
    } = context;

    // Define valid roles and default role
    const validRoles = ['superAdmin', 'admin', 'employee'];
    const defaultRole = 'employee';
    
    // Input validation: ensure role is valid or return default
    if (!newRole || typeof newRole !== 'string' || !validRoles.includes(newRole)) {
      logWarning(`Invalid role requested: ${newRole}, defaulting to ${defaultRole}`, 'UserHelper');
      return defaultRole;
    }

    // Role-based permission checks
    // Only superAdmin can create/assign superAdmin role
    if (newRole === 'superAdmin' && actorRole !== 'superAdmin') {
      logInfo(`Actor with role ${actorRole} attempted to assign superAdmin role, denied`, 'UserHelper');
      return isNewUser ? defaultRole : currentRole;
    }
    
    // Shop association rules:
    // superAdmin: Does not require shop association (handled at service level)
    // admin/employee: Requires valid shop association (validation done at controller/service level)
    
    // Only superAdmin can promote/demote to admin
    if (newRole === 'admin' && actorRole !== 'superAdmin') {
      // Exception: During new shop creation, the shop owner becomes admin
      if (isNewUser && isShopCreation) {
        logInfo(`Creating admin role during shop creation`, 'UserHelper');
        return 'admin';
      }
      
      logInfo(`Actor with role ${actorRole} attempted to assign admin role, denied`, 'UserHelper');
      return isNewUser ? defaultRole : currentRole;
    }

    // All can assign employee role
    // Note: Additional shop-specific validations happen at controller level
    return newRole;
  },

    /**
   * Simple in-memory cache for user data
   * @private
   */
  _userCache: new Map(),
  
  /**
   * Cache timeout in milliseconds (5 minutes)
   * @private
   */
  _cacheTTL: 5 * 60 * 1000,
  
  /**
   * Get a user from cache if available and not expired
   * @private
   * @param {string} key - Cache key (usually userId or email)
   * @returns {Object|null} Cached user data or null if not found/expired
   */
  _getCachedUser(key) {
    if (!key) return null;
    
    const cached = this._userCache.get(key);
    if (!cached) return null;
    
    // Check if cache is expired
    if (Date.now() - cached.timestamp > this._cacheTTL) {
      this._userCache.delete(key);
      return null;
    }
    
    return cached.data;
  },
  
  /**
   * Cache user data with timestamp
   * @private
   * @param {string} key - Cache key (usually userId or email)
   * @param {Object} data - User data to cache
   */
  _cacheUser(key, data) {
    if (!key || !data) return;
    
    this._userCache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Prevent memory leaks by limiting cache size
    if (this._userCache.size > 1000) {
      // Remove oldest entries when cache gets too large
      const keysIterator = this._userCache.keys();
      this._userCache.delete(keysIterator.next().value);
    }
  },

  /**
   * Sanitize user data for public exposure by removing sensitive fields
   * 
   * Security Notice:
   * This method ensures sensitive user data like password hashes, reset tokens,
   * and verification codes are never exposed via API responses. Always use this
   * method before sending user data to clients.
   * 
   * @param {Object} user - User object from database (Mongoose document or plain object)
   * @returns {Object} Sanitized user object with sensitive data removed
   * @throws {Error} If input is invalid
   */
  sanitizeUser(user) {
    // Input validation
    if (!user) return null;
    
    // Convert Mongoose document to plain object if needed
    const userData = user.toObject ? user.toObject() : user;
    
    // Extract only the allowed fields to ensure no sensitive data leaks
    const sanitized = {
      userId: userData.userId,
      fullName: userData.fullName,
      email: userData.email,
      phone: userData.phone,
      role: userData.role,
      shopId: userData.shopId,
      status: userData.status,
      verified: userData.verified,
      emailVerified: userData.emailVerified,
      isSuspended: userData.isSuspended || false,
      profilePicture: userData.profilePicture,
      lastLoginAt: userData.lastLoginAt,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt
    };
    
    // Add user preferences if they exist (without exposing sensitive settings)
    if (userData.preferences) {
      sanitized.preferences = {
        theme: userData.preferences.theme,
        language: userData.preferences.language
      };
    }

    return sanitized;
  }
};

module.exports = UserHelper;
