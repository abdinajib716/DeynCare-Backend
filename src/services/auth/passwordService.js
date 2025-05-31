const { User } = require('../../models');
const TokenService = require('../tokenService');
const EmailService = require('../emailService');
const crypto = require('crypto');
const { 
  AppError,
  UserHelper,
  LogHelper,
  DebugHelper,
  calculateExpiry,
  logSuccess,
  logWarning,
  logError,
  logInfo
} = require('../../utils');

/**
 * Initiate forgot password process
 */
const forgotPassword = async (email) => {
  try {
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();
    
    // Find user by email
    const user = await User.findOne({
      email: normalizedEmail,
      isDeleted: false,
      isSuspended: { $ne: true }
    });
    
    // For security reasons, don't reveal if the user exists or not
    if (!user) {
      logWarning(`Password reset requested for non-existent user: ${email}`, 'AuthService');
      return {
        success: true,
        message: 'If your email is registered, you will receive password reset instructions.'
      };
    }
    
    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash the token for storage
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Store the hashed token and expiry
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = calculateExpiry(1); // 1 hour
    await user.save();
    
    // Create the reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    // Send the password reset email
    await EmailService.auth.sendPasswordResetEmail({
      email: user.email,
      fullName: user.fullName,
      resetUrl
    });
    
    // Log the password reset request
    await LogHelper.createSecurityLog('password_reset_requested', {
      actorId: user.userId,
      targetId: user.userId,
      actorRole: user.role,
      shopId: user.shopId || null
    });
    
    // For development, log the reset token (but never in production)
    if (process.env.NODE_ENV === 'development') {
      logInfo(`Password reset token for ${email}: ${resetToken}`, 'AuthService');
    }
    
    logSuccess(`Password reset email sent to: ${email}`, 'AuthService');
    
    return {
      success: true,
      message: 'If your email is registered, you will receive password reset instructions.'
    };
  } catch (error) {
    logError(`Forgot password error: ${error.message}`, 'AuthService', error);
    throw new AppError('Failed to process password reset request', 500, 'reset_request_error');
  }
};

/**
 * Reset password with token
 */
const resetPassword = async (token, newPassword) => {
  try {
    if (!token || !newPassword) {
      throw new AppError('Token and new password are required', 400, 'missing_params');
    }
    
    // For development, log the token for debugging
    if (process.env.NODE_ENV === 'development') {
      DebugHelper.logResetTokenDebug(token);
    }
    
    // Hash the token to compare with stored value
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Find user with the token and check if token is expired
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
      isDeleted: false,
      isSuspended: { $ne: true }
    });
    
    if (!user) {
      logWarning(`Invalid or expired password reset token: ${token.substring(0, 10)}...`, 'AuthService');
      throw new AppError('Invalid or expired reset token', 400, 'invalid_token');
    }
    
    // Update the password
    user.password = newPassword; // Will be hashed by pre-save hook
    
    // Clear the reset token and expiry
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    
    // Save the user
    await user.save();
    
    // For security, revoke all tokens
    await TokenService.revokeAllUserTokens(user.userId);
    
    // Log the password reset
    await LogHelper.createSecurityLog('password_reset', {
      actorId: user.userId,
      targetId: user.userId,
      actorRole: user.role,
      shopId: user.shopId || null
    });
    
    logSuccess(`Password reset successful for user: ${user.userId}`, 'AuthService');
    
    // Send password changed confirmation email
    await EmailService.auth.sendPasswordChangedEmail({
      email: user.email,
      fullName: user.fullName
    });
    
    return {
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
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
};

/**
 * Change password (authenticated user)
 */
const changePassword = async (userId, currentPassword, newPassword) => {
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
};

module.exports = {
  forgotPassword,
  resetPassword,
  changePassword
};
