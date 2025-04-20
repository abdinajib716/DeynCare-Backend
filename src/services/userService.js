const { User } = require('../models');

// Import utility modules from restructured directory
const { 
  // Core utilities
  AppError,
  
  // Generator utilities
  idGenerator,
  
  // Helper utilities
  UserHelper,
  LogHelper,
  ResponseHelper,
  
  // Logger utilities
  logSuccess,
  logError,
  logWarning,
  logInfo
} = require('../utils');

/**
 * Service for user-related operations
 */
const UserService = {
  /**
   * Create a new user
   */
  createUser: async (userData, options = {}) => {
    try {
      const { 
        fullName, 
        email, 
        phone, 
        password,
        role,
        shopId,
        status = 'pending',
        verified = false,
        emailVerified = false,
        verificationCode = null,
        verificationCodeExpires = null,
        session = null
      } = userData;

      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if user already exists using UserHelper
      const existingUser = await UserHelper.findUserByEmail(normalizedEmail, {
        includeInactive: true,
        throwIfNotFound: false
      });
      
      if (existingUser) {
        logWarning(`Creation attempt with existing email: ${normalizedEmail}`, 'UserService');
        throw new AppError('Email is already registered', 409, 'conflict_error');
      }

      // Validate and sanitize role using UserHelper
      const validatedRole = UserHelper.validateRole(role, {
        currentRole: null, // No current role for new user
        actorRole: options.actorRole || 'system',
        isNewUser: true,
        isShopCreation: !!shopId // Consider it shop creation if shopId is provided
      });

      // Create the user with validated data
      const userId = await idGenerator.generateUserId(User);
      const user = new User({
        userId,
        fullName,
        email: normalizedEmail,
        phone,
        password, // Will be hashed by pre-save hook
        role: validatedRole,
        shopId,
        status,
        verified,
        emailVerified,
        verificationCode,
        verificationCodeExpires
      });

      // Save user (with session if provided)
      if (session) {
        await user.save({ session });
      } else {
        await user.save();
      }

      // Log user creation with LogHelper
      await LogHelper.createUserLog(
        'user_created', 
        userId, 
        {
          actorId: options.actorId || 'system',
          actorRole: options.actorRole || 'system',
          shopId: shopId || null
        }, 
        {
          createdBy: options.createdBy || 'self',
          userRole: validatedRole
        }
      );

      logSuccess(`New user created: ${user.userId} (${user.email})`, 'UserService');
      
      // Return sanitized user data
      return user;
    } catch (error) {
      // Re-throw AppError, wrap others
      if (error instanceof AppError) {
        throw error;
      }
      
      logError('User creation failed', 'UserService', error);
      throw new AppError('Failed to create user', 500, 'user_creation_error');
    }
  },

  /**
   * Get user by ID
   */
  getUserById: async (userId, options = {}) => {
    try {
      // Use UserHelper to find the user by ID
      const user = await UserHelper.findActiveUser(userId, options);
      
      // Return sanitized user data if requested
      if (options.sanitize) {
        return UserHelper.sanitizeUser(user);
      }
      
      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Error retrieving user by ID ${userId}: ${error.message}`, 'UserService', error);
      throw new AppError('Failed to retrieve user', 500, 'user_fetch_error');
    }
  },

  /**
   * Get user by email
   * @param {string} email - Email to find
   * @param {Object} options - Additional options
   * @param {boolean} options.sanitize - Whether to sanitize the user data
   * @param {boolean} options.includeInactive - Whether to include inactive users
   * @param {boolean} options.throwIfNotFound - Whether to throw if not found
   * @returns {Promise<Object|null>} User object or null
   */
  getUserByEmail: async (email, options = {}) => {
    try {
      // Use UserHelper to find the user by email
      const user = await UserHelper.findUserByEmail(email, options);
      
      // Return sanitized user data if requested
      if (options.sanitize && user) {
        return UserHelper.sanitizeUser(user);
      }
      
      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Error retrieving user by email ${email}: ${error.message}`, 'UserService', error);
      throw new AppError('Failed to retrieve user', 500, 'user_fetch_error');
    }
  },

  /**
   * Update user
   * @param {string} userId - ID of the user to update
   * @param {Object} updateData - Data to update
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Updated user object
   */
  updateUser: async (userId, updateData, options = {}) => {
    try {
      // First retrieve the user to update
      const user = await UserHelper.findActiveUser(userId);
      
      // Extract update fields
      const { 
        fullName, 
        email, 
        phone, 
        role,
        status,
        verified,
        emailVerified,
        password
      } = updateData;
      
      // Track which fields were actually changed
      const changedFields = [];

      // Check if trying to update to an existing email
      if (email && email !== user.email) {
        // Normalize email
        const normalizedEmail = email.toLowerCase().trim();
        
        // Check if email is already taken
        const existingUser = await UserHelper.findUserByEmail(normalizedEmail, { 
          throwIfNotFound: false,
          includeInactive: true
        });
        
        if (existingUser && existingUser.userId !== userId) {
          throw new AppError('Email is already registered', 409, 'conflict_error');
        }
        
        user.email = normalizedEmail;
        changedFields.push('email');
      }

      // Update basic fields
      if (fullName && fullName !== user.fullName) {
        user.fullName = fullName;
        changedFields.push('fullName');
      }
      
      if (phone && phone !== user.phone) {
        user.phone = phone;
        changedFields.push('phone');
      }
      
      if (status && status !== user.status) {
        user.status = status;
        changedFields.push('status');
      }
      
      if (verified !== undefined && verified !== user.verified) {
        user.verified = verified;
        changedFields.push('verified');
      }
      
      if (emailVerified !== undefined && emailVerified !== user.emailVerified) {
        user.emailVerified = emailVerified;
        changedFields.push('emailVerified');
      }
      
      if (password) {
        user.password = password; // Will be hashed by pre-save hook
        changedFields.push('password');
      }

      // Validate role update using UserHelper
      if (role && role !== user.role) {
        const validatedRole = UserHelper.validateRole(role, {
          currentRole: user.role,
          actorRole: options.actorRole || 'system',
          isNewUser: false
        });
        
        // Only update if the role was actually changed by the validation
        if (validatedRole !== user.role) {
          user.role = validatedRole;
          changedFields.push('role');
        }
      }

      // Only save if there were actual changes
      if (changedFields.length > 0) {
        await user.save();
        
        // Log user update with LogHelper
        await LogHelper.createUserLog('user_updated', {
          actorId: options.actorId || 'system',
          actorRole: options.actorRole || 'system',
          targetId: userId,
          shopId: user.shopId || null,
          details: { updatedFields: changedFields }
        });
        
        logSuccess(`User updated: ${user.userId} (${user.email})`, 'UserService');
      } else {
        logInfo(`No changes to update for user: ${user.userId}`, 'UserService');
      }
      
      // Return sanitized user if requested
      if (options.sanitize) {
        return UserHelper.sanitizeUser(user);
      }
      
      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Error updating user ${userId}: ${error.message}`, 'UserService', error);
      throw new AppError('Failed to update user', 500, 'user_update_error');
    }
  },

  /**
   * Soft delete user
   * @param {string} userId - ID of user to delete
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Success result
   */
  deleteUser: async (userId, options = {}) => {
    try {
      // Find active user using UserHelper
      const user = await UserHelper.findActiveUser(userId);
      
      // Check if user can be deleted
      if (user.role === 'superAdmin' && options.actorRole !== 'superAdmin') {
        throw new AppError('Only superAdmins can delete superAdmin users', 403, 'forbidden_operation');
      }

      // Perform soft delete
      user.isDeleted = true;
      user.deletedAt = new Date();
      user.status = 'inactive';
      
      // Anonymize sensitive data for GDPR compliance if requested
      if (options.anonymize) {
        user.email = `deleted_${userId}@anonymized.com`;
        user.phone = 'anonymized';
        // Don't anonymize the user's name by default, as it might be needed for audit purposes
      }
      
      await user.save();

      // Log the deletion using LogHelper
      await LogHelper.createUserLog('user_deleted', {
        actorId: options.actorId || 'system',
        actorRole: options.actorRole || 'system',
        targetId: userId,
        shopId: user.shopId || null,
        details: {
          reason: options.reason || 'not_specified',
          anonymized: !!options.anonymize
        }
      });
      
      logSuccess(`User soft deleted: ${user.userId}`, 'UserService');
      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Error deleting user ${userId}: ${error.message}`, 'UserService', error);
      throw new AppError('Failed to delete user', 500, 'user_deletion_error');
    }
  },

  /**
   * List users by shop ID
   * @param {string} shopId - Shop ID to list users for
   * @param {Object} query - Query parameters
   * @param {string} query.status - Filter by status
   * @param {string} query.role - Filter by role
   * @param {number} query.page - Page number
   * @param {number} query.limit - Items per page
   * @param {boolean} query.sanitize - Whether to sanitize user data
   * @returns {Promise<Object>} Users with pagination
   */
  listUsersByShop: async (shopId, query = {}) => {
    try {
      // Validate shop ID
      if (!shopId) {
        throw new AppError('Shop ID is required', 400, 'missing_shop_id');
      }
      
      const { status, role, sanitize = true } = query;
      
      // Build filter
      const filter = { shopId, isDeleted: false };
      if (status) filter.status = status;
      if (role) filter.role = role;

      // Get pagination options
      const paginationOptions = PaginationHelper.getPaginationOptions(query);
      
      // Add sorting and selection
      paginationOptions.sort = paginationOptions.sort || { createdAt: -1 };
      paginationOptions.select = '-password -resetPasswordToken -resetPasswordExpires -verificationCode -verificationCodeExpires';
      
      // Use PaginationHelper for consistent pagination
      const result = await PaginationHelper.paginate(User, filter, paginationOptions);
      
      // Sanitize user data if requested
      if (sanitize) {
        result.items = result.items.map(user => UserHelper.sanitizeUser(user));
      }
      
      // Log the listing operation for audit
      logInfo(`Listed ${result.items.length} users for shop: ${shopId}`, 'UserService');
      
      return {
        users: result.items,
        pagination: result.pagination
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Error listing users for shop ${shopId}: ${error.message}`, 'UserService', error);
      throw new AppError('Failed to list users', 500, 'user_list_error');
    }
  }
};

module.exports = UserService;
