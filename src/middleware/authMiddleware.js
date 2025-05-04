const { User } = require('../models');
const TokenService = require('../services/tokenService');
const { AppError, logAuth, logWarning, logError } = require('../utils');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
exports.authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookies
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      // Extract token from Bearer header
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      // Extract token from cookies
      token = req.cookies.accessToken;
    }
    
    if (!token) {
      return next(new AppError('Authentication required', 401, 'auth_required'));
    }
    
    // Verify token
    const decoded = TokenService.verifyAccessToken(token);
    
    // Get user from database
    const user = await User.findOne({ 
      userId: decoded.userId,
      status: 'active',
      isDeleted: false,
      isSuspended: { $ne: true } // Explicitly exclude suspended users
    });
    
    if (!user) {
      logWarning(`User not found or inactive: ${decoded.userId}`, 'AuthMiddleware');
      return next(new AppError('User not found or inactive', 401, 'user_not_found'));
    }
    
    // Attach user to request
    req.user = user;
    logAuth(`Authenticated user: ${user.userId} (${user.role})`, 'AuthMiddleware');
    
    next();
  } catch (error) {
    if (error.type === 'token_expired') {
      return next(new AppError('Session expired, please login again', 401, 'token_expired'));
    }
    
    logError('Authentication error', 'AuthMiddleware', error);
    return next(new AppError('Authentication failed', 401, 'auth_failed'));
  }
};

/**
 * Authorization middleware for role-based access control
 * @param {string|string[]} roles - Allowed roles (string or array of strings)
 */
exports.authorize = (roles) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return next(new AppError('User not authenticated', 401, 'auth_required'));
      }

      // Safely get user role with validation
      const userRole = req.user.role;
      if (typeof userRole !== 'string') {
        console.error(`Invalid role type: ${typeof userRole}`, req.user);
        return next(new AppError('User has invalid role format', 500, 'server_error'));
      }
      
      // Ensure roles is an array
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      // Convert user role and required roles to lowercase for case-insensitive comparison
      const normalizedUserRole = userRole.toLowerCase();
      const normalizedRoles = allowedRoles.map(role => 
        typeof role === 'string' ? role.toLowerCase() : ''
      );
      
      // Debug logging
      console.log(`Authorization check - User role: ${userRole}, Required roles: ${JSON.stringify(allowedRoles)}`);
      console.log(`Normalized user role: ${normalizedUserRole}, Normalized allowed roles: ${JSON.stringify(normalizedRoles)}`);
      
      // Perform case-insensitive role check
      const hasAccess = normalizedRoles.includes(normalizedUserRole);
      console.log(`Access granted: ${hasAccess}`);
      
      if (!hasAccess) {
        logWarning(`Access denied for ${req.user.userId} (${userRole}) - Required roles: ${allowedRoles.join(', ')}`, 'AuthMiddleware');
        return next(new AppError('You do not have permission to perform this action', 403, 'forbidden'));
      }
      
      logAuth(`Authorized access for ${req.user.userId} (${userRole})`, 'AuthMiddleware');
      next();
    } catch (error) {
      console.error('Error in role authorization:', error);
      return next(new AppError('Server error during authorization', 500, 'server_error'));
    }
  };
};

/**
 * Middleware to check if user is verified
 */
exports.isVerified = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('User not authenticated', 401, 'auth_required'));
  }
  
  if (!req.user.verified) {
    logWarning(`Unverified user attempted access: ${req.user.userId}`, 'AuthMiddleware');
    return next(new AppError('Email verification required', 403, 'verification_required'));
  }
  
  next();
};

/**
 * Middleware to ensure shop access
 * Checks if user belongs to the requested shop
 */
exports.hasShopAccess = (req, res, next) => {
  const shopId = req.params.shopId || req.body.shopId || req.query.shopId;
  
  if (!shopId) {
    return next(new AppError('Shop ID is required', 400, 'missing_shop_id'));
  }
  
  // Super admins can access all shops
  if (req.user.role === 'superAdmin') {
    logAuth(`SuperAdmin accessing shop: ${shopId}`, 'AuthMiddleware');
    return next();
  }
  
  // Check if user belongs to this shop
  if (req.user.shopId !== shopId) {
    logWarning(`User ${req.user.userId} attempted to access unauthorized shop: ${shopId}`, 'AuthMiddleware');
    return next(new AppError('You do not have access to this shop', 403, 'forbidden'));
  }
  
  next();
};
