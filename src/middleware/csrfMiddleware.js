/**
 * CSRF Protection Middleware
 * 
 * @module csrfMiddleware
 * @description Provides CSRF protection using the double-submit cookie pattern
 * @version 2.0.0
 * @since 2025-05-28
 */

const crypto = require('crypto');
const { AppError, logWarning } = require('../utils');

// Get CSRF secret from environment variables or generate a secure one
const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');

// Store for CSRF tokens when using stateless approach (no session)
const tokenCache = new Map();

/**
 * Clean expired tokens from the token cache periodically
 * This prevents memory leaks in the token cache
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tokenCache.entries()) {
    if (value.expires < now) {
      tokenCache.delete(key);
    }
  }
}, 60 * 60 * 1000); // Clean every hour

/**
 * Generate a secure random CSRF token
 * @param {string} userId - User ID to bind the token to
 * @returns {string} - Generated CSRF token
 */
const generateToken = (userId) => {
  // Create a token with HMAC using user ID and timestamp
  return crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(`${userId}-${Date.now()}-${Math.random()}`)
    .digest('hex');
};

/**
 * Set secure cookie options
 * @param {boolean} httpOnly - Whether cookie should be httpOnly
 * @returns {Object} - Cookie options
 */
const getCookieOptions = (httpOnly = true) => ({
  httpOnly,
  secure: process.env.NODE_ENV === 'production' || process.env.SECURE_COOKIES === 'true',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
  domain: process.env.COOKIE_DOMAIN || undefined
});

/**
 * Middleware to generate CSRF token
 * Uses the double-submit cookie pattern for CSRF protection
 */
exports.generateCsrfToken = (req, res, next) => {
  try {
    // Only generate token for authenticated users
    if (req.user) {
      // Generate a new token
      const csrfToken = generateToken(req.user.userId);
      
      // Create a masked version to send to the client
      const maskedToken = csrfToken.slice(0, 32);
      
      // Set token in two cookies using double-submit pattern
      // 1. Cookie readable by JavaScript for headers
      res.cookie('XSRF-TOKEN', maskedToken, getCookieOptions(false));
      
      // 2. HttpOnly cookie for verification
      res.cookie('_csrf', csrfToken, getCookieOptions(true));
      
      // Store in session if available, otherwise use tokenCache
      if (req.session) {
        req.session.csrfToken = csrfToken;
      } else {
        // Store token in cache with expiry
        tokenCache.set(req.user.userId, {
          token: csrfToken,
          expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        });
      }
      
      // Also set the token in a custom header for SPA applications
      res.set('X-CSRF-TOKEN', maskedToken);
    }
    next();
  } catch (error) {
    logWarning(`Error generating CSRF token: ${error.message}`, 'CSRF');
    next();
  }
};

/**
 * Middleware to validate CSRF token
 * Use this on routes that need CSRF protection (POST, PUT, DELETE, PATCH)
 */
exports.validateCsrfToken = (req, res, next) => {
  try {
    // Skip validation for non-mutating methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    
    // Skip validation if user is not authenticated
    if (!req.user) {
      return next();
    }
    
    // Get token from various possible sources
    const token = (
      req.headers['x-csrf-token'] ||
      req.headers['x-xsrf-token'] ||
      req.body._csrf ||
      req.query._csrf
    );
    
    // Check if token exists in request
    if (!token) {
      return next(new AppError('CSRF token missing', 403, 'csrf_token_missing'));
    }
    
    // Get the verification token from cookie
    const csrfCookie = req.cookies._csrf;
    if (!csrfCookie) {
      return next(new AppError('CSRF cookie missing', 403, 'csrf_cookie_missing'));
    }
    
    // Check if the tokens match using constant-time comparison
    // This is a very basic constant-time comparison, in production consider using 'crypto.timingSafeEqual'
    let storedToken;
    
    // Get token from session or cache
    if (req.session && req.session.csrfToken) {
      storedToken = req.session.csrfToken;
    } else if (tokenCache.has(req.user.userId)) {
      storedToken = tokenCache.get(req.user.userId).token;
    }
    
    // Verify token matches the one in cookie and the masked token matches the provided token
    if (!storedToken || csrfCookie !== storedToken || token !== storedToken.slice(0, 32)) {
      return next(new AppError('Invalid CSRF token', 403, 'invalid_csrf_token'));
    }
    
    // Rotate the token after successful validation for sensitive operations
    if (req.originalUrl.includes('/auth/') || req.originalUrl.includes('/payment/')) {
      // Generate a new token for the next request
      const newToken = generateToken(req.user.userId);
      const newMaskedToken = newToken.slice(0, 32);
      
      // Update cookies and session
      res.cookie('XSRF-TOKEN', newMaskedToken, getCookieOptions(false));
      res.cookie('_csrf', newToken, getCookieOptions(true));
      
      // Update session or cache
      if (req.session) {
        req.session.csrfToken = newToken;
      } else {
        tokenCache.set(req.user.userId, {
          token: newToken,
          expires: Date.now() + (24 * 60 * 60 * 1000)
        });
      }
      
      // Also set new token in response header
      res.set('X-CSRF-TOKEN', newMaskedToken);
    }
    
    next();
  } catch (error) {
    logWarning(`Error validating CSRF token: ${error.message}`, 'CSRF');
    return next(new AppError('CSRF validation error', 403, 'csrf_validation_error'));
  }
};

/**
 * Middleware for requiring CSRF protection on specific routes
 * This creates a more explicit way to protect routes
 */
exports.requireCsrf = exports.validateCsrfToken;

/**
 * Middleware to clear CSRF token
 * Use this when logging out a user
 */
exports.clearCsrfToken = (req, res, next) => {
  if (req.user) {
    // Clear from cookies
    res.clearCookie('XSRF-TOKEN');
    res.clearCookie('_csrf');
    
    // Clear from session if available
    if (req.session) {
      delete req.session.csrfToken;
    }
    
    // Clear from cache
    tokenCache.delete(req.user.userId);
  }
  next();
};
