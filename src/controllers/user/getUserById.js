const UserService = require('../../services/userService');
const { AppError, ResponseHelper } = require('../../utils');

/**
 * Get user by ID
 * GET /api/users/:userId
 * Requires authentication and appropriate authorization
 */
const getUserById = async (req, res, next) => {
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
      sanitizedUser = await UserService.populateShopNames(sanitizedUser);
    }
    
    return ResponseHelper.success(res, 'User retrieved successfully', {
      user: sanitizedUser
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = getUserById;
