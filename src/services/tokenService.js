const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Session } = require('../models');
const { AppError, generateToken, logAuth, logError, logWarning, logInfo, idGenerator, TokenHelper } = require('../utils');

/**
 * Service for handling all JWT token operations
 */
/**
 * Maximum number of active sessions per user
 * @type {number}
 */
const MAX_ACTIVE_SESSIONS = 5;

/**
 * Service for handling all JWT token operations
 */
const TokenService = {
  /**
   * Generate a secure random token using crypto
   * @returns {String} - Secure random token
   */
  generateSecureToken: () => {
    return crypto.randomUUID();
  },

  /**
   * Generate JWT access token
   * @param {Object} payload - Token payload
   * @param {String} expiresIn - Token expiry (default: 15m)
   * @returns {String} - JWT token
   */
  generateAccessToken: (payload, expiresIn = process.env.JWT_ACCESS_EXPIRY || '15m') => {
    try {
      // Use TOKEN_SECRET as a fallback if JWT_ACCESS_SECRET is not available
      const secret = process.env.JWT_ACCESS_SECRET || process.env.TOKEN_SECRET || 'deyncare-secure-token-secret-key';
      return jwt.sign(payload, secret, { expiresIn });
    } catch (error) {
      logError('Failed to generate access token', 'TokenService', error);
      throw new AppError('Token generation failed', 500);
    }
  },

  /**
   * Generate JWT refresh token and save to database
   * @param {Object} user - User object
   * @param {String} device - Device information
   * @param {String} ip - IP address
   * @param {Object} options - Additional options
   * @param {Boolean} options.secure - Whether to use secure cookies
   * @returns {Object} - Token object containing refresh token and other details
   */
  generateRefreshToken: async (user, device = 'Unknown', ip = '', options = {}) => {
    try {
      // Create a unique token string using UUID for better security
      const tokenString = TokenService.generateSecureToken();
      
      // Calculate expiration using environment variable or default to 30 days
      const refreshExpiry = process.env.JWT_REFRESH_EXPIRY || '30d';
      const refreshExpiryDays = refreshExpiry.endsWith('d') ? 
        parseInt(refreshExpiry.slice(0, -1)) : 30;
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + refreshExpiryDays);

      // Check and limit active sessions per user
      const activeSessions = await Session.countDocuments({
        userId: user.userId,
        isActive: true
      });
      
      // If exceeding session limit, revoke the oldest session
      if (activeSessions >= MAX_ACTIVE_SESSIONS) {
        logWarning(`User ${user.userId} has reached maximum active sessions (${MAX_ACTIVE_SESSIONS}). Revoking oldest session.`, 'TokenService');
        
        const oldestSession = await Session.findOne({
          userId: user.userId,
          isActive: true
        }).sort({ createdAt: 1 });
        
        if (oldestSession) {
          oldestSession.isActive = false;
          await oldestSession.save();
          logInfo(`Revoked session ${oldestSession.sessionId} (oldest) for user ${user.userId}`, 'TokenService');
        }
      }
      
      // Create session in database with refresh token
      const session = new Session({
        sessionId: await idGenerator.generateSessionId(Session),
        userId: user.userId,
        userRole: user.role, // Add user role to meet Session schema requirements
        shopId: user.shopId || null, // Add shopId if available
        device,
        ip,
        token: tokenString,
        isActive: true,
        expiresAt
      });
      
      await session.save();
      
      logAuth(`Generated refresh token for user ${user.userId}`, 'TokenService');
      
      // Return token details
      return {
        token: tokenString,
        expiresAt
      };
    } catch (error) {
      logError('Failed to generate refresh token', 'TokenService', error);
      throw new AppError('Token generation failed', 500);
    }
  },
  
  /**
   * Generate both access and refresh tokens for a user
   * @param {Object} user - User object
   * @param {String} device - Device information
   * @param {String} ip - IP address
   * @param {Object} options - Additional options
   * @param {Boolean} options.secure - Whether to use secure cookies
   * @returns {Object} - Object containing accessToken and refreshToken
   */
  generateAuthTokens: async (user, device = 'Unknown', ip = '', options = {}) => {
    try {
      // Create payload for access token
      const payload = {
        userId: user.userId,
        role: user.role,
        shopId: user.shopId || null,
        email: user.email
      };
      
      // Generate access token
      const accessToken = TokenService.generateAccessToken(payload);
      
      // Generate refresh token with options
      const refreshTokenData = await TokenService.generateRefreshToken(user, device, ip, options);
      const refreshToken = refreshTokenData.token;
      
      logAuth(`Generated auth tokens for user ${user.userId}`, 'TokenService');
      
      return {
        accessToken,
        refreshToken
      };
    } catch (error) {
      logError(`Failed to generate auth tokens: ${error.message}`, 'TokenService', error);
      throw new AppError('Token generation failed', 500);
    }
  },

  /**
   * Verify access token
   * @param {String} token - JWT token
   * @returns {Object} - Decoded token payload
   */
  verifyAccessToken: (token) => {
    try {
      // Use new security environment variables
      const secret = process.env.JWT_ACCESS_SECRET || process.env.TOKEN_SECRET || 'deyncare-secure-token-secret-key';
      return jwt.verify(token, secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Token has expired', 401, 'token_expired');
      }
      throw new AppError('Invalid token', 401, 'invalid_token');
    }
  },

  /**
   * Verify refresh token and return associated user
   * @param {String} token - Refresh token
   * @returns {Object} - { user, session } if valid
   */
  verifyRefreshToken: async (token) => {
    try {
      // Find active session with token
      const session = await Session.findOne({
        token,
        isActive: true,
        expiresAt: { $gt: new Date() }
      });
      
      if (!session) {
        logWarning(`Refresh token not found or expired: ${token.substring(0, 10)}...`, 'TokenService');
        throw new AppError('Invalid refresh token', 401, 'invalid_token');
      }
      
      // Find associated user
      const user = await User.findOne({ userId: session.userId });
      
      if (!user) {
        logWarning(`User not found for refresh token: ${session.userId}`, 'TokenService');
        throw new AppError('User not found', 401, 'user_not_found');
      }
      
      if (!user.isActive) {
        logWarning(`Inactive user attempted token refresh: ${user.userId}`, 'TokenService');
        throw new AppError('User account is inactive', 403, 'inactive_account');
      }
      
      logAuth(`Verified refresh token for user ${user.userId}`, 'TokenService');
      
      return { user, session };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logError(`Refresh token verification error: ${error.message}`, 'TokenService', error);
      throw new AppError('Refresh token verification failed', 401);
    }
  },
  
  /**
   * Refresh access token using refresh token
   * @param {String} refreshToken - Refresh token
   * @returns {Object} - Object containing new access token and user information
   */
  refreshAccessToken: async (refreshToken) => {
    try {
      // Verify the refresh token first
      const { user, session } = await TokenService.verifyRefreshToken(refreshToken);
      
      // Create payload for the new access token
      const payload = {
        userId: user.userId,
        role: user.role,
        shopId: user.shopId || null,
        email: user.email
      };
      
      // Generate a new access token
      const accessToken = TokenService.generateAccessToken(payload);
      
      logAuth(`Access token refreshed for user ${user.userId}, session ${session.sessionId}`, 'TokenService');
      
      // Return both the new access token and user info
      return {
        accessToken,
        userId: user.userId,
        sessionId: session.sessionId,
        role: user.role,
        shopId: user.shopId || null
      };
    } catch (error) {
      logError(`Failed to refresh access token: ${error.message}`, 'TokenService', error);
      throw error; // Re-throw to be handled by the controller
    }
  },

  /**
   * Revoke a refresh token (mark session as inactive)
   * @param {String} token - The refresh token to revoke
   * @param {Object} options - Additional options
   * @param {Boolean} options.throwIfNotFound - Whether to throw an error if token not found (default: false)
   * @returns {Promise<Boolean>} - Success status
   */
  revokeRefreshToken: async (token, options = {}) => {
    const { throwIfNotFound = false } = options;
    
    try {
      // Find and update session
      const session = await Session.findOne({ token });
      
      if (!session) {
        if (throwIfNotFound) {
          throw new AppError('Refresh token not found', 404, 'token_not_found');
        }
        logWarning(`Attempted to revoke non-existent token: ${token.substring(0, 10)}...`, 'TokenService');
        return false;
      }
      
      // If already inactive, no action needed
      if (!session.isActive) {
        return true;
      }
      
      // Mark as inactive and save
      session.isActive = false;
      await session.save();
      
      logAuth(`Revoked refresh token for user ${session.userId}`, 'TokenService');
      return true;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logError(`Failed to revoke refresh token: ${error.message}`, 'TokenService', error);
      throw new AppError('Failed to revoke token', 500);
    }
  },

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   * @param {String} userId - User ID
   */
  revokeAllUserTokens: async (userId) => {
    try {
      // Update all active sessions for user
      const result = await Session.updateMany(
        { userId, isActive: true },
        { isActive: false }
      );
      
      logAuth(`Revoked ${result.modifiedCount} active sessions for user ${userId}`, 'TokenService');
      return result.modifiedCount;
    } catch (error) {
      logError(`Failed to revoke all user tokens: ${error.message}`, 'TokenService', error);
      throw new AppError('Failed to revoke tokens', 500);
    }
  },

  /**
   * Revoke all refresh tokens for a user except the current one
   * @param {String} userId - User ID
   * @param {String} currentToken - Current token to keep active
   */
  revokeAllUserTokensExcept: async (userId, currentToken) => {
    try {
      // Update all active sessions for user except current token
      const result = await Session.updateMany(
        { userId, isActive: true, token: { $ne: currentToken } },
        { isActive: false }
      );
      
      logAuth(`Revoked ${result.modifiedCount} other active sessions for user ${userId}`, 'TokenService');
      return result.modifiedCount;
    } catch (error) {
      logError(`Failed to revoke other user tokens: ${error.message}`, 'TokenService', error);
      throw new AppError('Failed to revoke tokens', 500);
    }
  }
};

/**
 * Set auth cookies in HTTP response
 * @param {Object} res - Express response object
 * @param {Object} tokens - Auth tokens
 * @param {String} tokens.accessToken - JWT access token
 * @param {String} tokens.refreshToken - JWT refresh token
 * @returns {void}
 */
TokenService.setAuthCookies = (res, tokens) => {
  // Get cookie options from environment or use defaults
  const useSecure = process.env.SESSION_SECURE === 'true' || process.env.NODE_ENV === 'production';
  const cookieMaxAge = parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000; // 24 hours
  
  // Set access token cookie - shorter lifespan
  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: useSecure,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/'
  });
  
  // Set refresh token cookie - longer lifespan
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: useSecure,
    sameSite: 'strict',
    maxAge: cookieMaxAge,
    path: '/api/auth/refresh-token' // Limit to refresh endpoint only
  });
};

/**
 * Clear auth cookies from HTTP response
 * @param {Object} res - Express response object
 * @returns {void}
 */
TokenService.clearAuthCookies = (res) => {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/api/auth/refresh-token' });
};

module.exports = TokenService;
