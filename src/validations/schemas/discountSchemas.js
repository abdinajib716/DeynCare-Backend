/**
 * Discount Code Validation Schemas
 */
const Joi = require('joi');

/**
 * Discount Code validation schemas for various operations
 */
const discountSchemas = {
  // Schema for creating a new discount code
  create: Joi.object({
    code: Joi.string().min(3).max(20).required()
      .messages({
        'string.min': 'Discount code must be at least 3 characters',
        'string.max': 'Discount code cannot exceed 20 characters',
        'any.required': 'Discount code is required'
      }),
    
    description: Joi.string().min(5).max(500).required()
      .messages({
        'string.min': 'Description must be at least 5 characters',
        'string.max': 'Description cannot exceed 500 characters',
        'any.required': 'Description is required'
      }),
    
    type: Joi.string().valid('fixed', 'percentage').required()
      .messages({
        'any.only': 'Type must be either "fixed" or "percentage"',
        'any.required': 'Discount type is required'
      }),
    
    value: Joi.number().positive().required()
      .messages({
        'number.positive': 'Discount value must be positive',
        'any.required': 'Discount value is required'
      }),
    
    minimumPurchase: Joi.number().min(0).default(0)
      .messages({
        'number.min': 'Minimum purchase amount cannot be negative'
      }),
    
    maxDiscountAmount: Joi.number().positive().allow(null).default(null)
      .messages({
        'number.positive': 'Maximum discount amount must be positive'
      }),
    
    startDate: Joi.date().default(() => new Date())
      .messages({
        'date.base': 'Start date must be a valid date'
      }),
    
    expiryDate: Joi.date().greater(Joi.ref('startDate')).required()
      .messages({
        'date.greater': 'Expiry date must be after start date',
        'any.required': 'Expiry date is required'
      }),
    
    usageLimit: Joi.number().integer().min(1).allow(null).default(null)
      .messages({
        'number.integer': 'Usage limit must be an integer',
        'number.min': 'Usage limit must be at least 1'
      }),
    
    perUserLimit: Joi.number().integer().min(1).default(1)
      .messages({
        'number.integer': 'Per user limit must be an integer',
        'number.min': 'Per user limit must be at least 1'
      }),
    
    applicableFor: Joi.array().items(
      Joi.string().valid('subscription', 'pos', 'debt', 'all')
    ).default(['subscription', 'pos'])
      .messages({
        'array.base': 'Applicable for must be an array',
        'any.only': 'Applicable for must contain valid options (subscription, pos, debt, all)'
      }),
    
    shopId: Joi.string().allow(null).default(null)
      .messages({
        'string.base': 'Shop ID must be a string'
      }),
    
    isActive: Joi.boolean().default(true)
  }),
  
  // Schema for updating an existing discount code
  update: Joi.object({
    description: Joi.string().min(5).max(500)
      .messages({
        'string.min': 'Description must be at least 5 characters',
        'string.max': 'Description cannot exceed 500 characters'
      }),
    
    type: Joi.string().valid('fixed', 'percentage')
      .messages({
        'any.only': 'Type must be either "fixed" or "percentage"'
      }),
    
    value: Joi.number().positive()
      .messages({
        'number.positive': 'Discount value must be positive'
      }),
    
    minimumPurchase: Joi.number().min(0)
      .messages({
        'number.min': 'Minimum purchase amount cannot be negative'
      }),
    
    maxDiscountAmount: Joi.number().positive().allow(null)
      .messages({
        'number.positive': 'Maximum discount amount must be positive'
      }),
    
    startDate: Joi.date()
      .messages({
        'date.base': 'Start date must be a valid date'
      }),
    
    expiryDate: Joi.date()
      .messages({
        'date.base': 'Expiry date must be a valid date'
      }),
    
    usageLimit: Joi.number().integer().min(1).allow(null)
      .messages({
        'number.integer': 'Usage limit must be an integer',
        'number.min': 'Usage limit must be at least 1'
      }),
    
    perUserLimit: Joi.number().integer().min(1)
      .messages({
        'number.integer': 'Per user limit must be an integer',
        'number.min': 'Per user limit must be at least 1'
      }),
    
    applicableFor: Joi.array().items(
      Joi.string().valid('subscription', 'pos', 'debt', 'all')
    ).messages({
        'array.base': 'Applicable for must be an array',
        'any.only': 'Applicable for must contain valid options (subscription, pos, debt, all)'
      }),
    
    isActive: Joi.boolean()
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),
  
  // Schema for validating a discount code
  validate: Joi.object({
    code: Joi.string().required()
      .messages({
        'any.required': 'Discount code is required'
      }),
    
    amount: Joi.number().positive().required()
      .messages({
        'number.positive': 'Purchase amount must be positive',
        'any.required': 'Purchase amount is required'
      }),
    
    context: Joi.string().valid('subscription', 'pos', 'debt').default('subscription')
      .messages({
        'any.only': 'Context must be one of: subscription, pos, debt'
      }),
    
    userId: Joi.string().required()
      .messages({
        'any.required': 'User ID is required'
      }),
    
    shopId: Joi.string().allow(null)
      .messages({
        'string.base': 'Shop ID must be a string'
      })
  })
};

module.exports = discountSchemas;
