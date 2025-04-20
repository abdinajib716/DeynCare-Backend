/**
 * Helper functions for standardized API responses
 */
const ResponseHelper = {
  /**
   * Send a success response
   * @param {Object} res - Express response object
   * @param {string} message - Success message
   * @param {Object} data - Response data
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  success: (res, message, data = null, statusCode = 200) => {
    const response = {
      success: true,
      message
    };

    if (data !== null) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  },

  /**
   * Send an error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (default: 400)
   * @param {string} errorCode - Error code for client
   * @param {Object} details - Additional error details
   */
  error: (res, message, statusCode = 400, errorCode = 'error', details = null) => {
    const response = {
      success: false,
      message,
      statusCode,
      errorCode
    };

    if (details) {
      response.details = details;
    }

    return res.status(statusCode).json(response);
  },

  /**
   * Send a validation error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {Array} errors - Validation errors
   */
  validationError: (res, message = 'Validation error', errors) => {
    return ResponseHelper.error(
      res,
      message,
      400,
      'validation_error',
      { errors }
    );
  }
};

module.exports = ResponseHelper;
