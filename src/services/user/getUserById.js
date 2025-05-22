const { AppError, UserHelper, logError } = require('../../utils');

/**
 * Get user by ID
 * @param {string} userId - ID of the user to retrieve
 * @param {Object} options - Additional options
 * @param {boolean} [options.sanitize=false] - Whether to sanitize the user data
 * @param {boolean} [options.includeInactive=false] - Whether to include inactive users
 * @param {mongoose.ClientSession} [options.session] - MongoDB session for transactions
 * @returns {Promise<Object>} User object
 * @throws {AppError} If user not found or retrieval fails
 */
const getUserById = async (userId, options = {}) => {
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
};

module.exports = getUserById;
