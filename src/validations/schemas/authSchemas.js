const Joi = require('joi');
const patterns = require('../validationPatterns');

/**
 * Authentication and account management validation schemas
 */
const authSchemas = {
  register: Joi.object({
    // User data (required)
    fullName: patterns.string.fullName.required()
      .messages({
        'string.min': 'Full name must be at least 3 characters',
        'string.max': 'Full name cannot exceed 100 characters',
        'any.required': 'Full name is required'
      }),
    email: patterns.string.email.required()
      .messages({
        'string.email': 'Valid email address is required',
        'any.required': 'Email is required'
      }),
    phone: patterns.string.phone.required()
      .messages({
        'string.pattern.base': 'Phone number must be in international format (e.g. +252xxxxxxxx)',
        'any.required': 'Phone number is required'
      }),
    password: patterns.string.password.required()
      .messages({
        'string.min': 'Password must be at least 8 characters',
        'any.required': 'Password is required'
      }),
      
    // Shop data (optional as a group, but required if any shop field provided)
    shopName: patterns.string.shopName.optional()
      .messages({
        'string.min': 'Shop name must be at least 2 characters',
        'string.max': 'Shop name cannot exceed 100 characters'
      }),
    shopAddress: patterns.string.shopAddress.optional()
      .messages({
        'string.min': 'Shop address must be at least 5 characters',
        'string.max': 'Shop address cannot exceed 200 characters'
      }),
      
    // Ensure shopName and shopAddress are provided together
    shopLogo: Joi.string().uri().allow('').optional(),
    
    // Subscription data with defaults and validation
    planType: Joi.string().valid(...patterns.enums.planType).default('trial'),
    registeredBy: Joi.string().valid('self', 'superAdmin').default('self'),
    paymentMethod: Joi.string().valid('Cash', 'EVC Plus', 'Bank Transfer', 'Mobile Money', 'Check', 'Card', 'Other', 'offline').default('offline'),
    initialPaid: Joi.boolean().default(false),
    
    // Payment details (conditionally required if initialPaid is true)
    paymentDetails: patterns.object.paymentDetails.optional()
  }).custom((value, helpers) => {
    // Custom validation to ensure shop details are provided together
    const { shopName, shopAddress } = value;
    
    if ((shopName && !shopAddress) || (!shopName && shopAddress)) {
      return helpers.error('object.shopDetailsRequired');
    }
    
    // Check if initial payment is made, payment details should be provided
    const { initialPaid, paymentDetails } = value;
    
    if (initialPaid && (!paymentDetails || Object.keys(paymentDetails).length === 0)) {
      return helpers.error('object.paymentDetailsRequired');
    }
    
    return value;
  }).messages({
    'object.shopDetailsRequired': 'Both shop name and address must be provided together',
    'object.paymentDetailsRequired': 'Payment details are required when initial payment is made'
  }),
  
  // Schema for admin creating employee users
  createEmployee: Joi.object({
    // Basic user information
    fullName: patterns.string.fullName.required()
      .messages({
        'string.min': 'Full name must be at least 3 characters',
        'string.max': 'Full name cannot exceed 100 characters',
        'any.required': 'Full name is required'
      }),
    email: patterns.string.email.required()
      .messages({
        'string.email': 'Valid email address is required',
        'any.required': 'Email is required'
      }),
    phone: patterns.string.phone.required()
      .messages({
        'string.pattern.base': 'Phone number must be in international format (e.g. +252xxxxxxxx)',
        'any.required': 'Phone number is required'
      }),
    
    // Auto-generate password or specify it
    password: patterns.string.password.optional()
      .messages({
        'string.min': 'Password must be at least 8 characters'
      }),
    generatePassword: Joi.boolean().default(true),
    
    // Permissions for the employee
    permissions: Joi.array().items(
      Joi.string().valid(
        'manage_customers', 
        'manage_products', 
        'manage_inventory',
        'process_payments',
        'manage_debts',
        'process_sales',
        'view_reports',
        'export_data'
      )
    ).default([]),
    
    // Employee position and details
    position: Joi.string().max(100).optional()
      .messages({
        'string.max': 'Position cannot exceed 100 characters'
      }),
    
    // Optional note
    note: Joi.string().max(500).optional()
      .messages({
        'string.max': 'Note cannot exceed 500 characters'
      })
  }),

  verifyEmail: Joi.object({
    email: patterns.string.email.required()
      .messages({
        'string.email': 'Valid email address is required',
        'any.required': 'Email is required'
      }),
    verificationCode: Joi.string().min(6).max(6).required()
      .messages({
        'string.min': 'Verification code must be 6 characters',
        'string.max': 'Verification code must be 6 characters',
        'any.required': 'Verification code is required'
      })
  }),

  login: Joi.object({
    email: patterns.string.email.required()
      .messages({
        'string.email': 'Valid email address is required',
        'any.required': 'Email is required'
      }),
    password: Joi.string().required()
      .messages({
        'any.required': 'Password is required'
      }),
    rememberMe: Joi.boolean().default(false)
  }),

  forgotPassword: Joi.object({
    email: patterns.string.email.required()
      .messages({
        'string.email': 'Valid email address is required',
        'any.required': 'Email is required'
      })
  }),

  resetPassword: Joi.object({
    token: Joi.string().required()
      .messages({
        'any.required': 'Reset token is required'
      }),
    newPassword: patterns.string.password.required()
      .messages({
        'string.min': 'Password must be at least 8 characters',
        'any.required': 'Password is required'
      }),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
      .messages({
        'any.only': 'Passwords do not match',
        'any.required': 'Password confirmation is required'
      })
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required()
      .messages({
        'any.required': 'Current password is required'
      }),
    newPassword: patterns.string.password.required()
      .messages({
        'string.min': 'New password must be at least 8 characters',
        'any.required': 'New password is required'
      }),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
      .messages({
        'any.only': 'Passwords do not match',
        'any.required': 'Password confirmation is required'
      })
  })
};

module.exports = authSchemas;
