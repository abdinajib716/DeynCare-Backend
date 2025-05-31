const { User, Session } = require('../../models');
const TokenService = require('../tokenService');
const { 
  AppError,
  UserHelper,
  LogHelper,
  logSuccess,
  logWarning,
  logError
} = require('../../utils');

/**
 * Authenticate user login
 */
const login = async (email, password, deviceName = 'Unknown Device', ip = '') => {
  try {
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();
    
    // Find user by email
    const user = await User.findOne({
      email: normalizedEmail,
      isDeleted: false,
      isSuspended: { $ne: true }
    });
    
    // If user is not found or invalid credentials
    if (!user) {
      logWarning(`Login attempt for non-existent user: ${email}`, 'AuthService');
      throw new AppError('Invalid email or password', 401, 'invalid_credentials');
    }
    
    // Check if user is inactive
    if (user.status === 'inactive' || user.status === 'pending') {
      logWarning(`Login attempt for inactive user: ${email}`, 'AuthService');
      throw new AppError('Account is not activated. Please verify your email.', 401, 'account_inactive');
    }
    
    // Check if password is correct
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Log failed login attempt
      await LogHelper.createSecurityLog('failed_login', {
        actorId: user.userId,
        targetId: user.userId,
        actorRole: user.role,
        shopId: user.shopId || null,
        details: { reason: 'invalid_password', ip }
      });
      
      logWarning(`Invalid password login attempt for user: ${email}`, 'AuthService');
      throw new AppError('Invalid email or password', 401, 'invalid_credentials');
    }
    
    // Generate tokens
    const tokens = await TokenService.generateAuthTokens(user, deviceName, ip);
    
    // Log successful login
    await LogHelper.createAuthLog('login', {
      actorId: user.userId,
      targetId: user.userId,
      actorRole: user.role,
      shopId: user.shopId || null,
      details: { deviceName, ip }
    });
    
    logSuccess(`User login successful: ${user.userId} (${user.email})`, 'AuthService');
    
    // Return user data and tokens
    return {
      user: UserHelper.sanitizeUser(user),
      tokens
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logError(`Login error: ${error.message}`, 'AuthService', error);
    throw new AppError('Authentication failed', 500, 'auth_error');
  }
};

/**
 * Refresh access token using refresh token
 */
const refreshToken = async (refreshToken) => {
  try {
    // Use TokenService to refresh token
    const result = await TokenService.refreshAccessToken(refreshToken);
    
    // Log successful token refresh
    await LogHelper.createAuthLog('token_refreshed', {
      actorId: result.userId,
      targetId: result.userId,
      sessionId: result.sessionId
    });
    
    logSuccess(`Access token refreshed for user: ${result.userId}`, 'AuthService');
    
    // Return the new access token along with refresh token
    return {
      accessToken: result.accessToken,
      refreshToken: refreshToken  // Return the original refresh token
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logError(`Refresh token error: ${error.message}`, 'AuthService', error);
    throw new AppError('Failed to refresh token', 401, 'refresh_token_error');
  }
};

/**
 * Logout user session
 */
const logout = async (refreshToken) => {
  try {
    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400, 'missing_token');
    }
    
    // Use TokenService to revoke refresh token
    const result = await TokenService.revokeRefreshToken(refreshToken);
    
    if (!result) {
      // Token wasn't found or was already revoked
      return { success: true, message: 'Already logged out' };
    }
    
    logSuccess(`User logged out successfully`, 'AuthService');
    
    return {
      success: true,
      message: 'Logged out successfully'
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logError(`Logout error: ${error.message}`, 'AuthService', error);
    throw new AppError('Logout failed', 500, 'logout_error');
  }
};

/**
 * Logout from all devices
 */
const logoutAll = async (userId) => {
  try {
    if (!userId) {
      throw new AppError('User ID is required', 400, 'missing_user_id');
    }
    
    // Use TokenService to revoke all refresh tokens for the user
    const count = await TokenService.revokeAllUserTokens(userId);
    
    logSuccess(`User ${userId} logged out from all devices (${count} sessions revoked)`, 'AuthService');
    
    return {
      success: true,
      message: `Logged out from all devices`,
      sessionsRevoked: count
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logError(`Logout all devices error: ${error.message}`, 'AuthService', error);
    throw new AppError('Logout from all devices failed', 500, 'logout_all_error');
  }
};

module.exports = {
  login,
  refreshToken,
  logout,
  logoutAll
};
