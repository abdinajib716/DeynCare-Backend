const AuthService = require('../../services/authService');
const { 
  ResponseHelper, 
  LogHelper, 
  UserHelper,
  logSuccess, 
  logError,
  logWarning
} = require('../../utils');

/**
 * Verify email with verification code
 * POST /api/auth/verify-email
 */
const verifyEmail = async (req, res, next) => {
  try {
    // Get data from request, supporting both field names for compatibility
    const { email, code, verificationCode } = req.validatedData || req.body;
    const verifyCode = verificationCode || code; // Use either field name

    if (!email || !verifyCode) {
      return ResponseHelper.error(
        res,
        'Email and verification code are required',
        400,
        'missing_params'
      );
    }

    try {
      // Delegate to AuthService
      const userData = await AuthService.verifyEmail(email, verifyCode);
      
      // Log successful verification
      logSuccess(`Email verified successfully for: ${email}`, 'AuthController');
      
      // Send welcome email if user is verified
      try {
        // Import EmailService
        const EmailService = require('../../services/emailService');
        
        // Get shop details if user has a shop
        let shopData = null;
        if (userData.shopId) {
          const { Shop } = require('../../models');
          shopData = await Shop.findOne({ shopId: userData.shopId });
        }
        
        // Send welcome email
        await EmailService.auth.sendWelcomeEmail(userData, shopData);
        logSuccess(`Welcome email sent to ${email}`, 'AuthController');
      } catch (emailError) {
        // Don't fail verification if email fails
        logError(`Failed to send welcome email to ${email}`, 'AuthController', emailError);
      }
      
      return ResponseHelper.success(
        res,
        'Email verified successfully',
        UserHelper.sanitizeUser(userData)
      );
    } catch (authError) {
      // Handle specific authentication errors
      if (authError.statusCode) {
        logWarning(`Email verification failed for ${email}: ${authError.message}`, 'AuthController');
        return ResponseHelper.error(
          res,
          authError.message,
          authError.statusCode,
          authError.errorCode || 'verification_error'
        );
      }
      throw authError;
    }
  } catch (error) {
    logError('Email verification error', 'AuthController', error);
    return next(error);
  }
};

/**
 * Resend verification code
 * POST /api/auth/resend-verification
 */
const resendVerification = async (req, res, next) => {
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
      const result = await AuthService.resendVerification(email);
      
      logSuccess(`Verification code resent to: ${email}`, 'AuthController');
      
      return ResponseHelper.success(
        res,
        'Verification code has been sent to your email'
      );
    } catch (authError) {
      // Handle specific authentication errors
      if (authError.statusCode) {
        return ResponseHelper.error(
          res,
          authError.message,
          authError.statusCode,
          authError.errorCode || 'resend_error'
        );
      }
      throw authError;
    }
  } catch (error) {
    logError('Resend verification error', 'AuthController', error);
    return next(error);
  }
};

module.exports = {
  verifyEmail,
  resendVerification
};
