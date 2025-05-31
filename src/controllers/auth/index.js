/**
 * DeynCare Authentication Controller Architecture
 * 
 * @module auth/index
 * @description 
 * This file aggregates all the auth controllers for easy import. The authentication system
 * follows a modular architecture where each domain of authentication is handled by a
 * specialized controller module:
 * 
 * - registrationController: User and employee registration operations
 * - verificationController: Email verification processes
 * - authenticationController: Login, logout, and token management
 * - passwordController: Password reset and change operations
 * - profileController: User profile operations and email checking
 *
 * This modular approach offers several benefits:
 * - Clear separation of concerns
 * - Easier maintenance and testing
 * - Better code organization
 * - Simplified onboarding for new developers
 * - Consistent route handling patterns
 *
 * @example
 * // Import all auth controllers
 * const authControllers = require('./controllers/auth');
 * 
 * // Or import specific controllers directly
 * const { verifyEmail, resendVerification } = require('./controllers/auth');
 * 
 * // Or import the entire controller module
 * const { verificationController } = require('./controllers/auth');
 * 
 * @version 2.0.0
 * @since 2025-05-28
 */

// Import all controllers from their dedicated files
const { register, createEmployee } = require('./registrationController');
const { verifyEmail, resendVerification } = require('./verificationController');
const { login, refreshToken, logout, logoutAll } = require('./authenticationController');
const { forgotPassword, resetPassword, changePassword } = require('./passwordController');
const { getProfile, checkEmailExists } = require('./profileController');

// Also import the entire controller modules for direct access
const registrationController = require('./registrationController');
const verificationController = require('./verificationController');
const authenticationController = require('./authenticationController');
const passwordController = require('./passwordController');
const profileController = require('./profileController');

/**
 * @typedef {Object} AuthControllers
 * @property {Function} register - Register a new user with shop
 * @property {Function} createEmployee - Create a new employee user
 * @property {Function} verifyEmail - Verify user email with verification code
 * @property {Function} resendVerification - Resend verification code
 * @property {Function} login - Authenticate user login
 * @property {Function} refreshToken - Refresh access token
 * @property {Function} logout - Logout user session
 * @property {Function} logoutAll - Logout from all devices
 * @property {Function} forgotPassword - Initiate forgot password process
 * @property {Function} resetPassword - Reset password with token
 * @property {Function} changePassword - Change password (authenticated user)
 * @property {Function} getProfile - Get user profile
 * @property {Function} checkEmailExists - Check if an email exists
 * @property {Object} registrationController - Direct access to registration controller
 * @property {Object} verificationController - Direct access to verification controller
 * @property {Object} authenticationController - Direct access to authentication controller
 * @property {Object} passwordController - Direct access to password controller
 * @property {Object} profileController - Direct access to profile controller
 */

/**
 * Authentication controllers exported as a unified module
 * @type {AuthControllers}
 */
module.exports = {
  // Individual controller functions
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
  checkEmailExists,
  
  // Direct access to controller modules
  registrationController,
  verificationController,
  authenticationController,
  passwordController,
  profileController
};
