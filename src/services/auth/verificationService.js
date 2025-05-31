const { User } = require('../../models');
const EmailService = require('../emailService');
const { 
  AppError,
  generateVerificationCode,
  calculateExpiry,
  UserHelper,
  LogHelper,
  logSuccess,
  logWarning,
  logError
} = require('../../utils');

/**
 * Verify user email with verification code
 */
const verifyEmail = async (email, code) => {
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
        const { Shop } = require('../../models');
        
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
    
    logError(`Email verification error: ${error.message}`, 'AuthService', error);
    throw new AppError('Email verification failed', 500, 'verification_error');
  }
};

/**
 * Resend verification code to user
 */
const resendVerification = async (email) => {
  try {
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();
    
    // Find user by email
    const user = await User.findOne({
      email: normalizedEmail,
      status: { $in: ['pending', 'inactive'] },
      verified: false,
      isDeleted: false
    });
    
    if (!user) {
      logWarning(`Resend verification attempted for non-existent or already verified email: ${email}`, 'AuthService');
      throw new AppError('User not found or already verified', 404, 'user_not_found');
    }
    
    // Generate new verification code
    const verificationCode = generateVerificationCode(6);
    
    // Update verification code and expiry
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = calculateExpiry(24); // 24 hours
    await user.save();
    
    // Send verification email
    await EmailService.auth.sendVerificationEmail({
      email: user.email,
      fullName: user.fullName
    }, verificationCode);
    
    // Log the resend action
    await LogHelper.createAuthLog('resend_verification', {
      actorId: user.userId,
      targetId: user.userId,
      actorRole: user.role,
      shopId: user.shopId || null
    });
    
    logSuccess(`Verification code resent to: ${email}`, 'AuthService');
    
    return {
      success: true,
      message: 'Verification code has been sent to your email'
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logError(`Resend verification error: ${error.message}`, 'AuthService', error);
    throw new AppError('Failed to resend verification code', 500, 'resend_error');
  }
};

module.exports = {
  verifyEmail,
  resendVerification
};
