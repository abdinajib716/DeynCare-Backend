/**
 * Helper for validating user inputs with consistent rules and error messages
 */
const ValidationHelper = {
  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} - Is email valid
   */
  isValidEmail: (email) => {
    if (!email) return false;
    
    // RFC 5322 compliant regex - handles most valid email formats
    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return emailRegex.test(email.toLowerCase());
  },
  
  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @param {Object} options - Validation options
   * @param {number} options.minLength - Minimum length (default: 8)
   * @param {boolean} options.requireNumber - Require at least one number (default: true)
   * @param {boolean} options.requireSpecial - Require special character (default: true)
   * @param {boolean} options.requireUpperLower - Require both upper and lowercase (default: true)
   * @returns {Object} - Validation result with isValid flag and reason
   */
  validatePasswordStrength: (password, options = {}) => {
    const {
      minLength = 8,
      requireNumber = true,
      requireSpecial = true,
      requireUpperLower = true
    } = options;
    
    const result = {
      isValid: true,
      reason: null
    };
    
    // Check minimum length
    if (password.length < minLength) {
      result.isValid = false;
      result.reason = `Password must be at least ${minLength} characters long`;
      return result;
    }
    
    // Check for numbers if required
    if (requireNumber && !/\d/.test(password)) {
      result.isValid = false;
      result.reason = 'Password must contain at least one number';
      return result;
    }
    
    // Check for special characters if required
    if (requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      result.isValid = false;
      result.reason = 'Password must contain at least one special character';
      return result;
    }
    
    // Check for both uppercase and lowercase if required
    if (requireUpperLower && (!/[a-z]/.test(password) || !/[A-Z]/.test(password))) {
      result.isValid = false;
      result.reason = 'Password must contain both uppercase and lowercase letters';
      return result;
    }
    
    return result;
  },
  
  /**
   * Normalize an email address for consistent storage
   * @param {string} email - Email to normalize
   * @returns {string} - Normalized email (lowercase, trimmed)
   */
  normalizeEmail: (email) => {
    if (!email) return '';
    return email.toLowerCase().trim();
  },
  
  /**
   * Validate a phone number
   * @param {string} phone - Phone number to validate
   * @returns {boolean} - Is phone number valid
   */
  isValidPhone: (phone) => {
    if (!phone) return false;
    
    // Remove any non-numeric characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check if it has a reasonable length (different countries have different formats)
    return cleanPhone.length >= 8 && cleanPhone.length <= 15;
  },
  
  /**
   * Normalize a phone number for consistent storage
   * @param {string} phone - Phone number to normalize
   * @returns {string} - Normalized phone number
   */
  normalizePhone: (phone) => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  },
  
  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} - Is URL valid
   */
  isValidUrl: (url) => {
    if (!url) return false;
    
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }
};

module.exports = ValidationHelper;
