const Joi = require('joi');
const patterns = require('../validationPatterns');

/**
 * Report validation schemas
 */
const reportSchemas = {
  /**
   * Schema for generating a new report
   */
  generateReport: Joi.object({
    title: Joi.string().min(3).max(100).required()
      .messages({
        'string.empty': 'Title is required',
        'string.min': 'Title must be at least 3 characters long',
        'string.max': 'Title cannot exceed 100 characters',
        'any.required': 'Title is required'
      }),
    type: Joi.string().valid('debt', 'sales', 'ml-risk', 'pos-profit').required()
      .messages({
        'any.only': 'Report type must be one of: debt, sales, ml-risk, pos-profit',
        'any.required': 'Report type is required'
      }),
    format: Joi.string().valid('pdf', 'csv', 'excel').required()
      .messages({
        'any.only': 'Report format must be one of: pdf, csv, excel',
        'any.required': 'Report format is required'
      }),
    description: Joi.string().max(500).allow('').optional()
      .messages({
        'string.max': 'Description cannot exceed 500 characters'
      }),
    shopId: Joi.string().when('$role', {
      is: 'superAdmin',
      then: Joi.string().required(),
      otherwise: Joi.forbidden()
    }).messages({
      'any.required': 'Shop ID is required for SuperAdmin to generate a report'
    }),
    parameters: Joi.object({
      startDate: Joi.date().iso().optional()
        .messages({
          'date.base': 'Start date must be a valid date',
          'date.format': 'Start date must be in ISO format'
        }),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
        .messages({
          'date.base': 'End date must be a valid date',
          'date.format': 'End date must be in ISO format',
          'date.min': 'End date must be after start date'
        }),
      filters: Joi.object().optional()
    }).optional()
  }),

  /**
   * Schema for generating a system-wide report (SuperAdmin only)
   */
  generateSystemReport: Joi.object({
    title: Joi.string().min(3).max(100).required()
      .messages({
        'string.empty': 'Title is required',
        'string.min': 'Title must be at least 3 characters long',
        'string.max': 'Title cannot exceed 100 characters',
        'any.required': 'Title is required'
      }),
    type: Joi.string().valid('debt', 'sales', 'ml-risk', 'pos-profit').required()
      .messages({
        'any.only': 'Report type must be one of: debt, sales, ml-risk, pos-profit',
        'any.required': 'Report type is required'
      }),
    format: Joi.string().valid('pdf', 'csv', 'excel').required()
      .messages({
        'any.only': 'Report format must be one of: pdf, csv, excel',
        'any.required': 'Report format is required'
      }),
    description: Joi.string().max(500).allow('').optional()
      .messages({
        'string.max': 'Description cannot exceed 500 characters'
      }),
    startDate: Joi.date().iso().optional()
      .messages({
        'date.base': 'Start date must be a valid date',
        'date.format': 'Start date must be in ISO format'
      }),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
      .messages({
        'date.base': 'End date must be a valid date',
        'date.format': 'End date must be in ISO format',
        'date.min': 'End date must be after start date'
      }),
    filters: Joi.object().optional()
  }),

  /**
   * Schema for query parameters when listing reports
   */
  listReportsQuery: Joi.object({
    page: Joi.number().integer().min(1).optional()
      .messages({
        'number.base': 'Page must be a number',
        'number.integer': 'Page must be an integer',
        'number.min': 'Page must be at least 1'
      }),
    limit: Joi.number().integer().min(1).max(100).optional()
      .messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
      }),
    type: Joi.string().valid('debt', 'sales', 'ml-risk', 'pos-profit').optional()
      .messages({
        'any.only': 'Report type must be one of: debt, sales, ml-risk, pos-profit'
      }),
    format: Joi.string().valid('pdf', 'csv', 'excel').optional()
      .messages({
        'any.only': 'Report format must be one of: pdf, csv, excel'
      }),
    shopId: Joi.string().optional(),
    startDate: Joi.date().iso().optional()
      .messages({
        'date.base': 'Start date must be a valid date',
        'date.format': 'Start date must be in ISO format'
      }),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
      .messages({
        'date.base': 'End date must be a valid date',
        'date.format': 'End date must be in ISO format',
        'date.min': 'End date must be after start date'
      }),
    search: Joi.string().max(100).optional()
      .messages({
        'string.max': 'Search query cannot exceed 100 characters'
      })
  }),

  /**
   * Schema for emailing a report
   */
  emailReport: Joi.object({
    recipients: Joi.array().items(
      Joi.string().email().required()
    ).min(1).required()
    .messages({
      'array.min': 'At least one recipient is required',
      'any.required': 'Recipients are required',
      'string.email': 'Invalid email address'
    }),
    subject: Joi.string().max(100).optional()
      .messages({
        'string.max': 'Subject cannot exceed 100 characters'
      }),
    message: Joi.string().max(1000).optional()
      .messages({
        'string.max': 'Message cannot exceed 1000 characters'
      })
  }),

  /**
   * Schema for scheduling periodic report delivery
   */
  scheduleReportDelivery: Joi.object({
    reportType: Joi.string().valid('debt', 'sales', 'ml-risk', 'pos-profit').required()
      .messages({
        'any.only': 'Report type must be one of: debt, sales, ml-risk, pos-profit',
        'any.required': 'Report type is required'
      }),
    format: Joi.string().valid('pdf', 'csv', 'excel').required()
      .messages({
        'any.only': 'Report format must be one of: pdf, csv, excel',
        'any.required': 'Report format is required'
      }),
    title: Joi.string().min(3).max(100).required()
      .messages({
        'string.min': 'Title must be at least 3 characters long',
        'string.max': 'Title cannot exceed 100 characters',
        'any.required': 'Title is required'
      }),
    description: Joi.string().max(500).allow('').optional()
      .messages({
        'string.max': 'Description cannot exceed 500 characters'
      }),
    shopId: Joi.string().when('isSystemWide', {
      is: Joi.boolean().valid(true),
      then: Joi.optional(),
      otherwise: Joi.string().when('$role', {
        is: 'superAdmin',
        then: Joi.string().required(),
        otherwise: Joi.forbidden()
      })
    }).messages({
      'any.required': 'Shop ID is required unless creating a system-wide report'
    }),
    isSystemWide: Joi.boolean().default(false),
    frequency: Joi.string().valid('daily', 'weekly', 'monthly').required()
      .messages({
        'any.only': 'Frequency must be one of: daily, weekly, monthly',
        'any.required': 'Frequency is required'
      }),
    dayOfWeek: Joi.when('frequency', {
      is: 'weekly',
      then: Joi.number().integer().min(0).max(6).required()
        .messages({
          'number.min': 'Day of week must be between 0 (Sunday) and 6 (Saturday)',
          'number.max': 'Day of week must be between 0 (Sunday) and 6 (Saturday)',
          'any.required': 'Day of week is required for weekly frequency'
        }),
      otherwise: Joi.optional()
    }),
    dayOfMonth: Joi.when('frequency', {
      is: 'monthly',
      then: Joi.number().integer().min(1).max(31).required()
        .messages({
          'number.min': 'Day of month must be between 1 and 31',
          'number.max': 'Day of month must be between 1 and 31',
          'any.required': 'Day of month is required for monthly frequency'
        }),
      otherwise: Joi.optional()
    }),
    hour: Joi.number().integer().min(0).max(23).required()
      .messages({
        'number.min': 'Hour must be between 0 and 23',
        'number.max': 'Hour must be between 0 and 23',
        'any.required': 'Hour is required'
      }),
    recipients: Joi.array().items(
      Joi.string().email().required()
    ).min(1).required()
    .messages({
      'array.min': 'At least one recipient is required',
      'any.required': 'Recipients are required',
      'string.email': 'Invalid email address'
    }),
    parameters: Joi.object({
      filters: Joi.object().optional()
    }).optional()
  })
};

module.exports = reportSchemas;
