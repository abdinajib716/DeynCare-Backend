/**
 * Helper functions for token and cookie management
 */
const TokenHelper = {
  /**
   * Set access and refresh tokens as cookies in response
   * @param {Object} res - Express response object
   * @param {string} accessToken - JWT access token
   * @param {string} refreshToken - Refresh token
   * @param {Object} options - Additional options
   */
  setTokenCookies: (res, accessToken, refreshToken, options = {}) => {
    // Skip in non-production environments unless forced
    if (process.env.NODE_ENV !== 'production' && !options.force) {
      return;
    }
    
    // Set access token cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      ...options.accessTokenOptions
    });
    
    // Set refresh token cookie if provided
    if (refreshToken) {
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        ...options.refreshTokenOptions
      });
    }
  },
  
  /**
   * Clear authentication cookies
   * @param {Object} res - Express response object
   */
  clearTokenCookies: (res) => {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
  },
  
  /**
   * Get refresh token from request (either from body or cookies)
   * @param {Object} req - Express request object
   * @returns {string|null} - Refresh token or null if not found
   */
  getRefreshTokenFromRequest: (req) => {
    // First try to get from request body
    let token = req.body.refreshToken;
    
    // Fall back to cookies
    if (!token && req.cookies && req.cookies.refreshToken) {
      token = req.cookies.refreshToken;
    }
    
    return token || null;
  }
};

module.exports = TokenHelper;
