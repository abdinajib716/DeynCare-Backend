const mongoose = require('mongoose');
const { User } = require('../../models');

// Import utility modules
const { 
  AppError,
  idGenerator,
  UserHelper,
  LogHelper,
  logSuccess,
  logError,
  logWarning,
  logInfo
} = require('../../utils');

/**
 * Create a new user with atomic transaction support
 * @param {Object} userData - User data to create
 * @param {string} userData.fullName - User's full name
 * @param {string} userData.email - User's email address
 * @param {string} userData.phone - User's phone number
 * @param {string} userData.password - User's password (will be hashed)
 * @param {string} userData.role - User's role (superAdmin, admin, employee)
 * @param {string} [userData.shopId] - Shop ID (required for admin and employee)
 * @param {string} [userData.status='pending'] - User status
 * @param {boolean} [userData.verified=false] - Whether user is verified
 * @param {boolean} [userData.emailVerified=false] - Whether email is verified
 * @param {string} [userData.verificationCode] - Email verification code
 * @param {Date} [userData.verificationCodeExpires] - Verification code expiry
 * @param {mongoose.ClientSession} [userData.session] - MongoDB session for transactions
 * @param {Object} options - Additional options
 * @param {string} [options.actorId='system'] - ID of actor creating the user
 * @param {string} [options.actorRole='system'] - Role of actor creating the user
 * @param {string} [options.createdBy='self'] - How user was created
 * @returns {Promise<Object>} Created user object
 * @throws {AppError} If creation fails
 */
const createUser = async (userData, options = {}) => {
  // Start a session for transaction if not provided
  const session = userData.session || await mongoose.startSession();
  const startedTransaction = !userData.session;
  
  try {
    // Start transaction if we created the session
    if (startedTransaction) {
      session.startTransaction();
      logInfo('Started transaction for user creation', 'UserService');
    }
    
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
      verificationCodeExpires = null
    } = userData;

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if user already exists using UserHelper with the transaction session
    const existingUser = await UserHelper.findUserByEmail(normalizedEmail, {
      includeInactive: true,
      throwIfNotFound: false,
      session
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
    
    // Handle shopId based on role
    let finalShopId = shopId;
    if (validatedRole === 'superAdmin') {
      // superAdmin can operate without a shop
      finalShopId = null;
    } else if (!finalShopId) {
      // Admin and employee must have a shop
      throw new AppError('Shop ID is required for admin and employee roles', 400, 'validation_error');
    }
    
    const user = new User({
      userId,
      fullName,
      email: normalizedEmail,
      phone,
      password, // Will be hashed by pre-save hook
      role: validatedRole,
      shopId: finalShopId,
      status,
      verified,
      emailVerified,
      verificationCode,
      verificationCodeExpires
    });

    // Save user with session for transaction
    await user.save({ session });

    // Log user creation with LogHelper
    await LogHelper.createUserLog(
      userId,
      'user_created',
      {
        role: validatedRole,
        shop: finalShopId,
        createdBy: options.actorId || 'system'
      },
      // Pass session for consistent transaction
      session
    );

    // Commit the transaction if we started it
    if (startedTransaction) {
      await session.commitTransaction();
      logInfo('Committed transaction for user creation', 'UserService');
    }

    logSuccess(`User created: ${userId} (${normalizedEmail})`, 'UserService');
    
    // Get user data to return
    const userData = user.toObject();
    
    // Populate shop name if shop ID exists - will be imported from the index.js
    const populateShopNames = require('./populateShopNames');
    const populatedUser = await populateShopNames(userData);
    
    return populatedUser;
  } catch (error) {
    // Abort the transaction if we started it
    if (startedTransaction && session) {
      try {
        await session.abortTransaction();
        logInfo('Aborted transaction due to error in user creation', 'UserService');
      } catch (abortError) {
        logError(`Error aborting transaction: ${abortError.message}`, 'UserService', abortError);
      }
    }
    
    // Re-throw AppError, wrap others
    if (error instanceof AppError) {
      throw error;
    }
    
    logError(`User creation failed: ${error.message}`, 'UserService', error);
    throw new AppError('Failed to create user', 500, 'user_creation_error');
  } finally {
    // End the session if we started it
    if (startedTransaction && session) {
      try {
        await session.endSession();
        logInfo('Ended session for user creation', 'UserService');
      } catch (endError) {
        logError(`Error ending session: ${endError.message}`, 'UserService', endError);
      }
    }
  }
};

module.exports = createUser;
