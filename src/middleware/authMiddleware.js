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
      isDeleted: false
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
 * @param {...string} roles - Allowed roles
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('User not authenticated', 401, 'auth_required'));
    }
    
    if (!roles.includes(req.user.role)) {
      logWarning(`Access denied for ${req.user.userId} (${req.user.role}) - Required roles: ${roles.join(', ')}`, 'AuthMiddleware');
      return next(new AppError('You do not have permission to perform this action', 403, 'forbidden'));
    }
    
    logAuth(`Authorized access for ${req.user.userId} (${req.user.role})`, 'AuthMiddleware');
    next();
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
