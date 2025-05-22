const UserService = require('../../services/userService');
const ShopService = require('../../services/shopService');
const { 
  AppError, 
  ResponseHelper, 
  LogHelper, 
  logError 
} = require('../../utils');

/**
 * Create new user (SuperAdmin can create users for any shop)
 * POST /api/users
 * Requires authentication and superAdmin authorization
 */
const createUser = async (req, res, next) => {
  try {
    const userData = req.validatedData || req.body;
    
    // Validate shop requirements based on role
    if (userData.role === 'superAdmin') {
      // superAdmin users can operate without a shop
      // No validation needed - the service will set shopId to null
      // If a shopId is provided, we'll keep it, but it's not required
    } else if (['admin', 'employee'].includes(userData.role)) {
      // Admin and employee must have a valid shop
      if (!userData.shopId) {
        return next(new AppError('Shop ID is required for admin and employee roles', 400, 'validation_error'));
      }
      
      // Verify the shop exists
      const shop = await ShopService.getShopById(userData.shopId);
      if (!shop) {
        return next(new AppError('Shop not found', 404, 'shop_not_found'));
      }
      
      // If actor is admin, they can only create employees for their own shop
      if (req.user.role === 'admin' && userData.role === 'employee' && req.user.shopId !== userData.shopId) {
        return next(new AppError('Admin users can only create employees for their own shop', 403, 'forbidden'));
      }
    }
    
    // Set creation options
    const options = {
      actorId: req.user.userId,
      actorRole: req.user.role,
      createdBy: 'admin'
    };
    
    // Create the user
    const user = await UserService.createUser(userData, options);
    
    // Log the creation
    await LogHelper.createAdminLog('create_user', {
      actorId: req.user.userId,
      actorRole: req.user.role,
      targetId: user.userId,
      details: {
        userRole: user.role,
        shopId: user.shopId || 'none'
      }
    });
    
    // Return successful response
    return ResponseHelper.success(res, 'User created successfully', {
      user: UserService.sanitizeUserForResponse(user)
    }, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    logError('Error creating user', 'UserController', error);
    return next(new AppError('Failed to create user', 500, 'user_creation_error'));
  }
};

module.exports = createUser;
