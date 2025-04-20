/**
 * Utility for generating verification codes
 */

/**
 * Generate a random numeric code
 * @param {number} length - Length of the code (default: 6)
 * @returns {string} - Generated code
 */
const generateVerificationCode = (length = 6) => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const code = Math.floor(min + Math.random() * (max - min + 1));
  return code.toString();
};

/**
 * Generate a random string token
 * @param {number} length - Length of the token (default: 64)
 * @returns {string} - Generated token
 */
const generateToken = (length = 64) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

/**
 * Calculate token expiry date
 * @param {number} hours - Hours from now (default: 24)
 * @returns {Date} - Expiry date
 */
const calculateExpiry = (hours = 24) => {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry;
};

module.exports = {
  generateVerificationCode,
  generateToken,
  calculateExpiry
};
