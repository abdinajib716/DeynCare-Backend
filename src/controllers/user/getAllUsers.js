const { User } = require('../../models');
const UserService = require('../../services/userService');
const { 
  AppError, 
  ResponseHelper, 
  LogHelper,
  logError 
} = require('../../utils');

/**
 * Get all users (SuperAdmin only)
 * GET /api/users
 * Requires authentication and superAdmin authorization
 */
const getAllUsers = async (req, res, next) => {
  try {
    // Extract query parameters
    const { 
      page = 1, 
      limit = 10, 
      status, 
      role, 
      shopId,
      search
    } = req.query;

    // Create filter object
    const filter = { isDeleted: false };
    
    // Add optional filters - only if they're valid values (not 'undefined' strings)
    if (status && status !== 'undefined') filter.status = status;
    if (role && role !== 'undefined') filter.role = role;
    if (shopId && shopId !== 'undefined') filter.shopId = shopId;
    
    // Add search filter if provided
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Get pagination options
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: -1 },
      select: '-password -resetPasswordToken -resetPasswordExpires -verificationCode'
    };

    // Get users with pagination (User model already initialized above)
    const result = await User.paginate(filter, options);
    
    // Map users to remove sensitive information and populate shop names
    let sanitizedUsers = await Promise.all(
      result.docs.map(user => UserService.sanitizeUserForResponse(user))
    );
    
    // Use the service method to populate shop names for all users at once
    sanitizedUsers = await UserService.populateShopNames(sanitizedUsers);
    
    // Log the request for audit purposes
    await LogHelper.createAdminLog('list_all_users', {
      actorId: req.user.userId,
      actorRole: req.user.role,
      details: { filters: req.query }
    });

    // Return successful response with data
    return ResponseHelper.success(res, 'Users retrieved successfully', {
      users: sanitizedUsers,
      pagination: {
        totalDocs: result.totalDocs,
        limit: result.limit,
        totalPages: result.totalPages,
        page: result.page,
        hasPrevPage: result.hasPrevPage,
        hasNextPage: result.hasNextPage,
        prevPage: result.prevPage,
        nextPage: result.nextPage
      }
    });
  } catch (error) {
    logError('Error getting all users', 'UserController', error);
    return next(error);
  }
};

module.exports = getAllUsers;
