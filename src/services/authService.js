/**
 * AuthService - Main entry point
 * 
 * @module AuthService
 * @description A thin wrapper around the modular auth services to maintain backward compatibility with existing code.
 * @version 2.0.0
 * @author DeynCare Development Team
 * @since 2025-05-28
 * 
 * @example
 * // Import the entire auth service
 * const AuthService = require('./services/authService');
 * 
 * // Or import specific modules directly (recommended for new code)
 * const { verificationService } = require('./services/auth');
 */

// Import all services from the auth directory
const authServices = require('./auth');
const { logWarning } = require('../utils');

// Check if in development mode to show deprecation warnings
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Create a proxied function that logs deprecation warnings in development
 * @param {Function} fn - The original function
 * @param {string} name - Function name for the warning
 * @param {string} alternative - Suggested alternative import path
 * @returns {Function} - Wrapped function with deprecation warning
 */
const wrapWithDeprecationWarning = (fn, name, alternative) => {
  return async function(...args) {
    if (isDevelopment) {
      logWarning(
        `Deprecation warning: AuthService.${name} is accessed through the legacy wrapper. ` +
        `Consider importing directly: const { ${name} } = require('./services/auth/${alternative}')`,
        'AuthService'
      );
    }
    return fn.apply(this, args);
  };
};

/**
 * Service for handling auth-related operations
 * @namespace AuthService
 */
const AuthService = {
  /**
   * @function verifyEmail
   * @memberof AuthService
   * @description Verify user email with verification code
   * @param {string} email - User's email address
   * @param {string} code - Verification code sent to the user
   * @returns {Promise<Object>} Sanitized user data
   */
  verifyEmail: isDevelopment 
    ? wrapWithDeprecationWarning(authServices.verifyEmail, 'verifyEmail', 'verificationService') 
    : authServices.verifyEmail,
  
  /**
   * @function resendVerification
   * @memberof AuthService
   * @description Resend verification code to user
   * @param {string} email - User's email address
   * @returns {Promise<Object>} Success message
   */
  resendVerification: isDevelopment
    ? wrapWithDeprecationWarning(authServices.resendVerification, 'resendVerification', 'verificationService')
    : authServices.resendVerification,
  
  /**
   * @function login
   * @memberof AuthService
   * @description Authenticate user login
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @param {string} [deviceName='Unknown Device'] - Name of the device being used
   * @param {string} [ip=''] - IP address of the request
   * @returns {Promise<Object>} User data and authentication tokens
   */
  login: isDevelopment
    ? wrapWithDeprecationWarning(authServices.login, 'login', 'authenticationService')
    : authServices.login,
  
  /**
   * @function refreshToken
   * @memberof AuthService
   * @description Refresh access token using refresh token
   * @param {string} refreshToken - Valid refresh token
   * @returns {Promise<Object>} New access token
   */
  refreshToken: isDevelopment
    ? wrapWithDeprecationWarning(authServices.refreshToken, 'refreshToken', 'authenticationService')
    : authServices.refreshToken,
  
  /**
   * @function logout
   * @memberof AuthService
   * @description Logout user session
   * @param {string} refreshToken - Refresh token to invalidate
   * @returns {Promise<Object>} Success message
   */
  logout: isDevelopment
    ? wrapWithDeprecationWarning(authServices.logout, 'logout', 'authenticationService')
    : authServices.logout,
  
  /**
   * @function logoutAll
   * @memberof AuthService
   * @description Logout from all devices
   * @param {string} userId - User ID to logout from all sessions
   * @returns {Promise<Object>} Success message and count of sessions revoked
   */
  logoutAll: isDevelopment
    ? wrapWithDeprecationWarning(authServices.logoutAll, 'logoutAll', 'authenticationService')
    : authServices.logoutAll,
  
  /**
   * @function forgotPassword
   * @memberof AuthService
   * @description Initiate forgot password process
   * @param {string} email - User's email address
   * @returns {Promise<Object>} Success message (always returns success for security)
   */
  forgotPassword: isDevelopment
    ? wrapWithDeprecationWarning(authServices.forgotPassword, 'forgotPassword', 'passwordService')
    : authServices.forgotPassword,
  
  /**
   * @function resetPassword
   * @memberof AuthService
   * @description Reset password with token
   * @param {string} token - Password reset token
   * @param {string} newPassword - New password to set
   * @returns {Promise<Object>} Success message and user data
   */
  resetPassword: isDevelopment
    ? wrapWithDeprecationWarning(authServices.resetPassword, 'resetPassword', 'passwordService')
    : authServices.resetPassword,
  
  /**
   * @function changePassword
   * @memberof AuthService
   * @description Change password (authenticated user)
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password for verification
   * @param {string} newPassword - New password to set
   * @returns {Promise<Object>} Success message
   */
  changePassword: isDevelopment
    ? wrapWithDeprecationWarning(authServices.changePassword, 'changePassword', 'passwordService')
    : authServices.changePassword,
  
  /**
   * @function getProfile
   * @memberof AuthService
   * @description Get user profile
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Sanitized user profile data
   */
  getProfile: isDevelopment
    ? wrapWithDeprecationWarning(authServices.getProfile, 'getProfile', 'profileService')
    : authServices.getProfile
  
  // Note: _logResetTokenDebug has been moved to DebugHelper.logResetTokenDebug
};

module.exports = AuthService;