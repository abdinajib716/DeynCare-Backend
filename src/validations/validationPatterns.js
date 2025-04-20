const Joi = require('joi');

/**
 * Common validation patterns to ensure consistency across schemas
 */
const validationPatterns = {
  /**
   * Common string field patterns
   */
  string: {
    email: Joi.string().email().messages({
      'string.email': 'Valid email address is required',
      'any.required': 'Email is required'
    }),
    
    password: Joi.string().min(8).messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'Password is required'
    }),
    
    phone: Joi.string().pattern(/^\+[1-9]\d{6,14}$/).messages({
      'string.pattern.base': 'Phone number must be in international format (e.g. +252xxxxxxxx)',
      'any.required': 'Phone number is required'
    }),
    
    fullName: Joi.string().trim().min(3).max(100).messages({
      'string.min': 'Full name must be at least 3 characters',
      'string.max': 'Full name cannot exceed 100 characters',
      'any.required': 'Full name is required'
    }),
    
    shopName: Joi.string().trim().min(2).max(100).messages({
      'string.min': 'Shop name must be at least 2 characters',
      'string.max': 'Shop name cannot exceed 100 characters',
      'any.required': 'Shop name is required'
    }),
    
    shopAddress: Joi.string().trim().min(5).max(200).messages({
      'string.min': 'Shop address must be at least 5 characters',
      'string.max': 'Shop address cannot exceed 200 characters',
      'any.required': 'Shop address is required'
    }),
    
    transactionId: Joi.string().alphanum().min(4).max(50).messages({
      'string.min': 'Transaction ID must be at least 4 characters',
      'string.max': 'Transaction ID cannot exceed 50 characters',
      'string.alphanum': 'Transaction ID must contain only letters and numbers',
      'any.required': 'Transaction ID is required'
    })
  },
  
  /**
   * Common object patterns
   */
  object: {
    paymentDetails: Joi.object({
      phoneNumber: Joi.string().pattern(/^\+[1-9]\d{6,14}$/)
        .messages({
          'string.pattern.base': 'Payment phone number must be in international format'
        }),
      transactionId: Joi.string().alphanum().min(4).max(50)
        .messages({
          'string.min': 'Transaction ID must be at least 4 characters',
          'string.max': 'Transaction ID cannot exceed 50 characters',
          'string.alphanum': 'Transaction ID must contain only letters and numbers'
        })
    })
  },
  
  /**
   * Common enum values
   */
  enums: {
    planType: ['trial', 'monthly', 'yearly'],
    paymentMethod: ['offline', 'online', 'evc', 'bank'],
    userRole: ['superAdmin', 'admin', 'employee']
  }
};

module.exports = validationPatterns;
