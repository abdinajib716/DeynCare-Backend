const { User } = require('../../models');
const { 
  AppError, 
  UserHelper, 
  PaginationHelper,
  logInfo, 
  logError 
} = require('../../utils');

/**
 * List users by shop ID
 * @param {string} shopId - Shop ID to list users for
 * @param {Object} query - Query parameters
 * @param {string} query.status - Filter by status
 * @param {string} query.role - Filter by role
 * @param {number} query.page - Page number
 * @param {number} query.limit - Items per page
 * @param {boolean} query.sanitize - Whether to sanitize user data
 * @returns {Promise<Object>} Users with pagination
 */
const listUsersByShop = async (shopId, query = {}) => {
  try {
    // Validate shop ID
    if (!shopId) {
      throw new AppError('Shop ID is required', 400, 'missing_shop_id');
    }
    
    const { status, role, sanitize = true } = query;
    
    // Build filter
    const filter = { shopId, isDeleted: false };
    if (status) filter.status = status;
    if (role) filter.role = role;

    // Get pagination options
    const paginationOptions = PaginationHelper.getPaginationOptions(query);
    
    // Add sorting and selection
    paginationOptions.sort = paginationOptions.sort || { createdAt: -1 };
    paginationOptions.select = '-password -resetPasswordToken -resetPasswordExpires -verificationCode -verificationCodeExpires';
    
    // Use PaginationHelper for consistent pagination
    const result = await PaginationHelper.paginate(User, filter, paginationOptions);
    
    // Sanitize user data if requested
    if (sanitize) {
      result.items = result.items.map(user => UserHelper.sanitizeUser(user));
    }
    
    // Log the listing operation for audit
    logInfo(`Listed ${result.items.length} users for shop: ${shopId}`, 'UserService');
    
    return {
      users: result.items,
      pagination: result.pagination
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logError(`Error listing users for shop ${shopId}: ${error.message}`, 'UserService', error);
    throw new AppError('Failed to list users', 500, 'user_list_error');
  }
};

module.exports = listUsersByShop;
