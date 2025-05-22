const UserService = require('../../services/userService');
const { 
  AppError, 
  ResponseHelper, 
  LogHelper, 
  logError 
} = require('../../utils');

/**
 * Update user
 * PUT /api/users/:userId
 * Requires authentication and appropriate authorization
 */
const updateUser = async (req, res, next) => {
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
};

module.exports = updateUser;
