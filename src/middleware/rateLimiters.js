/**
 * Rate limiting middleware configurations
 * Provides centralized rate limiting strategies for different API endpoints
 */
const rateLimit = require('express-rate-limit');
const { ErrorResponse } = require('../utils');

/**
 * General API rate limiter
 * Applied to all API routes with reasonable limits
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
  message: {
    status: 429,
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

/**
 * Stricter rate limiter for authentication endpoints
 * Applied to sensitive endpoints like login, password reset, etc.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again after 15 minutes',
      statusCode: 429,
      type: 'rate_limit_exceeded'
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
  
  // Apply stricter rate limiting to sensitive auth endpoints
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);
  app.use('/api/auth/reset-password', authLimiter);
};

module.exports = {
  apiLimiter,
  authLimiter,
  applyRateLimiters
};
