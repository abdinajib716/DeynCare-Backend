const mongoose = require('mongoose');
const UserService = require('../services/userService');
const ShopService = require('../services/shopService');
const EmailService = require('../services/emailService');

// Models will be required on-demand to prevent circular dependencies
let User;

// Import utility modules using the new directory structure
const { 
  // Core utilities
  AppError, 
  
  // Helper utilities
  ResponseHelper,
  LogHelper,
  PaginationHelper,
  
  // Logger utilities
  logInfo,
  logSuccess,
  logWarning,
  logError
} = require('../utils');

/**
 * User controller for handling all user management operations
 * Primarily for SuperAdmin functionality
 */
const UserController = {
  /**
   * Get all users (SuperAdmin only)
   * GET /api/users
   * Requires authentication and superAdmin authorization
   */
  getAllUsers: async (req, res, next) => {
    try {
      // Extract query parameters
      const { 
        page = 1, 
        limit = 10, 
        status, 
        role, 
        shopId,
        search
      } = req.query;

      // Initialize User model on first use (to avoid circular dependencies)
      if (!User) {
        const models = require('../models');
        User = models.User;
      }
      
      // Log query params for debugging
      console.log(`DEBUG: Query params:`, req.query);

      // Create filter object
      const filter = { isDeleted: false };
      
      // Add optional filters - only if they're valid values (not 'undefined' strings)
      if (status && status !== 'undefined') filter.status = status;
      if (role && role !== 'undefined') filter.role = role;
      if (shopId && shopId !== 'undefined') filter.shopId = shopId;
      
      // Add search filter if provided
      if (search) {
        filter.$or = [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }

      // Get pagination options
      const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { createdAt: -1 },
        select: '-password -resetPasswordToken -resetPasswordExpires -verificationCode'
      };

      // Get users with pagination (User model already initialized above)
      const result = await User.paginate(filter, options);
      
      // Map users to remove sensitive information and populate shop names
      const sanitizedUsers = await Promise.all(
        result.docs.map(async user => {
          const sanitizedUser = await UserService.sanitizeUserForResponse(user);
          if (sanitizedUser.shopId) {
            const shop = await ShopService.getShopById(sanitizedUser.shopId);
            sanitizedUser.shopName = shop.name;
          }
          return sanitizedUser;
        })
      );
      
      // Log the request for audit purposes
      await LogHelper.createAdminLog('list_all_users', {
        actorId: req.user.userId,
        actorRole: req.user.role,
        details: { filters: req.query }
      });

      // Return successful response with data
      return ResponseHelper.success(res, 'Users retrieved successfully', {
        users: sanitizedUsers,
        pagination: {
          totalDocs: result.totalDocs,
          limit: result.limit,
          totalPages: result.totalPages,
          page: result.page,
          hasPrevPage: result.hasPrevPage,
          hasNextPage: result.hasNextPage,
          prevPage: result.prevPage,
          nextPage: result.nextPage
        }
      });
    } catch (error) {
      logError('Error getting all users', 'UserController', error);
      return next(error);
    }
  },

  /**
   * Get user by ID
   * GET /api/users/:userId
   * Requires authentication and appropriate authorization
   */
  getUserById: async (req, res, next) => {
    try {
      const { userId } = req.params;
      
      // Get user by ID with appropriate sanitization
      const user = await UserService.getUserById(userId, { sanitize: true });
      
      if (!user) {
        return next(new AppError('User not found', 404, 'user_not_found'));
      }
      
      // Return successful response with populated shop name
      let sanitizedUser = await UserService.sanitizeUserForResponse(user);
      
      // Use the populateShopNames method to ensure shop name is properly populated
      if (sanitizedUser.shopId) {
        // Log shop ID for debugging
        logInfo(`Populating shop name for user ${userId} with shopId: ${sanitizedUser.shopId}`, 'UserController');
        
        // Use the improved method we fixed
        sanitizedUser = await UserService.populateShopNames(sanitizedUser);
        
        // Additional logging to verify shop name
        logInfo(`Shop name after population: ${sanitizedUser.shopName || 'not available'}`, 'UserController');
      }
      
      return ResponseHelper.success(res, 'User retrieved successfully', {
        user: sanitizedUser
      });
    } catch (error) {
      return next(error);
    }
  },

  /**
   * Create new user (SuperAdmin can create users for any shop)
   * POST /api/users
   * Requires authentication and superAdmin authorization
   */
  createUser: async (req, res, next) => {
    try {
      const userData = req.validatedData || req.body;
      
      // If shopId is provided, verify shop exists
      if (userData.shopId) {
        const shop = await ShopService.getShopById(userData.shopId);
        if (!shop) {
          return next(new AppError('Shop not found', 404, 'shop_not_found'));
        }
      }
      
      // Set creation options
      const options = {
        actorId: req.user.userId,
        actorRole: req.user.role,
        createdBy: 'admin'
      };
      
      // Create the user
      const user = await UserService.createUser(userData, options);
      
      // Log the creation
      await LogHelper.createAdminLog('create_user', {
        actorId: req.user.userId,
        actorRole: req.user.role,
        targetId: user.userId,
        details: {
          userRole: user.role,
          shopId: user.shopId || 'none'
        }
      });
      
      // Return successful response
      return ResponseHelper.success(res, 'User created successfully', {
        user: UserService.sanitizeUserForResponse(user)
      }, 201);
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      logError('Error creating user', 'UserController', error);
      return next(new AppError('Failed to create user', 500, 'user_creation_error'));
    }
  },

  /**
   * Update user
   * PUT /api/users/:userId
   * Requires authentication and appropriate authorization
   */
  updateUser: async (req, res, next) => {
    try {
      const { userId } = req.params;
      const updateData = req.validatedData || req.body;
      
      // Get the user to update
      const userToUpdate = await UserService.getUserById(userId, { sanitize: false });
      
      // Check permissions
      if (req.user.role !== 'superAdmin') {
        // Only superAdmin can update users from other shops
        if (userToUpdate.shopId !== req.user.shopId) {
          return next(new AppError('You do not have permission to update this user', 403, 'forbidden'));
        }
        
        // Only superAdmin can update another admin
        if (userToUpdate.role === 'admin' && req.user.role !== 'admin') {
          return next(new AppError('You do not have permission to update an admin user', 403, 'forbidden'));
        }
      }
      
      // Set update options
      const options = {
        actorId: req.user.userId,
        actorRole: req.user.role
      };
      
      // Update the user
      const updatedUser = await UserService.updateUser(userId, updateData, options);
      
      // Log the update
      await LogHelper.createAdminLog('update_user', {
        actorId: req.user.userId,
        actorRole: req.user.role,
        targetId: userId,
        details: {
          updatedFields: Object.keys(updateData)
        }
      });
      
      // Return successful response
      return ResponseHelper.success(res, 'User updated successfully', {
        user: UserService.sanitizeUserForResponse(updatedUser)
      });
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      logError(`Error updating user: ${req.params.userId}`, 'UserController', error);
      return next(new AppError('Failed to update user', 500, 'user_update_error'));
    }
  },

  /**
   * Change user status (SuperAdmin can change status for any user)
   * PATCH /api/users/:userId/status
   * Requires authentication and appropriate authorization
   */
  changeUserStatus: async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { status, reason } = req.validatedData || req.body;
      
      // Get the user to update
      const userToUpdate = await UserService.getUserById(userId, { sanitize: false });
      
      // Check permissions
      if (req.user.role !== 'superAdmin') {
        // Only superAdmin can update users from other shops
        if (userToUpdate.shopId !== req.user.shopId) {
          return next(new AppError('You do not have permission to update this user', 403, 'forbidden'));
        }
        
        // Only superAdmin can update another admin
        if (userToUpdate.role === 'admin' && req.user.role !== 'admin') {
          return next(new AppError('You do not have permission to update an admin user', 403, 'forbidden'));
        }
      }
      
      // Prevent changing superAdmin status by non-superAdmins
      if (userToUpdate.role === 'superAdmin' && req.user.role !== 'superAdmin') {
        return next(new AppError('Only superAdmins can change the status of other superAdmins', 403, 'forbidden'));
      }
      
      // Set update options
      const options = {
        actorId: req.user.userId,
        actorRole: req.user.role
      };
      
      // Update fields based on status
      const updateData = { status };
      
      if (status === 'suspended') {
        updateData.isSuspended = true;
        
        // Require a reason for suspension
        if (!reason || reason.trim() === '') {
          return next(new AppError('A reason must be provided when suspending a user', 400, 'reason_required'));
        }
        
        updateData.suspensionReason = reason;
        
        // We'll send an email notification about the suspension
        try {
          await EmailService.admin.sendAccountSuspensionEmail(userToUpdate.email, {
            name: userToUpdate.fullName,
            reason: reason,
            contactEmail: 'support@deyncare.com' // Replace with your actual support email
          });
          logInfo(`Suspension notification email sent to ${userToUpdate.email}`, 'UserController');
        } catch (emailError) {
          // Log the error but don't stop the suspension process
          logError(`Failed to send suspension email to ${userToUpdate.email}: ${emailError.message}`, 'UserController', emailError);
        }
      } else if (status === 'active') {
        updateData.isSuspended = false;
        updateData.suspensionReason = null; // Clear any previous suspension reason
        
        // If user was previously suspended, send a reactivation email
        if (userToUpdate.isSuspended) {
          try {
            await EmailService.admin.sendAccountReactivationEmail(userToUpdate.email, {
              name: userToUpdate.fullName,
              contactEmail: 'support@deyncare.com'
            });
            logInfo(`Reactivation notification email sent to ${userToUpdate.email}`, 'UserController');
          } catch (emailError) {
            // Log the error but don't stop the reactivation process
            logError(`Failed to send reactivation email to ${userToUpdate.email}: ${emailError.message}`, 'UserController', emailError);
          }
        }
      }
      
      try {
        // Update the user - wrapped in try/catch for better error reporting
        const updatedUser = await UserService.updateUser(userId, updateData, options);
        
        // Log the status change
        await LogHelper.createSecurityLog('user_status_changed', {
        actorId: req.user.userId,
        actorRole: req.user.role,
        targetId: userId,
        details: {
          newStatus: status,
          reason: reason || 'No reason provided'
        }
      });
      
      // Return successful response
      return ResponseHelper.success(res, `User status changed to ${status} successfully`, {
        user: UserService.sanitizeUserForResponse(updatedUser)
      });
      } catch (updateError) {
        // Log the specific update error for debugging
        logError(`Error during user update operation: ${updateError.message}`, 'UserController', updateError);
        // Rethrow to be caught by outer catch
        throw updateError;
      }
    } catch (error) {
      // Enhanced error logging to diagnose the issue
      console.error('DETAILED STATUS CHANGE ERROR:', {
        userId: req.params.userId,
        requestData: req.body,
        errorMessage: error.message,
        errorStack: error.stack,
        errorType: error.constructor.name
      });
      
      // Check for specific error types
      if (error instanceof AppError) {
        return next(error);
      } else if (error.name === 'ValidationError') {
        // Mongoose validation error
        return next(new AppError(`Validation error: ${error.message}`, 400, 'validation_error'));
      } else if (error.name === 'CastError') {
        // Mongoose casting error
        return next(new AppError(`Invalid ID format: ${error.message}`, 400, 'invalid_id'));
      }
      
      logError(`Error changing user status: ${req.params.userId}`, 'UserController', error);
      return next(new AppError('Failed to change user status', 500, 'user_status_change_error'));
    }
  },

  /**
   * Delete user (SuperAdmin can delete any user except other superAdmins)
   * DELETE /api/users/:userId
   * Requires authentication and appropriate authorization
   */
  deleteUser: async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { reason } = req.validatedData || req.body;
      
      // Get the user to delete
      const userToDelete = await UserService.getUserById(userId, { sanitize: false });
      
      // Check permissions
      // Only superAdmin can delete users from other shops
      if (req.user.role !== 'superAdmin' && userToDelete.shopId !== req.user.shopId) {
        return next(new AppError('You do not have permission to delete this user', 403, 'forbidden'));
      }
      
      // Only superAdmin can delete an admin
      if (userToDelete.role === 'admin' && req.user.role !== 'superAdmin') {
        return next(new AppError('Only superAdmins can delete admin users', 403, 'forbidden'));
      }
      
      // Prevent deleting superAdmin by non-superAdmins
      if (userToDelete.role === 'superAdmin' && req.user.role !== 'superAdmin') {
        return next(new AppError('Only superAdmins can delete other superAdmins', 403, 'forbidden'));
      }
      
      // Set delete options
      const options = {
        actorId: req.user.userId,
        actorRole: req.user.role,
        reason: reason || 'No reason provided'
      };
      
      // Delete the user
      await UserService.deleteUser(userId, options);
      
      // Log the deletion
      await LogHelper.createSecurityLog('user_deleted', {
        actorId: req.user.userId,
        actorRole: req.user.role,
        targetId: userId,
        details: {
          reason: reason || 'No reason provided'
        }
      });
      
      // Return successful response
      return ResponseHelper.success(res, 'User deleted successfully');
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      logError(`Error deleting user: ${req.params.userId}`, 'UserController', error);
      return next(new AppError('Failed to delete user', 500, 'user_deletion_error'));
    }
  }
};

module.exports = UserController;
