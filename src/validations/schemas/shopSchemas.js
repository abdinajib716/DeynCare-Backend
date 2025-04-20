const Joi = require('joi');
const patterns = require('../validationPatterns');

/**
 * Shop management validation schemas
 */
const shopSchemas = {
  /**
   * Schema for shop creation
   */
  createShop: Joi.object({
    name: patterns.string.shopName.required(),
    address: patterns.string.shopAddress.required(),
    logo: Joi.string().uri().allow('').optional(),
    ownerId: Joi.string().optional(),
    
    // Subscription data
    subscription: Joi.object({
      planType: Joi.string().valid(...patterns.enums.planType).default('monthly'),
      paymentMethod: Joi.string().valid(...patterns.enums.paymentMethod).default('offline'),
      initialPaid: Joi.boolean().default(false),
      paymentDetails: patterns.object.paymentDetails.optional()
    }).optional().default({})
  }),

  /**
   * Schema for updating shop
   */
  updateShop: Joi.object({
    name: patterns.string.shopName.optional(),
    address: patterns.string.shopAddress.optional(),
    isActive: Joi.boolean().optional()
  }),

  /**
   * Schema for shop logo update
   */
  updateLogo: Joi.object({
    logo: Joi.string().uri().required()
      .messages({
        'any.required': 'Logo URL is required',
        'string.uri': 'Logo must be a valid URL'
      })
  }),

  /**
   * Schema for subscription update/renewal
   */
  updateSubscription: Joi.object({
    planType: Joi.string().valid(...patterns.enums.planType).required()
      .messages({
        'any.required': 'Plan type is required',
        'any.only': 'Plan type must be either monthly or yearly'
      }),
    paymentMethod: Joi.string().valid(...patterns.enums.paymentMethod).required()
      .messages({
        'any.required': 'Payment method is required',
        'any.only': 'Payment method must be offline, online, evc, or bank'
      }),
    paymentDetails: patterns.object.paymentDetails.optional()
  })
};

module.exports = shopSchemas;
