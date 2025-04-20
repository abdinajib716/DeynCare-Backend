const Joi = require('joi');
const { ErrorResponse } = require('../utils');

// Import validation schemas from centralized location
const authSchemas = require('../validations/schemas/authSchemas');
const userSchemas = require('../validations/schemas/userSchemas');
const shopSchemas = require('../validations/schemas/shopSchemas');

/**
 * Factory function to create Joi validation middleware
 * @param {Joi.Schema} schema - Joi schema for validation
 * @returns {Function} Express middleware
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false 
    });
    
    if (error) {
      // Map Joi errors to readable format
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      
      return res.status(400).json(
        ErrorResponse.create('Validation error', 400, 'validation_error', errorDetails)
      );
    }
    
    // If validation succeeds, pass validated data to req.validatedData
    req.validatedData = schema.validate(req.body, { stripUnknown: true }).value;
    next();
  };
};

module.exports = {
  validate,
  authSchemas,
  userSchemas,
  shopSchemas
};
