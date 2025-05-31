const AuthService = require('../../services/authService');
const TokenService = require('../../services/tokenService');
const { 
  AppError,
  ResponseHelper, 
  TokenHelper, 
  UserHelper,
  LogHelper,
  logInfo, 
  logSuccess, 
  logError
} = require('../../utils');

/**
 * User login
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password, deviceName } = req.validatedData || req.body;
    const ip = req.ip || req.connection.remoteAddress;

    try {
      // Use secure option to determine if we should use secure cookies
      const useSecure = process.env.NODE_ENV === 'production' || process.env.SESSION_SECURE === 'true';
      
      // Delegate to AuthService
      const { user, tokens } = await AuthService.login(email, password, deviceName || 'Unknown device', ip);
      
      // Log the successful login
      logSuccess(`User login successful: ${user.userId} (${user.email})`, 'AuthController');
      
      // Set secure HTTP-only cookies for tokens
      TokenService.setAuthCookies(res, tokens);
      
      // Generate CSRF token
      if (req.generateCsrfToken) {
        req.generateCsrfToken(req, res);
      }
      
      // Create audit log
      await LogHelper.createAuthLog('login', {
        actorId: user.userId,
        targetId: user.userId,
        actorRole: user.role,
        shopId: user.shopId || null,
        details: { ip, device: deviceName || 'Unknown device' }
      });
      
      // Return sanitized user data and tokens
      return ResponseHelper.success(
        res,
        'Login successful',
        {
          user: UserHelper.sanitizeUser(user),
          accessToken: tokens.accessToken,
          verified: user.verified
        }
      );
    } catch (authError) {
      // Handle specific authentication errors
      if (authError.statusCode) {
        // Log failed attempt
        logInfo(`Failed login attempt for ${email}: ${authError.message}`, 'AuthController');
        
        return ResponseHelper.error(
          res,
          authError.message,
          authError.statusCode,
          authError.errorCode || 'login_failed'
        );
      }
      throw authError;
    }
  } catch (error) {
    logError('Login error', 'AuthController', error);
    return next(error);
  }
};

/**
 * Refresh access token using refresh token
 * POST /api/auth/refresh-token
 */
const refreshToken = async (req, res, next) => {
  try {
    // Get token from cookie or request body
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    
    if (!token) {
      return ResponseHelper.error(
        res,
        'Refresh token is required',
        400,
        'missing_token'
      );
    }

    try {
      // Delegate to AuthService or TokenService
      const result = await TokenService.refreshAccessToken(token);
      
      // Set the new access token in a cookie
      TokenService.setAuthCookies(res, {
        accessToken: result.accessToken,
        refreshToken: token
      });
      
      // Return the new access token
      return ResponseHelper.success(
        res,
        'Token refreshed successfully',
        { accessToken: result.accessToken }
      );
    } catch (authError) {
      // Handle specific authentication errors
      if (authError.statusCode) {
        TokenService.clearAuthCookies(res);
        
        return ResponseHelper.error(
          res,
          authError.message,
          authError.statusCode,
          authError.errorCode || 'token_refresh_error'
        );
      }
      throw authError;
    }
  } catch (error) {
    logError('Token refresh error', 'AuthController', error);
    
    // Clear cookies on error
    TokenService.clearAuthCookies(res);
    
    return next(error);
  }
};

/**
 * User logout
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    // Get token from cookie or request body
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    
    if (token) {
      try {
        // Revoke the refresh token
        await TokenService.revokeRefreshToken(token);
      } catch (error) {
        // Just log the error, but continue with logout
        logError(`Error revoking refresh token: ${error.message}`, 'AuthController', error);
      }
    }
    
    // Clear auth cookies
    TokenService.clearAuthCookies(res);
    
    // Log the logout if we have user info
    if (req.user) {
      await LogHelper.createAuthLog('logout', {
        actorId: req.user.userId,
        targetId: req.user.userId,
        actorRole: req.user.role,
        shopId: req.user.shopId || null
      });
    }
    
    return ResponseHelper.success(
      res,
      'Logout successful',
      { success: true }
    );
  } catch (error) {
    logError('Logout error', 'AuthController', error);
    return next(error);
  }
};

/**
 * Logout from all devices
 * POST /api/auth/logout-all
 * Requires authentication
 */
const logoutAll = async (req, res, next) => {
  try {
    const { userId } = req.user;

    try {
      // Delegate to TokenService to revoke all user tokens
      const count = await TokenService.revokeAllUserTokens(userId);
      
      // Clear auth cookies for current device
      TokenService.clearAuthCookies(res);
      
      // Log the logout from all devices
      await LogHelper.createAuthLog('logout_all_devices', {
        actorId: userId,
        targetId: userId,
        actorRole: req.user.role,
        shopId: req.user.shopId || null,
        details: { sessionsRevoked: count }
      });
      
      return ResponseHelper.success(
        res,
        `Logged out from all devices (${count} sessions revoked)`,
        { success: true, sessionsRevoked: count }
      );
    } catch (authError) {
      // Handle specific authentication errors
      if (authError.statusCode) {
        return ResponseHelper.error(
          res,
          authError.message,
          authError.statusCode,
          authError.errorCode || 'logout_error'
        );
      }
      throw authError;
    }
  } catch (error) {
    logError('Logout all devices error', 'AuthController', error);
    return next(error);
  }
};

module.exports = {
  login,
  refreshToken,
  logout,
  logoutAll
};
