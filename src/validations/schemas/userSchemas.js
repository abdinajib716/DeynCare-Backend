const Joi = require('joi');
const patterns = require('../validationPatterns');

/**
 * User management validation schemas
 */
const userSchemas = {
  /**
   * Schema for user creation by admin
   */
  createUser: Joi.object({
    fullName: patterns.string.fullName.required(),
    email: patterns.string.email.required(),
    phone: patterns.string.phone.required(),
    password: patterns.string.password.required(),
    role: Joi.string().valid(...patterns.enums.userRole).required()
      .messages({
        'any.only': 'Role must be valid',
        'any.required': 'Role is required'
      }),
    shopId: Joi.string().required()
      .messages({
        'any.required': 'Shop ID is required'
      }),
    isActive: Joi.boolean().default(true)
  }),

  /**
   * Schema for updating user
   */
  updateUser: Joi.object({
    fullName: patterns.string.fullName.optional(),
    phone: patterns.string.phone.optional(),
    role: Joi.string().valid(...patterns.enums.userRole).optional()
      .messages({
        'any.only': 'Role must be valid'
      }),
    isActive: Joi.boolean().optional()
  }),

  /**
   * Schema for updating user profile (by the user themselves)
   */
  updateProfile: Joi.object({
    fullName: patterns.string.fullName.optional(),
    phone: patterns.string.phone.optional()
  }),

  /**
   * Schema for changing user status
   */
  changeUserStatus: Joi.object({
    status: Joi.string().valid('active', 'inactive', 'suspended').required()
      .messages({
        'any.only': 'Status must be valid: active, inactive, or suspended',
        'any.required': 'Status is required'
      }),
    reason: Joi.string().min(5).max(200)
      .when('status', {
        is: 'suspended',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        'string.min': 'Reason must be at least 5 characters long',
        'string.max': 'Reason cannot exceed 200 characters',
        'any.required': 'Reason is required when suspending a user'
      })
  }),

  /**
   * Schema for deleting a user
   */
  deleteUser: Joi.object({
    reason: Joi.string().min(5).max(200).required()
      .messages({
        'string.min': 'Reason must be at least 5 characters long',
        'string.max': 'Reason cannot exceed 200 characters',
        'any.required': 'Reason is required for user deletion'
      })
  })
};

module.exports = userSchemas;
