const { User, Session } = require('../models');
const TokenService = require('./tokenService');
const EmailService = require('./emailService');
const crypto = require('crypto');

// Import utility modules from restructured directory
const { 
  // Core utilities
  AppError,
  ErrorResponse,
  
  // Generator utilities
  generateVerificationCode,
  calculateExpiry,
  
  // Helper utilities
  TokenHelper,
  UserHelper,
  LogHelper,
  ResponseHelper,
  DebugHelper,
  
  // Logger utilities
  logInfo,
  logSuccess,
  logWarning,
  logError
} = require('../utils');

/**
 * Service for handling auth-related operations
 */
const AuthService = {
  /**
   * Verify user email with verification code
   */
  verifyEmail: async (email, code) => {
    try {
      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase();

      // Find user by email with matching code and unexpired code
      // Use $or to handle both undefined expiry and valid expiry dates
      const user = await User.findOne({
        email: normalizedEmail,
        status: { $in: ['pending', 'active', 'inactive'] },
        verified: false,
        isDeleted: false,
        verificationCode: code,
        $or: [
          { verificationCodeExpires: { $exists: false } },  // No expiry set
          { verificationCodeExpires: null },                // Null expiry
          { verificationCodeExpires: { $gt: new Date() } }  // Valid expiry
        ]
      });

      if (!user) {
        logWarning(`Invalid verification attempt for email: ${email}`, 'AuthService');
        throw new AppError('Invalid or expired verification code', 400, 'invalid_code');
      }

      // Mark user as verified and active
      user.verified = true;
      user.emailVerified = true;
      user.verifiedAt = new Date();
      user.status = 'active';
      user.verificationCode = undefined;
      user.verificationCodeExpires = undefined;
      
      await user.save();
      
      // If user is a shop admin, also verify the shop
      if (user.role === 'admin' && user.shopId) {
        try {
          // Import Shop model
          const { Shop } = require('../models');
          
          // Use direct update to ensure it works reliably
          const updateResult = await Shop.updateOne(
            { shopId: user.shopId },
            { 
              $set: {
                verified: true,
                verificationDetails: {
                  verifiedAt: new Date(),
                  verifiedBy: user.userId,
                  verificationMethod: 'email'
                },
                'updatedAt': new Date()
              }
            }
          );
          
          if (updateResult.modifiedCount > 0) {
            logSuccess(`Shop ${user.shopId} verified along with owner ${user.userId}`, 'AuthService');
            
            // Log the shop verification
            await LogHelper.createShopLog(
              'shop_verified', 
              user.shopId, 
              {
                actorId: user.userId,
                actorRole: user.role
              },
              { method: 'email_verification' }
            );
          } else {
            logWarning(`Shop ${user.shopId} not found or already verified`, 'AuthService');
          }
        } catch (shopError) {
          // Don't fail user verification if shop verification fails
          logError(`Failed to verify shop for user ${user.userId}: ${shopError.message}`, 'AuthService', shopError);
        }
      }
      
      // Log the verification success
      await LogHelper.createAuthLog('email_verified', {
        actorId: user.userId,
        targetId: user.userId,
        actorRole: user.role,
        shopId: user.shopId || null,
        details: { email: user.email }
      });
      
      logSuccess(`User verified: ${user.userId} (${user.email})`, 'AuthService');

      // Return sanitized user data
      return UserHelper.sanitizeUser(user);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logError(`Verification error: ${error.message}`, 'AuthService', error);
      throw new AppError('Error during verification process', 500, 'verification_error');
    }
  },

  /**
   * Resend verification code to user
   */
  resendVerification: async (email) => {
    try {
      // Find user by email
      const normalizedEmail = email.toLowerCase();
      const user = await User.findOne({ 
        email: normalizedEmail,
        status: { $in: ['pending', 'active', 'inactive'] },
        verified: false,
        isDeleted: false
      });

      // For security, we always return the same message whether the user exists or not
      const securityMessage = { 
        success: true, 
        message: 'If your email is registered and not verified, you will receive a new verification code.'
      };

      if (!user) {
        // Log attempt for security monitoring
        logInfo(`Verification code requested for non-existent/already verified user: ${email}`, 'AuthService');
        return securityMessage;
      }

      // Generate new verification code
      const newVerificationCode = generateVerificationCode(6);
      user.verificationCode = newVerificationCode;
      user.verificationCodeExpires = calculateExpiry(24); // 24 hours
      await user.save();

      // Send new verification email
      await EmailService.auth.sendVerificationEmail({ email: user.email, fullName: user.fullName }, newVerificationCode);
      
      // Log the action
      await LogHelper.createAuthLog('verification_code_resent', {
        targetId: user.userId,
        actorId: 'system',
        actorRole: 'system',
        shopId: user.shopId || null,
        details: { email: user.email }
      });
      
      logSuccess(`Verification code resent to: ${user.email}`, 'AuthService');

      return securityMessage;
    } catch (error) {
      logError(`Error resending verification: ${error.message}`, 'AuthService', error);
      // Still return success for security reasons
      return { 
        success: true, 
        message: 'If your email is registered and not verified, you will receive a new verification code.'
      };
    }
  },

  /**
   * Authenticate user login
   */
  login: async (email, password, deviceName = 'Unknown Device', ip = '') => {
    try {
      // Find active user using normalized email
      const normalizedEmail = email.toLowerCase().trim();
      
      // First check if user exists at all - without status filter
      const userExists = await User.findOne({
        email: normalizedEmail,
        isDeleted: false
      });
      
      // If user exists but is suspended, give specific message
      if (userExists && userExists.isSuspended) {
        // Log suspended account attempt
        await LogHelper.createSecurityLog('suspended_login_attempt', {
          actorId: userExists.userId,
          actorRole: userExists.role,
          targetId: userExists.userId,
          shopId: userExists.shopId || null,
          details: { deviceName, ip, reason: userExists.suspensionReason || 'No reason provided' }
        });
        
        logWarning(`Suspended account login attempt: ${normalizedEmail}`, 'AuthService');
        throw new AppError(
          'This account has been suspended. Please contact support for assistance.',
          401,
          'account_suspended'
        );
      }
      
      // Try to find active user
      const user = await User.findOne({ 
        email: normalizedEmail, 
        status: 'active',
        isDeleted: false
      });

      // Check if user exists and password matches
      if (!user || !(await user.comparePassword(password))) {
        // Log failed attempt for security monitoring
        await LogHelper.createSecurityLog('failed_login_attempt', {
          actorId: 'anonymous',
          actorRole: 'anonymous',
          targetEmail: normalizedEmail,
          details: { deviceName, ip }
        });
        
        logWarning(`Failed login attempt for email: ${email}`, 'AuthService');
        throw new AppError('Invalid email or password', 401, 'invalid_credentials');
      }

      if (!user.verified || !user.emailVerified) {
        // Log unverified account attempt
        await LogHelper.createSecurityLog('unverified_login_attempt', {
          actorId: user.userId,
          actorRole: user.role,
          targetId: user.userId,
          shopId: user.shopId || null,
          details: { email: user.email, deviceName, ip }
        });
        
        logWarning(`Login attempt with unverified account: ${email}`, 'AuthService');
        throw new AppError('Account is not verified. Please check your email for verification instructions', 401, 'account_not_verified');
      }

      // Generate tokens
      const { accessToken, refreshToken } = await TokenService.generateAuthTokens(user, deviceName, ip);
      
      // Update the lastLoginAt field on the user document
      user.lastLoginAt = new Date();
      await user.save();
      
      // Log successful login
      await LogHelper.createAuthLog('user_login', {
        actorId: user.userId,
        actorRole: user.role,
        targetId: user.userId,
        shopId: user.shopId || null,
        details: { deviceName, ip, lastLoginAt: user.lastLoginAt }
      });
      
      logSuccess(`User logged in: ${user.userId} (${user.email}) at ${user.lastLoginAt}`, 'AuthService');

      // Return sanitized user data and tokens
      return {
        user: UserHelper.sanitizeUser(user),
        tokens: {
          accessToken,
          refreshToken
        }
      };
    } catch (error) {
      // Re-throw AppError, wrap others
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Login error: ${error.message}`, 'AuthService', error);
      throw new AppError('Authentication failed', 500, 'auth_error');
    }
  },

  /**
   * Refresh access token using refresh token
   */
  refreshToken: async (refreshToken) => {
    try {
      if (!refreshToken) {
        throw new AppError('Refresh token is required', 400, 'missing_token');
      }

      // Verify and get new tokens
      const result = await TokenService.refreshAccessToken(refreshToken);
      
      // Log the token refresh for audit purposes
      await LogHelper.createAuthLog('token_refreshed', {
        actorId: result.userId,
        targetId: result.userId,
        details: { sessionId: result.sessionId }
      });
      
      logSuccess(`Token refreshed for user: ${result.userId}`, 'AuthService');

      return result;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Token refresh error: ${error.message}`, 'AuthService', error);
      throw new AppError('Failed to refresh token', 500, 'token_refresh_error');
    }
  },

  /**
   * Logout user session
   */
  logout: async (refreshToken) => {
    try {
      // If no token provided, return early as there's nothing to invalidate
      if (!refreshToken) {
        logWarning('Logout attempted without refresh token', 'AuthService');
        return { success: true, message: 'No token to invalidate' };
      }

      // Revoke the token and get session information for logging
      const sessionInfo = await TokenService.revokeRefreshToken(refreshToken);
      
      // If we have user info, log the logout for audit
      if (sessionInfo && sessionInfo.userId) {
        await LogHelper.createAuthLog('user_logout', {
          actorId: sessionInfo.userId,
          targetId: sessionInfo.userId,
          details: { 
            sessionId: sessionInfo.sessionId,
            deviceName: sessionInfo.deviceName || 'Unknown Device'
          }
        });
      }
      
      logSuccess(`User logged out successfully: ${sessionInfo?.userId || 'Unknown'}`, 'AuthService');

      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Logout error: ${error.message}`, 'AuthService', error);
      throw new AppError('Logout failed', 500, 'logout_error');
    }
  },

  /**
   * Logout from all devices
   */
  logoutAll: async (userId) => {
    try {
      // Find user first to get role information for logging
      const user = await UserHelper.findActiveUser(userId, { includeInactive: true });
      
      // Revoke all tokens for this user
      const result = await TokenService.revokeAllUserTokens(userId);
      
      // Log the logout-all action
      await LogHelper.createSecurityLog('logout_all_devices', {
        actorId: userId,
        targetId: userId,
        actorRole: user.role,
        shopId: user.shopId || null,
        details: { sessionsRevoked: result.count || 0 }
      });
      
      logSuccess(`User logged out from all devices: ${userId}`, 'AuthService');

      return { success: true, message: 'Logged out from all devices successfully' };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Logout all error for user ${userId}: ${error.message}`, 'AuthService', error);
      throw new AppError('Failed to logout from all devices', 500, 'logout_all_error');
    }
  },

  /**
   * Initiate forgot password process
   */
  forgotPassword: async (email) => {
    try {
      // Normalized email for consistent lookup
      const normalizedEmail = email.toLowerCase().trim();
      
      // Try to find user by email using UserHelper without throwing
      const user = await UserHelper.findUserByEmail(normalizedEmail, { 
        throwIfNotFound: false,
        includeInactive: true // Include inactive users too
      });

      // Standard security response to avoid revealing if user exists
      const securityResponse = {
        success: true,
        message: 'If your email is registered, you will receive password reset instructions.'
      };

      // Don't process further if user doesn't exist or is deleted
      if (!user || user.isDeleted) {
        // Log attempt for security monitoring
        logInfo(`Password reset requested for non-existent email: ${normalizedEmail}`, 'AuthService');
        return securityResponse;
      }

      // Generate secure reset token using crypto
      const token = crypto.randomUUID();
      
      // Set token and expiry
      user.resetPasswordToken = token;
      user.resetPasswordExpires = calculateExpiry(1); // 1 hour
      await user.save();
      
      // Log the password reset request
      await LogHelper.createSecurityLog('password_reset_requested', {
        actorId: 'system',
        targetId: user.userId,
        actorRole: 'system',
        shopId: user.shopId || null,
        details: { email: user.email }
      });
      
      try {
        // Send the reset email
        const userForEmail = {
          email: user.email,
          fullName: user.fullName || 'User'
        };
        await EmailService.auth.sendPasswordResetEmail(userForEmail, token);
        logSuccess(`Password reset email sent to: ${user.email}`, 'AuthService');
      } catch (emailError) {
        // Log email error but don't fail the request
        logError(`Failed to send password reset email: ${emailError.message}`, 'AuthService', emailError);
      }

      // Prepare standard response (same as no-user case for security)
      const response = securityResponse;
      
      // Add debug information in development mode only
      if (process.env.NODE_ENV === 'development') {
        response._debug = {
          token: token,
          expiresAt: user.resetPasswordExpires,
          resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`
        };
        
        // In development mode, use DebugHelper for consistent debugging
        await DebugHelper.logResetTokenDebug(token, user);
        logInfo('Development mode: Returning debug token information', 'AuthService');
      }
      
      return response;
    } catch (error) {
      logError(`Forgot password error: ${error.message}`, 'AuthService', error);
      // Still return success response for security
      return {
        success: true,
        message: 'If your email is registered, you will receive password reset instructions.'
      };
    }
  },

  /**
   * Reset password with token
   */
  resetPassword: async (token, newPassword) => {
    try {
      // DEBUG: Add detailed debugging for reset password
      console.log('DEBUG AuthService.resetPassword:');
      console.log('- Token received:', token);
      console.log('- Token type:', typeof token);
      console.log('- Token length:', token ? token.length : 0);
      console.log('- NewPassword present:', !!newPassword);
      console.log('- NewPassword type:', typeof newPassword);
      
      // Log token debugging info in development
      if (process.env.NODE_ENV === 'development') {
        await DebugHelper.logResetTokenDebug(token);
      }

      // Find user with valid reset token
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() },
        isDeleted: false
      });

      // DEBUG: Log if user was found
      console.log('DEBUG: User found with token?', !!user);
      if (!user) {
        console.log('DEBUG: No user found with token. Token expired or invalid.');
      } else {
        console.log('DEBUG: Found user ID:', user.userId);
        console.log('DEBUG: Token expiry time:', user.resetPasswordExpires);
      }

      if (!user) {
        // Log failed attempt for security monitoring
        await LogHelper.createSecurityLog('failed_password_reset', {
          actorId: 'anonymous',
          actorRole: 'anonymous',
          details: { reason: 'invalid_token', tokenProvided: !!token }
        });
        
        logWarning(`Invalid or expired reset token attempt: ${token}`, 'AuthService');
        throw new AppError('Invalid or expired reset token', 400, 'invalid_token');
      }
      
      // Check if the new password is the same as the current password
      const isSamePassword = await user.comparePassword(newPassword);
      if (isSamePassword) {
        // Log the attempt for security monitoring
        await LogHelper.createSecurityLog('failed_password_reset', {
          actorId: user.userId,
          actorRole: user.role,
          targetId: user.userId,
          shopId: user.shopId || null,
          details: { reason: 'same_password' }
        });
        
        logWarning(`Password reset attempt with same password: ${user.userId}`, 'AuthService');
        throw new AppError('New password cannot be the same as your current password', 400, 'same_password');
      }

      // Update password and clear reset fields
      user.password = newPassword; // Will be hashed by pre-save hook
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      
      // Revoke all existing sessions for security
      await TokenService.revokeAllUserTokens(user.userId);
      
      // Log successful password reset for audit
      await LogHelper.createSecurityLog('password_reset_complete', {
        targetId: user.userId,
        actorId: user.userId, // The user themselves completed the action
        actorRole: user.role,
        shopId: user.shopId || null,
        details: { method: 'reset_token' }
      });
      
      logSuccess(`Password reset successful for: ${user.userId} (${user.email})`, 'AuthService');

      // Return sanitized user data along with success message
      return {
        success: true,
        message: 'Password has been reset successfully. Please log in with your new password.',
        userId: user.userId,
        email: user.email,
        shopId: user.shopId
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Reset password error: ${error.message}`, 'AuthService', error);
      throw new AppError('Password reset failed', 500, 'reset_password_error');
    }
  },

  /**
   * Change password (authenticated user)
   */
  changePassword: async (userId, currentPassword, newPassword) => {
    try {
      // Get user from database using UserHelper
      const user = await UserHelper.findActiveUser(userId);
      
      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        // Log failed attempt for security monitoring
        await LogHelper.createSecurityLog('failed_password_change', {
          actorId: user.userId,
          targetId: user.userId,
          actorRole: user.role,
          shopId: user.shopId || null,
          details: { reason: 'invalid_current_password' }
        });
        
        logWarning(`Invalid current password attempt for user: ${user.userId}`, 'AuthService');
        throw new AppError('Current password is incorrect', 400, 'invalid_password');
      }
      
      // Check if the new password is the same as the current password
      // We already validated the current password above, so we can just compare the strings directly
      if (newPassword === currentPassword) {
        // Log the attempt for security monitoring
        await LogHelper.createSecurityLog('failed_password_change', {
          actorId: user.userId,
          targetId: user.userId,
          actorRole: user.role,
          shopId: user.shopId || null,
          details: { reason: 'same_password' }
        });
        
        logWarning(`Password change attempt with same password: ${user.userId}`, 'AuthService');
        throw new AppError('New password cannot be the same as your current password', 400, 'same_password');
      }

      // Update password
      user.password = newPassword; // Will be hashed by pre-save hook
      await user.save();
      
      // For security, logout from all devices
      await TokenService.revokeAllUserTokens(userId);
      
      // Log successful password change for audit
      await LogHelper.createSecurityLog('password_changed', {
        actorId: user.userId,
        targetId: user.userId,
        actorRole: user.role,
        shopId: user.shopId || null,
        details: { method: 'authenticated_change' }
      });
      
      logSuccess(`Password changed successfully for user: ${user.userId}`, 'AuthService');

      return {
        success: true,
        message: 'Password has been changed successfully. Please log in again with your new password.'
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Change password error for user ${userId}: ${error.message}`, 'AuthService', error);
      throw new AppError('Password change failed', 500, 'change_password_error');
    }
  },

  /**
   * Get user profile
   */
  getProfile: async (userId) => {
    try {
      // Use UserHelper to find and sanitize user data
      const user = await UserHelper.findActiveUser(userId);
      
      // Log profile access
      await LogHelper.createAuthLog('profile_viewed', {
        actorId: userId,
        targetId: userId,
        actorRole: user.role,
        shopId: user.shopId || null
      });
      
      // Return sanitized user data
      return UserHelper.sanitizeUser(user);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Get profile error for user ${userId}: ${error.message}`, 'AuthService', error);
      throw new AppError('Failed to retrieve user profile', 500, 'profile_fetch_error');
    }
  }
  
  // Note: _logResetTokenDebug has been moved to DebugHelper.logResetTokenDebug
};

module.exports = AuthService;
