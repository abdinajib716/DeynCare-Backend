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
  })
};

module.exports = userSchemas;
