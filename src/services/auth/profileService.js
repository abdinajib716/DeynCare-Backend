const { 
  AppError,
  UserHelper,
  LogHelper,
  logSuccess,
  logError
} = require('../../utils');

/**
 * Get user profile
 */
const getProfile = async (userId) => {
  try {
    // Use UserHelper to find and sanitize user data
    const user = await UserHelper.findActiveUser(userId);
    
    // Log profile access
    await LogHelper.createAuthLog('profile_viewed', {
      actorId: userId,
      targetId: userId,
      actorRole: user.role,
      shopId: user.shopId || null
    });
    
    // Return sanitized user data
    return UserHelper.sanitizeUser(user);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logError(`Get profile error for user ${userId}: ${error.message}`, 'AuthService', error);
    throw new AppError('Failed to retrieve user profile', 500, 'profile_fetch_error');
  }
};

module.exports = {
  getProfile
};
