const AuthService = require('../../services/authService');
const TokenService = require('../../services/tokenService');
const { 
  ResponseHelper, 
  TokenHelper, 
  LogHelper,
  logSuccess, 
  logError,
  logWarning
} = require('../../utils');

/**
 * Forgot password
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.validatedData || req.body;

    if (!email) {
      return ResponseHelper.error(
        res,
        'Email is required',
        400,
        'missing_email'
      );
    }

    try {
      // Delegate to AuthService
      const result = await AuthService.forgotPassword(email);
      
      // Log the password reset request
      logSuccess(`Password reset requested for: ${email}`, 'AuthController');
      
      return ResponseHelper.success(
        res,
        'If your email is registered, you will receive a password reset link'
      );
    } catch (authError) {
      // For security reasons, don't expose specific errors
      // Just return a generic success message even if there was an error
      logWarning(`Password reset error for ${email}: ${authError.message}`, 'AuthController');
      
      return ResponseHelper.success(
        res,
        'If your email is registered, you will receive a password reset link'
      );
    }
  } catch (error) {
    logError('Forgot password error', 'AuthController', error);
    return next(error);
  }
};

/**
 * Reset password
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.validatedData || req.body;

    if (!token || !password) {
      return ResponseHelper.error(
        res,
        'Token and new password are required',
        400,
        'missing_params'
      );
    }

    try {
      // Delegate to AuthService
      const result = await AuthService.resetPassword(token, password);
      
      // Create audit log for successful password reset
      await LogHelper.createSecurityLog('password_reset', {
        actorId: result.userId,
        targetId: result.userId,
        shopId: result.shopId || null,
        details: { method: 'email_token' }
      });
      
      // Clear any auth cookies that might exist
      TokenHelper.clearTokenCookies(res);
      
      logSuccess(`Password reset successful for user: ${result.userId}`, 'AuthController');
      
      return ResponseHelper.success(
        res,
        'Password has been reset successfully. You can now log in with your new password.'
      );
    } catch (authError) {
      // Handle specific authentication errors
      if (authError.statusCode) {
        return ResponseHelper.error(
          res,
          authError.message,
          authError.statusCode,
          authError.errorCode || 'reset_password_error'
        );
      }
      throw authError;
    }
  } catch (error) {
    logError('Reset password error', 'AuthController', error);
    return next(error);
  }
};

/**
 * Change password (authenticated)
 * POST /api/auth/change-password
 * Requires authentication
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.validatedData || req.body;
    const { userId } = req.user;

    try {
      // Delegate to AuthService
      const result = await AuthService.changePassword(userId, currentPassword, newPassword);
      
      // Create audit log for successful password change using LogHelper
      await LogHelper.createSecurityLog('change_password', {
        actorId: userId,
        targetId: userId,
        actorRole: req.user.role,
        shopId: req.user.shopId || null,
        details: { method: 'authenticated' }
      });
      
      // Clear authentication cookies
      TokenService.clearAuthCookies(res);
      
      return ResponseHelper.success(
        res,
        'Password has been changed successfully. Please log in again with your new password.'
      );
    } catch (authError) {
      // Handle specific authentication errors
      if (authError.statusCode) {
        return ResponseHelper.error(
          res,
          authError.message,
          authError.statusCode,
          authError.errorCode || 'change_password_error'
        );
      }
      throw authError;
    }
  } catch (error) {
    logError('Change password error', 'AuthController', error);
    return next(error);
  }
};

module.exports = {
  forgotPassword,
  resetPassword,
  changePassword
};
