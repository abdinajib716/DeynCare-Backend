const mongoose = require('mongoose');
const { 
  AppError, 
  UserHelper, 
  LogHelper, 
  logSuccess, 
  logError, 
  logWarning,
  logInfo 
} = require('../../utils');

/**
 * Update user with atomic transaction support
 * @param {string} userId - ID of the user to update
 * @param {Object} updateData - Data to update
 * @param {Object} options - Additional options
 * @param {string} [options.actorId='system'] - ID of actor updating the user
 * @param {string} [options.actorRole='system'] - Role of actor updating the user
 * @param {mongoose.ClientSession} [options.session] - MongoDB session for transactions
 * @param {boolean} [options.sanitize=false] - Whether to sanitize the response
 * @param {string} [options.optimisticLockField='__v'] - Field to use for optimistic locking
 * @returns {Promise<Object>} Updated user object
 * @throws {AppError} If update fails or concurrency check fails
 */
const updateUser = async (userId, updateData, options = {}) => {
  // Start a session for transaction if not provided
  const session = options.session || await mongoose.startSession();
  const startedTransaction = !options.session;
  
  try {
    // Start transaction if we created the session
    if (startedTransaction) {
      session.startTransaction();
      logInfo('Started transaction for user update', 'UserService');
    }
    
    // First retrieve the user to update with the session
    const user = await UserHelper.findActiveUser(userId, { session });
    
    // Implement optimistic locking if version is provided
    const optimisticLockField = options.optimisticLockField || '__v';
    const versionCheck = updateData[optimisticLockField];
    
    if (versionCheck !== undefined && user[optimisticLockField] !== versionCheck) {
      throw new AppError(
        'User data was modified by another process. Please refresh and try again.',
        409, 
        'concurrency_error'
      );
    }
    
    // Extract update fields
    const { 
      fullName, 
      email, 
      phone, 
      role,
      status,
      verified,
      emailVerified,
      password,
      isSuspended,
      suspensionReason
    } = updateData;
    
    // Track which fields were actually changed
    const changedFields = [];

    // Check if trying to update to an existing email
    if (email && email !== user.email) {
      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if email is already taken - using the transaction session
      const existingUser = await UserHelper.findUserByEmail(normalizedEmail, { 
        throwIfNotFound: false,
        includeInactive: true,
        session
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
    
    // Handle isSuspended flag separately (for account suspension)
    if (isSuspended !== undefined && isSuspended !== user.isSuspended) {
      user.isSuspended = isSuspended;
      changedFields.push('isSuspended');
    }
    
    // Handle suspension reason
    if (suspensionReason !== undefined) {
      if (suspensionReason === null) {
        // Clear suspension reason
        user.suspensionReason = null;
        changedFields.push('suspensionReason');
      } else if (suspensionReason !== user.suspensionReason) {
        // Update suspension reason
        user.suspensionReason = suspensionReason;
        changedFields.push('suspensionReason');
      }
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
      // Save with the transaction session
      await user.save({ session });
      
      // Log user update with LogHelper using the same session
      await LogHelper.createUserLog(
        'user_updated',
        userId,
        {
          actorId: options?.actorId || 'system',
          actorRole: options?.actorRole || 'system',
          shopId: user.shopId || null
        },
        { updatedFields: changedFields },
        // Pass session for transaction consistency
        session
      );
      
      // Commit the transaction if we started it
      if (startedTransaction) {
        await session.commitTransaction();
        logInfo('Committed transaction for user update', 'UserService');
      }
      
      logSuccess(`User updated: ${user.userId} (${user.email})`, 'UserService');
    } else {
      // If we started a transaction but have no changes, end it
      if (startedTransaction) {
        await session.abortTransaction();
        logInfo('Aborted transaction for user update with no changes', 'UserService');
      }
      
      logInfo(`No changes to update for user: ${user.userId}`, 'UserService');
    }
    
    // Return sanitized user if requested
    if (options.sanitize) {
      return UserHelper.sanitizeUser(user);
    }
    
    return user;
  } catch (error) {
    // Abort the transaction if we started it
    if (startedTransaction && session) {
      try {
        await session.abortTransaction();
        logInfo('Aborted transaction due to error in user update', 'UserService');
      } catch (abortError) {
        logError(`Error aborting transaction: ${abortError.message}`, 'UserService', abortError);
      }
    }
    
    // Enhanced error debugging
    logError('DETAILED USER UPDATE ERROR:', 'UserService', {
      userId,
      updateDataKeys: Object.keys(updateData),
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code // MongoDB error code
    });
    
    // Pass through existing AppErrors
    if (error instanceof AppError) {
      throw error;
    }
    
    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(field => {
        return `${field}: ${error.errors[field].message}`;
      }).join(', ');
      
      logError(`Validation error updating user ${userId}: ${validationErrors}`, 'UserService', error);
      throw new AppError(`Validation error: ${validationErrors}`, 400, 'validation_error');
    }
    
    // MongoDB duplicate key errors
    if ((error.name === 'MongoError' || error.name === 'MongoServerError') && error.code === 11000) {
      logError(`Duplicate key error updating user ${userId}`, 'UserService', error);
      throw new AppError('A user with that email already exists', 409, 'duplicate_email');
    }
    
    // Cast errors (usually invalid ObjectId)
    if (error.name === 'CastError') {
      logError(`Invalid ID format for user ${userId}`, 'UserService', error);
      throw new AppError(`Invalid ID format: ${error.path}`, 400, 'invalid_id');
    }
    
    // Default error handler
    logError(`Error updating user ${userId}: ${error.message}`, 'UserService', error);
    throw new AppError('Failed to update user', 500, 'user_update_error');
  } finally {
    // End the session if we started it
    if (startedTransaction && session) {
      try {
        await session.endSession();
        logInfo('Ended session for user update', 'UserService');
      } catch (endError) {
        logError(`Error ending session: ${endError.message}`, 'UserService', endError);
      }
    }
  }
};

module.exports = updateUser;
