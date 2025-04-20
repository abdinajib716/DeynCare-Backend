/**
 * Password generator utility functions for the DeynCare backend
 */

const crypto = require('crypto');

/**
 * Generates a cryptographically secure random password
 * @param {number} length - Length of the password to generate (default: 12)
 * @param {boolean} includeSpecial - Whether to include special characters (default: true)
 * @param {boolean} includeNumbers - Whether to include numbers (default: true)
 * @param {boolean} includeUppercase - Whether to include uppercase letters (default: true)
 * @param {boolean} includeLowercase - Whether to include lowercase letters (default: true)
 * @returns {string} - A secure random password
 */
const generateSecurePassword = (
  length = 12,
  includeSpecial = true,
  includeNumbers = true,
  includeUppercase = true,
  includeLowercase = true
) => {
  // Define character sets
  const numbers = '0123456789';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  // Create the character pool based on options
  let chars = '';
  if (includeNumbers) chars += numbers;
  if (includeLowercase) chars += lowercase;
  if (includeUppercase) chars += uppercase;
  if (includeSpecial) chars += special;
  
  // Default to alphanumeric if nothing selected
  if (chars.length === 0) {
    chars = numbers + lowercase + uppercase;
  }
  
  // Generate the password
  let password = '';
  const randomBytes = crypto.randomBytes(length * 2); // Get more bytes than needed for better distribution
  
  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] % chars.length;
    password += chars[randomIndex];
  }
  
  // Ensure the password meets minimum requirements if options are enabled
  const hasLower = includeLowercase ? /[a-z]/.test(password) : true;
  const hasUpper = includeUppercase ? /[A-Z]/.test(password) : true;
  const hasNumber = includeNumbers ? /[0-9]/.test(password) : true;
  const hasSpecial = includeSpecial ? /[^a-zA-Z0-9]/.test(password) : true;
  
  // If any requirements not met, try again recursively (unlikely but possible)
  if (!hasLower || !hasUpper || !hasNumber || !hasSpecial) {
    return generateSecurePassword(
      length,
      includeSpecial,
      includeNumbers,
      includeUppercase,
      includeLowercase
    );
  }
  
  return password;
};

/**
 * Validates a password against strength requirements
 * @param {string} password - The password to validate
 * @param {number} minLength - Minimum password length (default: 8)
 * @param {boolean} requireSpecial - Whether to require special characters (default: true)
 * @param {boolean} requireNumbers - Whether to require numbers (default: true)
 * @param {boolean} requireUppercase - Whether to require uppercase letters (default: true)
 * @param {boolean} requireLowercase - Whether to require lowercase letters (default: true)
 * @returns {Object} - { valid: boolean, reasons: string[] }
 */
const validatePasswordStrength = (
  password,
  minLength = 8,
  requireSpecial = true,
  requireNumbers = true,
  requireUppercase = true,
  requireLowercase = true
) => {
  const reasons = [];
  
  if (password.length < minLength) {
    reasons.push(`Password must be at least ${minLength} characters long`);
  }
  
  if (requireLowercase && !/[a-z]/.test(password)) {
    reasons.push('Password must contain at least one lowercase letter');
  }
  
  if (requireUppercase && !/[A-Z]/.test(password)) {
    reasons.push('Password must contain at least one uppercase letter');
  }
  
  if (requireNumbers && !/[0-9]/.test(password)) {
    reasons.push('Password must contain at least one number');
  }
  
  if (requireSpecial && !/[^a-zA-Z0-9]/.test(password)) {
    reasons.push('Password must contain at least one special character');
  }
  
  return {
    valid: reasons.length === 0,
    reasons
  };
};

module.exports = {
  generateSecurePassword,
  validatePasswordStrength
};
