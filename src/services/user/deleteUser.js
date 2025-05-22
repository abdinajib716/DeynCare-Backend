const { AppError, UserHelper, LogHelper, logSuccess, logError } = require('../../utils');

/**
 * Soft delete user
 * @param {string} userId - ID of user to delete
 * @param {Object} options - Additional options
 * @param {string} [options.actorId='system'] - ID of actor deleting the user
 * @param {string} [options.actorRole='system'] - Role of actor deleting the user
 * @param {string} [options.reason] - Reason for deletion
 * @param {boolean} [options.anonymize=false] - Whether to anonymize user data
 * @returns {Promise<Object>} Success result
 * @throws {AppError} If deletion fails
 */
const deleteUser = async (userId, options = {}) => {
  try {
    // Find active user using UserHelper
    const user = await UserHelper.findActiveUser(userId);
    
    // Check if user can be deleted
    if (user.role === 'superAdmin' && options.actorRole !== 'superAdmin') {
      throw new AppError('Only superAdmins can delete superAdmin users', 403, 'forbidden_operation');
    }

    // Perform soft delete
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.status = 'inactive';
    
    // Anonymize sensitive data for GDPR compliance if requested
    if (options.anonymize) {
      user.email = `deleted_${userId}@anonymized.com`;
      user.phone = 'anonymized';
      // Don't anonymize the user's name by default, as it might be needed for audit purposes
    }
    
    await user.save();

    // Log the deletion using LogHelper
    await LogHelper.createUserLog(
      'user_deleted',
      userId,
      {
        actorId: options?.actorId || 'system',
        actorRole: options?.actorRole || 'system',
        shopId: user.shopId || null
      },
      {
        reason: options?.reason || 'not_specified',
        anonymized: !!options.anonymize
      }
    );
    
    logSuccess(`User soft deleted: ${user.userId}`, 'UserService');
    return { success: true, message: 'User deleted successfully' };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logError(`Error deleting user ${userId}: ${error.message}`, 'UserService', error);
    throw new AppError('Failed to delete user', 500, 'user_deletion_error');
  }
};

module.exports = deleteUser;
