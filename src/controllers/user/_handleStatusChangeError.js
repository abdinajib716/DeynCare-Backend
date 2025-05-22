const { AppError, logError } = require('../../utils');

/**
 * Handle error during user status change
 * @param {Error} error - The error object
 * @param {Function} next - Express next function
 * @param {string} message - Error message
 * @private
 */
const _handleStatusChangeError = (error, next, message) => {
  // Log error through proper logging utility
  logError(`Error changing user status: ${error.message}`, 'UserController', error);
  
  // Check for specific error types
  if (error instanceof AppError) {
    return next(error);
  } else if (error.name === 'ValidationError') {
    // Mongoose validation error
    return next(new AppError(`Validation error: ${error.message}`, 400, 'validation_error'));
  } else if (error.name === 'CastError') {
    // Mongoose casting error
    return next(new AppError(`Invalid ID format: ${error.message}`, 400, 'invalid_id'));
  }
  
  // Changed from `req.params.userId` to a more generic error since req is not accessible here
  logError(`Error changing user status`, 'UserController', error);
  return next(new AppError(message, 500, 'user_status_change_error'));
};

module.exports = _handleStatusChangeError;
