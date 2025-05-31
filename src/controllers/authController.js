/**
 * Authentication Controller
 * 
 * @module AuthController
 * @description
 * This file serves as the main entry point for all authentication-related operations.
 * It has been refactored to import controllers from subdirectories for better code organization.
 * 
 * Each controller group is responsible for a specific set of related operations:
 * - Registration: User and employee registration
 * - Verification: Email verification processes
 * - Authentication: Login, logout, token management
 * - Password: Password reset and change operations
 * - Profile: User profile operations
 *
 * @version 2.0.0
 * @author DeynCare Development Team
 * @since 2025-05-28
 *
 * @example
 * // Import the entire auth controller
 * const AuthController = require('./controllers/authController');
 *
 * // Or import specific controllers directly (recommended for new code)
 * const { registrationController } = require('./controllers/auth');
 */

// Import all controllers from the auth/ directory
const {
  // Registration controllers
  register,
  createEmployee,
  
  // Verification controllers
  verifyEmail,
  resendVerification,
  
  // Authentication controllers
  login,
  refreshToken,
  logout,
  logoutAll,
  
  // Password controllers
  forgotPassword,
  resetPassword,
  changePassword,
  
  // Profile controllers
  getProfile,
  checkEmailExists
} = require('./auth');

// Check if in development mode to show deprecation warnings
const { logWarning } = require('../utils');
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Authentication controller for handling all auth-related operations
 * @namespace AuthController
 */
const AuthController = {
  /**
   * Register a new user with shop
   * @function register
   * @memberof AuthController
   * @async
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @route POST /api/auth/register
   * @returns {Object} New user data and tokens
   */
  register,

  /**
   * Create a new employee user by an admin
   * @function createEmployee
   * @memberof AuthController
   * @async
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @route POST /api/auth/create-employee
   * @authentication Required
   * @authorization Admin only
   * @returns {Object} New employee data
   */
  createEmployee,

  /**
   * Verify email with verification code
   * @function verifyEmail
   * @memberof AuthController
   * @async
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @route POST /api/auth/verify-email
   * @returns {Object} Verification status
   */
  verifyEmail,

  /**
   * Resend verification code
   * @function resendVerification
   * @memberof AuthController
   * @async
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @route POST /api/auth/resend-verification
   * @returns {Object} Status message
   */
  resendVerification,

  /**
   * User login
   * @function login
   * @memberof AuthController
   * @async
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @route POST /api/auth/login
   * @returns {Object} User data and authentication tokens
   */
  login,

  /**
   * Refresh access token using refresh token
   * @function refreshToken
   * @memberof AuthController
   * @async
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @route POST /api/auth/refresh-token
   * @returns {Object} New access token
   */
  refreshToken,

  /**
   * User logout
   * @function logout
   * @memberof AuthController
   * @async
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @route POST /api/auth/logout
   * @returns {Object} Success status
   */
  logout,

  /**
   * Logout from all devices
   * @function logoutAll
   * @memberof AuthController
   * @async
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @route POST /api/auth/logout-all
   * @authentication Required
   * @returns {Object} Success status and count of sessions terminated
   */
  logoutAll,

  /**
   * Forgot password
   * @function forgotPassword
   * @memberof AuthController
   * @async
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @route POST /api/auth/forgot-password
   * @returns {Object} Success message (always returns success for security)
   */
  forgotPassword,

  /**
   * Reset password
   * @function resetPassword
   * @memberof AuthController
   * @async
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @route POST /api/auth/reset-password
   * @returns {Object} Success status
   */
  resetPassword,

  /**
   * Change password (authenticated)
   * @function changePassword
   * @memberof AuthController
   * @async
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @route POST /api/auth/change-password
   * @authentication Required
   * @returns {Object} Success status
   */
  changePassword,

  /**
   * Get current user profile
   * @function getProfile
   * @memberof AuthController
   * @async
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @route GET /api/auth/me
   * @authentication Required
   * @returns {Object} User profile data
   */
  getProfile,

  /**
   * Check if an email already exists
   * @function checkEmailExists
   * @memberof AuthController
   * @async
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   * @route POST /api/auth/check-email
   * @returns {Object} Email existence status
   */
  checkEmailExists
};

module.exports = AuthController;