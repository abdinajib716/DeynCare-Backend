/**
 * Subscription validation schemas
 * Defines validation rules for subscription management endpoints
 */
const Joi = require('joi');
const patterns = require('../validationPatterns');

/**
 * Subscription validation schemas
 */
const subscriptionSchemas = {
  // Create a new subscription
  createSubscription: Joi.object({
    shopId: Joi.string().required()
      .messages({
        'any.required': 'Shop ID is required'
      }),
    planType: Joi.string().valid('trial', 'monthly', 'yearly').default('trial')
      .messages({
        'any.only': 'Plan type must be one of: trial, monthly, yearly'
      }),
    paymentMethod: Joi.string().valid('offline', 'evc_plus', 'free')
      .when('planType', {
        is: Joi.string().valid('monthly', 'yearly'),
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        'any.required': 'Payment method is required for paid plans'
      }),
    paymentDetails: Joi.object({
      transactionId: Joi.string().trim(),
      amount: Joi.number().positive(),
      receiptUrl: Joi.string().uri(),
      payerName: Joi.string().trim(),
      payerPhone: patterns.string.phone,
      payerEmail: patterns.string.email,
      notes: Joi.string().max(500)
    }).when('planType', {
      is: Joi.string().valid('monthly', 'yearly'),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }),

  // Upgrade from trial or change plan
  upgradeSubscription: Joi.object({
    planType: Joi.string().valid('monthly', 'yearly').required()
      .messages({
        'any.only': 'Plan type must be either monthly or yearly',
        'any.required': 'Plan type is required'
      }),
    paymentMethod: Joi.string().valid('offline', 'evc_plus').required()
      .messages({
        'any.required': 'Payment method is required'
      }),
    paymentDetails: Joi.object({
      transactionId: Joi.string().trim(),
      amount: Joi.number().positive(),
      receiptUrl: Joi.string().uri(),
      payerName: Joi.string().trim(),
      payerPhone: patterns.string.phone,
      payerEmail: patterns.string.email,
      notes: Joi.string().max(500)
    }).required()
    .messages({
      'any.required': 'Payment details are required'
    })
  }),

  // Record a payment for an existing subscription
  recordPayment: Joi.object({
    amount: Joi.number().positive().required()
      .messages({
        'any.required': 'Payment amount is required',
        'number.positive': 'Payment amount must be positive'
      }),
    transactionId: Joi.string().trim().required()
      .messages({
        'any.required': 'Transaction ID is required'
      }),
    paymentMethod: Joi.string().valid('offline', 'evc_plus').required()
      .messages({
        'any.required': 'Payment method is required'
      }),
    currency: Joi.string().default('USD'),
    notes: Joi.string().max(500)
  }),

  // Cancel subscription
  cancelSubscription: Joi.object({
    reason: Joi.string().max(500),
    feedback: Joi.string().max(1000),
    immediateEffect: Joi.boolean().default(false)
      .messages({
        'boolean.base': 'Immediate effect must be a boolean value'
      })
  }),

  // Update auto-renewal settings
  updateAutoRenewal: Joi.object({
    autoRenew: Joi.boolean().required()
      .messages({
        'any.required': 'Auto-renewal setting is required',
        'boolean.base': 'Auto-renewal must be a boolean value'
      })
  }),

  // Renew a subscription
  renewSubscription: Joi.object({
    paymentMethod: Joi.string().valid('offline', 'evc_plus').required()
      .messages({
        'any.required': 'Payment method is required'
      }),
    transactionId: Joi.string().trim().required()
      .messages({
        'any.required': 'Transaction ID is required'
      }),
    amount: Joi.number().positive(),
    currency: Joi.string().default('USD'),
    notes: Joi.string().max(500)
  }),

  // Extend a subscription (admin only)
  extendSubscription: Joi.object({
    days: Joi.number().integer().positive().required()
      .messages({
        'any.required': 'Number of days to extend is required',
        'number.base': 'Days must be a number',
        'number.integer': 'Days must be an integer',
        'number.positive': 'Days must be positive'
      }),
    reason: Joi.string().max(500)
      .messages({
        'string.max': 'Reason cannot exceed 500 characters'
      })
  }),

  // Query params for listing subscriptions (admin only)
  listSubscriptions: Joi.object({
    status: Joi.string().valid('active', 'canceled', 'expired', 'trial'),
    planType: Joi.string().valid('trial', 'monthly', 'yearly'),
    shopId: Joi.string(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid('createdAt', 'endDate', 'startDate').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // Schema for paying subscription using EVC Plus
  payWithEvc: Joi.object({
    subscriptionId: Joi.string().trim().required()
      .messages({
        'string.empty': 'Subscription ID is required',
        'any.required': 'Subscription ID is required'
      }),
    phone: Joi.string().trim().required()
      .messages({
        'string.empty': 'Phone number is required',
        'any.required': 'Phone number is required'
      }),
    amount: Joi.number().greater(0).required()
      .messages({
        'number.base': 'Amount must be a number',
        'number.greater': 'Amount must be greater than 0',
        'any.required': 'Amount is required'
      }),
    planType: Joi.string().valid('monthly', 'yearly')
      .when('.$isTrialUpgrade', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        'string.empty': 'Plan type cannot be empty if provided',
        'string.valid': 'Plan type must be either "monthly" or "yearly"',
        'any.required': 'Plan type is required when upgrading from trial'
      })
  }),
  
  // Schema for offline payment
  offlinePayment: Joi.object({
    subscriptionId: Joi.string().trim().required()
      .messages({
        'string.empty': 'Subscription ID is required',
        'any.required': 'Subscription ID is required'
      }),
    amount: Joi.number().greater(0).required()
      .messages({
        'number.base': 'Amount must be a number',
        'number.greater': 'Amount must be greater than 0',
        'any.required': 'Amount is required'
      }),
    method: Joi.string().valid('Cash').required()
      .messages({
        'string.empty': 'Payment method is required',
        'any.required': 'Payment method is required',
        'any.only': 'Payment method must be Cash'
      }),
    payerName: Joi.string().trim()
      .messages({
        'string.empty': 'Payer name cannot be empty if provided'
      }),
    payerPhone: Joi.string().trim()
      .messages({
        'string.empty': 'Payer phone cannot be empty if provided'
      }),
    notes: Joi.string().trim().max(500)
      .messages({
        'string.empty': 'Notes cannot be empty if provided',
        'string.max': 'Notes cannot exceed 500 characters'
      }),
    planType: Joi.string().valid('monthly', 'yearly')
      .when('.$isTrialUpgrade', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        'string.empty': 'Plan type cannot be empty if provided',
        'string.valid': 'Plan type must be either "monthly" or "yearly"',
        'any.required': 'Plan type is required when upgrading from trial'
      })
    // Note: File validation is handled by the upload middleware
  }),
  
  // Schema for verifying offline payment
  verifyOfflinePayment: Joi.object({
    status: Joi.string().valid('approved', 'rejected').required()
      .messages({
        'string.empty': 'Status is required',
        'any.required': 'Status is required',
        'any.only': 'Status must be either "approved" or "rejected"'
      }),
    notes: Joi.string().trim().max(500)
      .messages({
        'string.empty': 'Notes cannot be empty if provided',
        'string.max': 'Notes cannot exceed 500 characters'
      })
  })
};

// Export all schemas
module.exports = {
  createSubscription: subscriptionSchemas.createSubscription,
  updateSubscription: subscriptionSchemas.upgradeSubscription,
  cancelSubscription: subscriptionSchemas.cancelSubscription,
  recordPayment: subscriptionSchemas.recordPayment,
  upgradeFromTrial: subscriptionSchemas.upgradeSubscription,
  changePlan: subscriptionSchemas.upgradeSubscription,
  renewSubscription: subscriptionSchemas.renewSubscription,
  updateAutoRenewal: subscriptionSchemas.updateAutoRenewal,
  extendSubscription: subscriptionSchemas.extendSubscription,
  payWithEvc: subscriptionSchemas.payWithEvc,
  offlinePayment: subscriptionSchemas.offlinePayment,
  verifyOfflinePayment: subscriptionSchemas.verifyOfflinePayment
};
