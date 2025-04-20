const AppError = require('./AppError');
const { logError } = require('../logger.js');

/**
 * Central error handler with reusable error messages and logging
 */
const ErrorHandler = {
  // Reusable error message templates
  messages: {
    // Authentication errors
    invalidCredentials: 'Invalid email or password',
    accountDisabled: 'Your account has been disabled. Please contact an administrator',
    emailNotVerified: 'Please verify your email address to continue',
    tokenExpired: 'Your session has expired. Please login again',
    unauthorized: 'You are not authorized to perform this action',
    forbidden: 'You do not have permission to access this resource',
    
    // Validation errors
    missingField: (field) => `${field} is required`,
    invalidFormat: (field) => `${field} format is invalid`,
    tooShort: (field, min) => `${field} must be at least ${min} characters`,
    outOfRange: (field, min, max) => `${field} must be between ${min} and ${max}`,
    
    // Resource errors
    notFound: (resource) => `${resource} not found`,
    alreadyExists: (resource) => `${resource} already exists`,
    conflict: (message) => message || 'Resource conflict',
    
    // System errors
    internalError: 'An internal server error occurred',
    serviceUnavailable: 'Service temporarily unavailable',
    networkError: 'Network error, please try again',
    databaseError: 'Database operation failed',
    
    // Business logic errors
    insufficientFunds: 'Insufficient funds to complete operation',
    limitExceeded: 'Operation limit exceeded',
    operationFailed: 'Operation failed, please try again'
  },
  
  /**
   * Log an error and return an AppError instance
   * @param {Error|AppError} error - The error object
   * @param {string} location - Where the error occurred (e.g., 'AuthService', 'UserController') 
   * @param {boolean} throwError - Whether to throw the error after logging (default: false)
   * @returns {AppError} - The error instance
   */
  handleError(error, location = 'Server', throwError = false) {
    // If it's already an AppError, just log it
    if (error instanceof AppError) {
      logError(error.message, location, error);
      
      if (throwError) {
        throw error;
      }
      
      return error;
    }
    
    // Otherwise, create a new AppError
    const statusCode = error.statusCode || 500;
    const type = error.type || 'server_error';
    const message = error.message || this.messages.internalError;
    
    const appError = new AppError(message, statusCode, type);
    
    // Log the error
    logError(message, location, error);
    
    if (throwError) {
      throw appError;
    }
    
    return appError;
  },
  
  /**
   * Create and log a validation error
   * @param {string} message - Error message
   * @param {string} location - Where the error occurred
   * @param {Object} data - Additional error data
   * @returns {AppError} - The AppError instance
   */
  validationError(message, location, data = null) {
    const error = new AppError(message, 400, 'validation_error');
    
    if (data) error.data = data;
    
    logError(message, location, error);
    return error;
  },
  
  /**
   * Create and log a not found error
   * @param {string} message - Error message
   * @param {string} location - Where the error occurred
   * @returns {AppError} - The AppError instance
   */
  notFoundError(message, location) {
    const error = new AppError(message, 404, 'not_found');
    
    logError(message, location, error);
    return error;
  },
  
  /**
   * Create and log an unauthorized error
   * @param {string} message - Error message
   * @param {string} location - Where the error occurred
   * @returns {AppError} - The AppError instance
   */
  unauthorizedError(message, location) {
    const error = new AppError(message, 401, 'auth_error');
    
    logError(message, location, error);
    return error;
  },
  
  /**
   * Create and log a forbidden error
   * @param {string} message - Error message
   * @param {string} location - Where the error occurred
   * @returns {AppError} - The AppError instance
   */
  forbiddenError(message, location) {
    const error = new AppError(message, 403, 'access_denied');
    
    logError(message, location, error);
    return error;
  },
  
  /**
   * Create and log a conflict error
   * @param {string} message - Error message
   * @param {string} location - Where the error occurred
   * @returns {AppError} - The AppError instance
   */
  conflictError(message, location) {
    const error = new AppError(message, 409, 'conflict');
    
    logError(message, location, error);
    return error;
  },
  
  /**
   * Create and log a server error
   * @param {string} message - Error message
   * @param {string} location - Where the error occurred
   * @returns {AppError} - The AppError instance
   */
  serverError(message, location) {
    const error = new AppError(message || this.messages.internalError, 500, 'server_error');
    
    logError(message, location, error);
    return error;
  }
};

module.exports = ErrorHandler;
