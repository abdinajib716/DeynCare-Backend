const { AppError, logError } = require('../../utils');

/**
 * Standard error handler for controller methods
 * @param {Error} error - The error object
 * @param {Function} next - Express next function
 * @param {string} defaultMessage - Default error message
 * @private
 */
const _handleError = (error, next, defaultMessage = 'Operation failed') => {
  if (error instanceof AppError) {
    return next(error);
  }
  
  // Handle validation errors
  if (error.name === 'ValidationError') {
    return next(new AppError(error.message, 400, 'validation_error'));
  }
  
  // Handle duplicate key errors
  if (error.code === 11000) {
    return next(new AppError('Duplicate entry found', 409, 'duplicate_error'));
  }
  
  // Default server error
  return next(new AppError(defaultMessage, 500, 'server_error'));
};

module.exports = _handleError;
