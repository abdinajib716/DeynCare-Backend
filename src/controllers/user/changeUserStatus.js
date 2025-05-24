const UserService = require('../../services/userService');
const NotificationService = require('../../services/notificationService');
const { 
  AppError, 
  ResponseHelper, 
  LogHelper, 
  logError 
} = require('../../utils');
const _handleStatusChangeError = require('./_handleStatusChangeError');

/**
 * Validate permissions for status change
 * @param {Object} actor - The user performing the action
 * @param {Object} targetUser - The user being modified
 * @param {Function} next - Express next function
 * @returns {boolean} Whether permission is valid
 * @private
 */
const _validateStatusChangePermission = async (actor, targetUser, next) => {
  // Only superAdmin can change status for users from other shops
  if (actor.role !== 'superAdmin' && targetUser.shopId !== actor.shopId) {
    next(new AppError('You do not have permission to change status for this user', 403, 'forbidden'));
    return false;
  }
  
  // Only superAdmin can change status for an admin
  if (targetUser.role === 'admin' && actor.role !== 'superAdmin') {
    next(new AppError('Only superAdmins can change status for admin users', 403, 'forbidden'));
    return false;
  }
  
  // Prevent changing status of superAdmin by non-superAdmins
  if (targetUser.role === 'superAdmin' && actor.role !== 'superAdmin') {
    next(new AppError('Only superAdmins can change status for other superAdmins', 403, 'forbidden'));
    return false;
  }
  
  return true;
};

/**
 * Prepare data for status update
 * @param {string} status - New status
 * @param {string} reason - Reason for status change
 * @returns {Object} Update data object
 * @private
 */
const _prepareStatusUpdateData = (status, reason) => {
  const updateData = { status };
  
  // Handle suspension-specific updates
  if (status === 'suspended') {
    updateData.isSuspended = true;
    updateData.suspensionReason = reason;
  } else if (status === 'active') {
    // When reactivating, clear suspension flags
    updateData.isSuspended = false;
    updateData.suspensionReason = null;
  }
  
  return updateData;
};

/**
 * Change user status (SuperAdmin can change status for any user)
 * PATCH /api/users/:userId/status
 * Requires authentication and appropriate authorization
 */
const changeUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status, reason, sendEmail = true } = req.validatedData || req.body;
    
    console.log(`[UserController] Changing user ${userId} status to ${status} with sendEmail=${sendEmail}`);
    
    // Get the user to update
    const userToUpdate = await UserService.getUserById(userId, { sanitize: false });
    
    // Validate permissions - will call next(error) if permission denied
    const permissionValid = await _validateStatusChangePermission(req.user, userToUpdate, next);
    if (!permissionValid || res.headersSent) {
      return; // Permission validation failed and response was already sent
    }
    
    // For suspended status, require a reason
    if (status === 'suspended' && (!reason || reason.trim() === '')) {
      return next(new AppError('A reason must be provided when suspending a user', 400, 'reason_required'));
    }
    
    // Prepare update data
    const updateData = _prepareStatusUpdateData(status, reason);
    
    // Set update options
    const options = {
      actorId: req.user.userId,
      actorRole: req.user.role
    };
    
    // Update the user
    const updatedUser = await UserService.updateUser(userId, updateData, options);
    
    // Send notification asynchronously if sendEmail is true (don't await)
    if (sendEmail !== false) {
      NotificationService.sendStatusChangeNotification(userToUpdate, status, reason)
        .catch(error => logError(`Notification error: ${error.message}`, 'UserController', error));
    } else {
      logInfo(`Email notification skipped for user ${userId} status change to ${status}`, 'UserController');
    }
    
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
  } catch (error) {
    return _handleStatusChangeError(error, next, 'Failed to change user status');
  }
};

module.exports = changeUserStatus;
