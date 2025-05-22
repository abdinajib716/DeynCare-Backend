/**
 * Sanitize user data for API response
 * @param {Object} user - User document or object
 * @returns {Promise<Object>} Sanitized user data
 */
const sanitizeUserForResponse = async (user) => {
  if (!user) return null;
  
  // Import here to avoid circular dependency issues
  const populateShopNames = require('./populateShopNames');
  
  // Convert to plain object if it's a Mongoose document
  const userData = user.toObject ? user.toObject() : { ...user };
  
  // Remove sensitive fields
  delete userData.password;
  delete userData.resetPasswordToken;
  delete userData.resetPasswordExpires;
  delete userData.verificationCode;
  delete userData.verificationCodeExpires;
  delete userData.passwordHistory;
  delete userData.__v;
  
  // Include isDeleted and _id for admin use only
  // In most cases these should be excluded for regular API responses
  
  // Populate shop name
  const populatedUser = await populateShopNames(userData);
  
  return populatedUser;
};

module.exports = sanitizeUserForResponse;
