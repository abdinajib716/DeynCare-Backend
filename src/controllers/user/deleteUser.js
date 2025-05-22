const UserService = require('../../services/userService');
const { 
  AppError, 
  ResponseHelper, 
  LogHelper, 
  logError 
} = require('../../utils');

/**
 * Delete user (SuperAdmin can delete any user except other superAdmins)
 * DELETE /api/users/:userId
 * Requires authentication and appropriate authorization
 */
const deleteUser = async (req, res, next) => {
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
};

module.exports = deleteUser;
