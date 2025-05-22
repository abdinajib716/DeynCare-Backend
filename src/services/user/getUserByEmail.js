const { AppError, UserHelper, logError } = require('../../utils');

/**
 * Get user by email
 * @param {string} email - Email to find
 * @param {Object} options - Additional options
 * @param {boolean} [options.sanitize=false] - Whether to sanitize the user data
 * @param {boolean} [options.includeInactive=false] - Whether to include inactive users
 * @param {boolean} [options.throwIfNotFound=true] - Whether to throw if not found
 * @param {mongoose.ClientSession} [options.session] - MongoDB session for transactions
 * @returns {Promise<Object|null>} User object or null
 * @throws {AppError} If user not found and throwIfNotFound is true
 */
const getUserByEmail = async (email, options = {}) => {
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
};

module.exports = getUserByEmail;
