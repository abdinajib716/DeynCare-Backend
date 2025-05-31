/**
 * Rate Limiting Middleware Configurations
 * 
 * @module rateLimiters
 * @description Provides centralized rate limiting strategies to protect API endpoints from abuse
 * @version 2.0.0
 * @since 2025-05-28
 */

const rateLimit = require('express-rate-limit');
const { ErrorResponse, AppError } = require('../utils');

// Initialize Redis store if Redis URL is provided
let redisStore;

// Get Redis URL from environment variable
const redisUrl = process.env.REDIS_URL;

// Only attempt to use Redis if it's available
let Redis;
try {
  // Try to load the Redis module
  Redis = require('ioredis').Redis;
  
  // Initialize Redis if URL exists
  try {
    if (redisUrl) {
      const RedisStore = require('rate-limit-redis');
      const redisClient = new Redis(redisUrl);
      
      redisClient.on('error', (err) => {
        console.error('Redis error:', err);
      });
      
      redisStore = new RedisStore({
        // @ts-ignore - Known compatibility issue with types
        sendCommand: (...args) => redisClient.call(...args),
        prefix: 'rl:'
      });
      
      console.log('Redis store initialized for rate limiting');
    }
  } catch (configError) {
    console.error('Failed to initialize Redis store:', configError);
    console.log('Falling back to memory store for rate limiting');
  }
} catch (moduleError) {
  // Redis module not available - simply skip Redis initialization
  console.log('Redis module not available, using memory store for rate limiting');
}

/**
 * Creates a standard error response for rate limiting
 * @param {string} endpoint - The endpoint being rate limited
 * @param {number} retryAfterSeconds - Seconds until retry is allowed
 * @returns {Object} Standardized error response
 */
const createRateLimitResponse = (endpoint, retryAfterSeconds) => ({
  status: 429,
  success: false,
  message: `Rate limit exceeded for ${endpoint}. Please try again later.`,
  error: {
    code: 'rate_limit_exceeded',
    retryAfter: retryAfterSeconds,
    details: `Too many requests. Try again after ${retryAfterSeconds} seconds.`
  }
});

/**
 * Base options for all rate limiters
 */
const baseOptions = {
  standardHeaders: true, // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
  store: redisStore, // Will fall back to memory store if redisStore is undefined
};

/**
 * General API rate limiter
 * Applied to all API routes with reasonable limits
 */
const apiLimiter = rateLimit({
  ...baseOptions,
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per window
  handler: (req, res, next, options) => {
    const response = createRateLimitResponse('API', Math.ceil(options.windowMs / 1000));
    res.status(429).json(response);
  }
});

/**
 * Stricter rate limiter for login endpoints
 * Helps prevent brute force attacks
 */
const loginLimiter = rateLimit({
  ...baseOptions,
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 5, // 5 attempts per window
  skipSuccessfulRequests: true, // Only count failed attempts
  handler: (req, res, next, options) => {
    const response = createRateLimitResponse('login', Math.ceil(options.windowMs / 1000));
    res.status(429).json(response);
  }
});

/**
 * Rate limiter for password reset endpoints
 * Prevents abuse of the password reset functionality
 */
const passwordResetLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_MAX) || 3, // 3 attempts per hour
  handler: (req, res, next, options) => {
    const response = createRateLimitResponse('password reset', Math.ceil(options.windowMs / 1000));
    res.status(429).json(response);
  }
});

/**
 * Rate limiter for verification endpoints
 * Prevents abuse of the verification system
 */
const verificationLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.VERIFICATION_RATE_LIMIT_MAX) || 5, // 5 attempts per window
  handler: (req, res, next, options) => {
    const response = createRateLimitResponse('verification', Math.ceil(options.windowMs / 1000));
    res.status(429).json(response);
  }
});

/**
 * Generic auth limiter for other auth-related endpoints
 * Applied to sensitive endpoints not covered by specific limiters
 */
const authLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10, // 10 attempts per window
  skipSuccessfulRequests: true, // Only count failed attempts
  handler: (req, res, next, options) => {
    const response = createRateLimitResponse('authentication', Math.ceil(options.windowMs / 1000));
    res.status(429).json(response);
  }
});

/**
 * More restrictive limiter for extremely sensitive operations
 * Applied to critical operations like user creation, shop management for SuperAdmins
 */
const superAdminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 operations per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    success: false,
    error: {
      message: 'Rate limit exceeded for SuperAdmin operations. Please try again later.',
      statusCode: 429,
      type: 'admin_rate_limit_exceeded'
    }
  }
});

/**
 * Apply rate limiters to specific routes
 * @param {Object} app - Express application
 */
const applyRateLimiters = (app) => {
  // Apply general rate limiting to all API routes
  app.use('/api', apiLimiter);
  
  // Apply specialized rate limiting to authentication endpoints
  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth/forgot-password', passwordResetLimiter);
  app.use('/api/auth/reset-password', passwordResetLimiter);
  app.use('/api/auth/change-password', passwordResetLimiter);
  
  // Apply verification rate limits
  app.use('/api/auth/verify-email', verificationLimiter);
  app.use('/api/auth/resend-verification', verificationLimiter);
  
  // Apply generic auth limiter to other auth endpoints
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/refresh-token', authLimiter);
  app.use('/api/auth/logout', authLimiter);
  app.use('/api/auth/logout-all', authLimiter);
  app.use('/api/auth/check-email', authLimiter);
  
  // Apply SuperAdmin-specific rate limits
  app.use('/api/users/create', superAdminLimiter);
  app.use('/api/shops/create', superAdminLimiter);
  app.use('/api/users/admin', superAdminLimiter);
  app.use('/api/subscriptions', superAdminLimiter);
};

/**
 * Factory function to create a custom rate limiter
 * @param {Object} options - Custom rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests in the window
 * @param {string} options.endpointName - Name of the endpoint for error messages
 * @param {boolean} options.skipSuccessfulRequests - Whether to skip counting successful requests
 * @returns {Function} Express middleware function
 */
const createCustomLimiter = (options) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 10,
    endpointName = 'API',
    skipSuccessfulRequests = false
  } = options;
  
  return rateLimit({
    ...baseOptions,
    windowMs,
    max,
    skipSuccessfulRequests,
    handler: (req, res, next, options) => {
      const response = createRateLimitResponse(endpointName, Math.ceil(options.windowMs / 1000));
      res.status(429).json(response);
    }
  });
};

module.exports = {
  // Pre-configured limiters
  apiLimiter,
  authLimiter,
  loginLimiter,
  passwordResetLimiter,
  verificationLimiter,
  superAdminLimiter,
  
  // Factory function for creating custom limiters
  createCustomLimiter,
  
  // Rate limiter application function
  applyRateLimiters
};
