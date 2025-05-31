const AuthService = require('../../services/authService');
const { 
  ResponseHelper, 
  LogHelper,
  logSuccess, 
  logError
} = require('../../utils');

/**
 * Get current user profile
 * GET /api/auth/me
 * Requires authentication
 */
const getProfile = async (req, res, next) => {
  try {
    const { userId } = req.user;
    
    try {
      // Delegate to AuthService - this will fetch the full user data from database
      const userProfile = await AuthService.getProfile(userId);
      
      // Log profile access for audit purposes using LogHelper
      await LogHelper.createAuthLog('view_profile', {
        actorId: userId,
        targetId: userId,
        actorRole: req.user.role,
        shopId: req.user.shopId || null
      });
      
      return ResponseHelper.success(res, 'Profile retrieved successfully', userProfile);
    } catch (authError) {
      // Handle specific authentication errors
      if (authError.statusCode) {
        return ResponseHelper.error(
          res,
          authError.message,
          authError.statusCode,
          authError.errorCode || 'profile_fetch_error'
        );
      }
      throw authError;
    }
  } catch (error) {
    logError('Get profile error', 'AuthController', error);
    return next(error);
  }
};

/**
 * Check if an email already exists
 * POST /api/auth/check-email
 */
const checkEmailExists = async (req, res, next) => {
  try {
    const { email } = req.validatedData || req.body;

    if (!email) {
      return ResponseHelper.error(
        res,
        'Email is required',
        400,
        'missing_email'
      );
    }

    // Use UserService to check if email exists
    const { User } = require('../../models');
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      // Return 409 Conflict status to indicate the email already exists
      return ResponseHelper.error(
        res,
        'Email already exists',
        409,
        'email_conflict'
      );
    }

    // If email doesn't exist, return success response
    return ResponseHelper.success(
      res,
      'Email is available',
      { exists: false }
    );
  } catch (error) {
    logError('Check email exists error', 'AuthController', error);
    return next(error);
  }
};

module.exports = {
  getProfile,
  checkEmailExists
};
