const AppError = require('./AppError');

/**
 * Utility class for formatting error responses to the client
 * Ensures consistent error format throughout the application
 */
class ErrorResponse {
  /**
   * Create a standardized error response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} type - Error type/category
   * @param {Object} data - Additional error data (optional)
   * @returns {Object} - Standardized error response
   */
  static create(message, statusCode = 500, type = 'server_error', data = null) {
    const response = {
      success: false,
      message,
      statusCode,
      type
    };
    
    if (data) {
      response.data = data;
    }
    
    return response;
  }
  
  /**
   * Create an error response from an AppError instance
   * @param {Error} error - Error object (AppError or standard Error)
   * @returns {Object} - Standardized error response
   */
  static fromError(error) {
    // Handle AppError instances
    if (error instanceof AppError) {
      return this.create(
        error.message,
        error.statusCode,
        error.type,
        error.data
      );
    }
    
    // Handle validation errors from mongoose (if applicable)
    if (error.name === 'ValidationError') {
      const errors = {};
      
      // Extract field errors from mongoose validation
      for (const field in error.errors) {
        errors[field] = error.errors[field].message;
      }
      
      return this.create(
        'Validation error',
        400,
        'validation_error',
        { errors }
      );
    }
    
    // Handle duplicate key errors from MongoDB
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];
      
      return this.create(
        `Duplicate value: ${field} already exists with value '${value}'`,
        409,
        'conflict_error'
      );
    }
    
    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
      return this.create(
        'Invalid token',
        401,
        'auth_error'
      );
    }
    
    if (error.name === 'TokenExpiredError') {
      return this.create(
        'Token expired',
        401,
        'auth_error'
      );
    }
    
    // Default case for unhandled errors
    // In production, hide the original message for security
    const isProd = process.env.NODE_ENV === 'production';
    const message = isProd ? 'Something went wrong' : error.message;
    
    return this.create(
      message,
      500,
      'server_error'
    );
  }
  
  /**
   * Create a validation error response
   * @param {string} message - Error message
   * @param {Object} errors - Field validation errors
   * @returns {Object} - Standardized error response
   */
  static validation(message = 'Validation error', errors = null) {
    return this.create(
      message,
      400,
      'validation_error',
      errors ? { errors } : null
    );
  }
  
  /**
   * Create an unauthorized error response
   * @param {string} message - Error message
   * @returns {Object} - Standardized error response
   */
  static unauthorized(message = 'Unauthorized access') {
    return this.create(message, 401, 'auth_error');
  }
  
  /**
   * Create a not found error response
   * @param {string} message - Error message
   * @returns {Object} - Standardized error response
   */
  static notFound(message = 'Resource not found') {
    return this.create(message, 404, 'not_found');
  }
}

module.exports = ErrorResponse;
