const { User } = require('../../models');
const { logInfo } = require('../logger.js');

/**
 * Helper functions for development debugging
 * These functions should only be used in development environments
 */
const DebugHelper = {
  /**
   * Debug reset password token information
   * @param {string} token - The reset token to debug
   * @param {Object} user - Optional user object for additional context
   */
  debugResetToken: async (token, user = null) => {
    // Skip in production
    if (process.env.NODE_ENV === 'production') {
      return;
    }
    
    // Log token details
    logInfo(`🔍 RESET TOKEN DEBUG INFO:`, 'DebugHelper');
    logInfo(`🔑 RECEIVED TOKEN: "${token}"`, 'DebugHelper');
    logInfo(`📏 TOKEN LENGTH: ${token.length} CHARACTERS`, 'DebugHelper');
    logInfo(`🧩 TOKEN TYPE: ${typeof token}`, 'DebugHelper');
    
    // Find ALL users for debugging
    const allUsers = await User.find({}).select('email resetPasswordToken resetPasswordExpires');
    const usersWithTokens = allUsers.filter(u => u.resetPasswordToken);
    
    logInfo(`📊 DEBUG SUMMARY:`, 'DebugHelper');
    logInfo(`📚 TOTAL USERS IN DATABASE: ${allUsers.length}`, 'DebugHelper');
    logInfo(`🔐 USERS WITH RESET TOKENS: ${usersWithTokens.length}`, 'DebugHelper');
    
    // Log users with tokens and detailed comparison
    if (usersWithTokens.length > 0) {
      logInfo(`\n🔎 DETAILED TOKEN COMPARISON:`, 'DebugHelper');
      for (const u of usersWithTokens) {
        // Format date for better readability
        const expiry = u.resetPasswordExpires ? new Date(u.resetPasswordExpires).toLocaleString() : 'N/A';
        const isExpired = u.resetPasswordExpires && u.resetPasswordExpires < new Date();
        const expiryStatus = isExpired ? '⏰ EXPIRED' : '✅ VALID';
        
        // Check if this token is an exact match with our request token
        const isExactMatch = token === u.resetPasswordToken;
        const matchStatus = isExactMatch ? '✅ MATCHING' : '❌ NOT MATCHING';
        
        // Log detailed token information
        logInfo(`\n👤 USER: ${u.email}`, 'DebugHelper');
        logInfo(`🔑 DB TOKEN: "${u.resetPasswordToken}"`, 'DebugHelper');
        logInfo(`📏 DB TOKEN LENGTH: ${u.resetPasswordToken ? u.resetPasswordToken.length : 0} CHARACTERS`, 'DebugHelper');
        logInfo(`⌛ EXPIRY: ${expiry} (${expiryStatus})`, 'DebugHelper');
        logInfo(`🧪 MATCH STATUS: ${matchStatus}`, 'DebugHelper');
        
        // If not matching but very close, try to identify the issue
        if (!isExactMatch && u.resetPasswordToken && token) {
          // Check for whitespace or encoding issues
          const cleanToken = token.trim();
          const cleanDBToken = u.resetPasswordToken.trim();
          const isCleanMatch = cleanToken === cleanDBToken;
          
          if (isCleanMatch) {
            logInfo(`🔍 ISSUE IDENTIFIED: Whitespace differences between tokens!`, 'DebugHelper');
          } else if (token.includes(u.resetPasswordToken) || u.resetPasswordToken.includes(token)) {
            logInfo(`🔍 ISSUE IDENTIFIED: One token is a substring of the other!`, 'DebugHelper');
          }
        }
      }
    } else {
      logInfo(`⚠️ NO USERS WITH RESET TOKENS FOUND IN DATABASE!`, 'DebugHelper');
    }
  },
  
  /**
   * Alias for debugResetToken for backward compatibility
   * @param {string} token - The reset token to debug
   * @param {Object} user - Optional user object for additional context
   */
  logResetTokenDebug: async function(token, user = null) {
    return this.debugResetToken(token, user);
  },
  
  /**
   * Generate debug information for reset password process
   * @param {string} token - Reset token
   * @param {Date} expiresAt - Token expiry date
   * @returns {Object} Debug information
   */
  getResetPasswordDebugInfo: (token, expiresAt) => {
    if (process.env.NODE_ENV !== 'development') {
      return null;
    }
    
    return {
      token,
      expiresAt,
      resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`
    };
  }
};

module.exports = DebugHelper;
