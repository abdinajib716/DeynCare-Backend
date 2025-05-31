/**
 * DeynCare Authentication Service Architecture
 * 
 * @module auth/index
 * @description 
 * This file aggregates all the auth services for easy import. The authentication system
 * follows a modular architecture where each domain of authentication is handled by a
 * specialized service module:
 * 
 * - verificationService: Email verification operations
 * - authenticationService: Login, session, and token management
 * - passwordService: Password reset, recovery, and change operations
 * - profileService: User profile data retrieval and management
 *
 * This modular approach offers several benefits:
 * - Clear separation of concerns
 * - Easier maintenance and testing
 * - Better code organization
 * - Simplified onboarding for new developers
 *
 * @example
 * // Import all auth services
 * const authServices = require('./services/auth');
 * 
 * // Or import specific services directly
 * const { verifyEmail, resendVerification } = require('./services/auth');
 * 
 * @version 2.0.0
 * @since 2025-05-28
 */

// Import individual services to expose their functions
const { verifyEmail, resendVerification } = require('./verificationService');
const { login, refreshToken, logout, logoutAll } = require('./authenticationService');
const { forgotPassword, resetPassword, changePassword } = require('./passwordService');
const { getProfile } = require('./profileService');

// Also export the service modules themselves for direct access
const verificationService = require('./verificationService');
const authenticationService = require('./authenticationService');
const passwordService = require('./passwordService');
const profileService = require('./profileService');

/**
 * @typedef {Object} AuthServices
 * @property {Function} verifyEmail - Verify a user's email with a verification code
 * @property {Function} resendVerification - Resend a verification code to a user
 * @property {Function} login - Authenticate a user and generate tokens
 * @property {Function} refreshToken - Generate a new access token using a refresh token
 * @property {Function} logout - End a user session by invalidating a refresh token
 * @property {Function} logoutAll - End all sessions for a user
 * @property {Function} forgotPassword - Initiate the password reset process
 * @property {Function} resetPassword - Reset a password using a token
 * @property {Function} changePassword - Change a password for an authenticated user
 * @property {Function} getProfile - Retrieve a user's profile
 * @property {Object} verificationService - Direct access to the verification service module
 * @property {Object} authenticationService - Direct access to the authentication service module
 * @property {Object} passwordService - Direct access to the password service module
 * @property {Object} profileService - Direct access to the profile service module
 */

/**
 * Authentication services exported as a unified module
 * @type {AuthServices}
 */
module.exports = {
  // Individual authentication functions
  // Verification services
  verifyEmail,
  resendVerification,
  
  // Authentication services
  login,
  refreshToken,
  logout,
  logoutAll,
  
  // Password services
  forgotPassword,
  resetPassword,
  changePassword,
  
  // Profile services
  getProfile,
  
  // Direct access to service modules
  verificationService,
  authenticationService,
  passwordService,
  profileService
};
