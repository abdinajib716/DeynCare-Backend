/**
 * Custom error class for creating consistent, structured errors throughout the application
 * Allows for standardized error handling with status codes and types
 */
class AppError extends Error {
  /**
   * Create a new AppError
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} type - Error type/category
   */
  constructor(message, statusCode = 500, type = 'server_error') {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.isOperational = true; // Used to distinguish operational vs programming errors
    
    Error.captureStackTrace(this, this.constructor);
  }
  
  /**
   * Factory method to create validation error
   * @param {string} message - Error message
   * @returns {AppError} - Validation error instance
   */
  static validationError(message) {
    return new AppError(message, 400, 'validation_error');
  }
  
  /**
   * Factory method to create authentication error
   * @param {string} message - Error message
   * @returns {AppError} - Authentication error instance
   */
  static authError(message) {
    return new AppError(message, 401, 'auth_error');
  }
  
  /**
   * Factory method to create authorization error
   * @param {string} message - Error message
   * @returns {AppError} - Authorization error instance
   */
  static forbiddenError(message) {
    return new AppError(message, 403, 'forbidden_error');
  }
  
  /**
   * Factory method to create not found error
   * @param {string} message - Error message
   * @returns {AppError} - Not found error instance
   */
  static notFoundError(message) {
    return new AppError(message, 404, 'not_found_error');
  }
  
  /**
   * Factory method to create conflict error
   * @param {string} message - Error message
   * @returns {AppError} - Conflict error instance
   */
  static conflictError(message) {
    return new AppError(message, 409, 'conflict_error');
  }
}

module.exports = AppError;
