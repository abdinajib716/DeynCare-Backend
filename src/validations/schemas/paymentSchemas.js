/**
 * Payment validation schemas
 * Handles validation for payment-related operations
 */
const Joi = require('joi');
const { validationPatterns } = require('../validationPatterns');

// Payment method enum
const paymentMethods = [
  'Cash', 
  'EVC Plus', 
  'Bank Transfer', 
  'Mobile Money', 
  'Check', 
  'Card', 
  'Other'
];

// Payment context enum
const paymentContexts = [
  'debt', 
  'subscription', 
  'pos'
];

// Payment status enum
const paymentStatuses = [
  'pending',
  'confirmed',
  'failed',
  'refunded',
  'partially-refunded'
];

// Verification status enum
const verificationStatuses = [
  'successful',
  'failed'
];

// Schema for creating a payment
const createPayment = {
  body: Joi.object({
    shopId: Joi.string().trim().required()
      .messages({
        'string.empty': 'Shop ID is required',
        'any.required': 'Shop ID is required'
      }),
    customerId: Joi.string().trim().required()
      .messages({
        'string.empty': 'Customer ID is required',
        'any.required': 'Customer ID is required'
      }),
    customerName: Joi.string().trim()
      .messages({
        'string.empty': 'Customer name cannot be empty if provided'
      }),
    paymentContext: Joi.string().valid(...paymentContexts).required()
      .messages({
        'string.empty': 'Payment context is required',
        'any.required': 'Payment context is required',
        'any.only': 'Payment context must be one of: debt, subscription, pos'
      }),
    debtId: Joi.string().trim()
      .when('paymentContext', {
        is: 'debt',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        'string.empty': 'Debt ID cannot be empty if provided',
        'any.required': 'Debt ID is required for debt payments'
      }),
    subscriptionId: Joi.string().trim()
      .when('paymentContext', {
        is: 'subscription',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        'string.empty': 'Subscription ID cannot be empty if provided',
        'any.required': 'Subscription ID is required for subscription payments'
      }),
    posOrderId: Joi.string().trim()
      .when('paymentContext', {
        is: 'pos',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        'string.empty': 'POS Order ID cannot be empty if provided',
        'any.required': 'POS Order ID is required for POS payments'
      }),
    amount: Joi.number().greater(0).required()
      .messages({
        'number.base': 'Amount must be a number',
        'number.greater': 'Amount must be greater than 0',
        'any.required': 'Amount is required'
      }),
    debtAmount: Joi.number().greater(0)
      .when('paymentContext', {
        is: 'debt',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        'number.base': 'Debt amount must be a number',
        'number.greater': 'Debt amount must be greater than 0',
        'any.required': 'Debt amount is required for debt payments'
      }),
    method: Joi.string().valid(...paymentMethods).required()
      .messages({
        'string.empty': 'Payment method is required',
        'any.required': 'Payment method is required',
        'any.only': `Payment method must be one of: ${paymentMethods.join(', ')}`
      }),
    referenceNumber: Joi.string().trim()
      .messages({
        'string.empty': 'Reference number cannot be empty if provided'
      }),
    notes: Joi.string().trim().max(500)
      .messages({
        'string.empty': 'Notes cannot be empty if provided',
        'string.max': 'Notes cannot exceed 500 characters'
      }),
    proofFileId: Joi.string().trim()
      .messages({
        'string.empty': 'Proof file ID cannot be empty if provided'
      })
  })
};

// Schema for confirming a payment
const confirmPayment = {
  params: Joi.object({
    paymentId: Joi.string().trim().required()
      .messages({
        'string.empty': 'Payment ID is required',
        'any.required': 'Payment ID is required'
      })
  })
};

// Schema for refunding a payment
const refundPayment = {
  params: Joi.object({
    paymentId: Joi.string().trim().required()
      .messages({
        'string.empty': 'Payment ID is required',
        'any.required': 'Payment ID is required'
      })
  }),
  body: Joi.object({
    amount: Joi.number().greater(0).required()
      .messages({
        'number.base': 'Refund amount must be a number',
        'number.greater': 'Refund amount must be greater than 0',
        'any.required': 'Refund amount is required'
      }),
    reason: Joi.string().trim().required()
      .messages({
        'string.empty': 'Refund reason is required',
        'any.required': 'Refund reason is required'
      })
  })
};

// Schema for verifying a payment
const verifyPayment = {
  params: Joi.object({
    paymentId: Joi.string().trim().required()
      .messages({
        'string.empty': 'Payment ID is required',
        'any.required': 'Payment ID is required'
      })
  }),
  body: Joi.object({
    status: Joi.string().valid(...verificationStatuses).required()
      .messages({
        'string.empty': 'Verification status is required',
        'any.required': 'Verification status is required',
        'any.only': 'Verification status must be either "successful" or "failed"'
      }),
    notes: Joi.string().trim().max(500)
      .messages({
        'string.empty': 'Notes cannot be empty if provided',
        'string.max': 'Notes cannot exceed 500 characters'
      })
  })
};

// Schema for EVC Plus payment
const evcPayment = {
  body: Joi.object({
    shopId: Joi.string().trim().required()
      .messages({
        'string.empty': 'Shop ID is required',
        'any.required': 'Shop ID is required'
      }),
    customerId: Joi.string().trim().required()
      .messages({
        'string.empty': 'Customer ID is required',
        'any.required': 'Customer ID is required'
      }),
    customerName: Joi.string().trim()
      .messages({
        'string.empty': 'Customer name cannot be empty if provided'
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
    paymentContext: Joi.string().valid(...paymentContexts).required()
      .messages({
        'string.empty': 'Payment context is required',
        'any.required': 'Payment context is required',
        'any.only': 'Payment context must be one of: debt, subscription, pos'
      }),
    debtId: Joi.string().trim()
      .when('paymentContext', {
        is: 'debt',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        'string.empty': 'Debt ID cannot be empty if provided',
        'any.required': 'Debt ID is required for debt payments'
      }),
    subscriptionId: Joi.string().trim()
      .when('paymentContext', {
        is: 'subscription',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        'string.empty': 'Subscription ID cannot be empty if provided',
        'any.required': 'Subscription ID is required for subscription payments'
      }),
    posOrderId: Joi.string().trim()
      .when('paymentContext', {
        is: 'pos',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        'string.empty': 'POS Order ID cannot be empty if provided',
        'any.required': 'POS Order ID is required for POS payments'
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
  createPayment,
  confirmPayment,
  refundPayment,
  verifyPayment,
  evcPayment
};
