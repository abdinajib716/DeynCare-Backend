const mongoose = require('mongoose');

const shopSettingSchema = new mongoose.Schema({
  shopId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  // Organized into categories for better management
  // Risk assessment settings
  risk: {
    mlEnabled: {
      type: Boolean,
      default: true
    },
    highRiskThreshold: {
      type: Number,
      default: 70,
      min: 0,
      max: 100
    },
    mediumRiskThreshold: {
      type: Number,
      default: 40,
      min: 0,
      max: 100
    },
    autoDeclineHighRisk: {
      type: Boolean,
      default: false
    },
    requireApprovalMediumRisk: {
      type: Boolean,
      default: true
    },
    considerationFactors: {
      paymentHistory: {
        type: Boolean,
        default: true
      },
      customerAge: {
        type: Boolean,
        default: true
      },
      totalDebtAmount: {
        type: Boolean,
        default: true
      },
      purchaseFrequency: {
        type: Boolean,
        default: true
      }
    }
  },
  // Notification settings
  notifications: {
    smsReminderDaysBeforeDue: {
      type: Number,
      default: 7
    },
    paymentReminders: {
      enabled: {
        type: Boolean,
        default: true
      },
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'weekly'
      },
      escalationSchedule: [{
        daysAfterDue: Number,
        reminderType: {
          type: String,
          enum: ['friendly', 'stern', 'urgent', 'final'],
          default: 'friendly'
        },
        channels: {
          type: [String],
          enum: ['sms', 'email', 'push'],
          default: ['sms']
        }
      }]
    },
    // New field: Business hour notifications only
    businessHoursOnly: {
      type: Boolean,
      default: true
    },
    // New field: Custom notification templates
    templates: {
      reminder: {
        type: String,
        default: "Hello {{customerName}}, your payment of {{amount}} is due on {{dueDate}}. Please make your payment to avoid late fees."
      },
      overdue: {
        type: String,
        default: "Dear {{customerName}}, your payment of {{amount}} was due on {{dueDate}} and is now overdue. Please settle your debt as soon as possible."
      },
      receipt: {
        type: String,
        default: "Thank you {{customerName}} for your payment of {{amount}}. Receipt #{{receiptNumber}}."
      }
    }
  },
  // Customer and debt limits
  limits: {
    maxDebtAllowedPerCustomer: {
      type: Number,
      default: 5000
    },
    customerLimits: {
      creditLimit: {
        type: Boolean,
        default: true
      },
      maxOpenDebts: {
        type: Number,
        default: 3
      }
    },
    // New field: Grace period for payments
    gracePeriodDays: {
      type: Number,
      default: 3
    },
    // New field: Late fee settings
    lateFees: {
      enabled: {
        type: Boolean,
        default: false
      },
      type: {
        type: String,
        enum: ['fixed', 'percentage'],
        default: 'percentage'
      },
      value: {
        type: Number,
        default: 5
      },
      maxFee: {
        type: Number,
        default: null
      },
      gracePeriodDays: {
        type: Number,
        default: 3
      }
    }
  },
  // Display and regional settings
  display: {
    customCurrency: {
      type: String,
      default: 'USD',
      trim: true
    },
    // New field: Currency symbol position
    currencySymbolPosition: {
      type: String,
      enum: ['before', 'after'],
      default: 'before'
    },
    // New field: Date format
    dateFormat: {
      type: String,
      enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
      default: 'MM/DD/YYYY'
    },
    // New field: Time format
    timeFormat: {
      type: String,
      enum: ['12h', '24h'],
      default: '12h'
    },
    // New field: First day of week
    firstDayOfWeek: {
      type: String,
      enum: ['sunday', 'monday'],
      default: 'sunday'
    },
    // New field: Default language
    language: {
      type: String,
      default: 'en',
      trim: true
    },
    // New field: Thousands separator
    thousandsSeparator: {
      type: String,
      enum: [',', '.', ' '],
      default: ','
    },
    // New field: Decimal separator
    decimalSeparator: {
      type: String,
      enum: ['.', ','],
      default: '.'
    },
    // New field: Number of decimal places
    decimalPlaces: {
      type: Number,
      min: 0,
      max: 4,
      default: 2
    }
  },
  // Business rules
  businessRules: {
    // New field: Auto-apply payments to oldest debts first
    autoApplyPaymentsToOldest: {
      type: Boolean,
      default: true
    },
    // New field: Require proof of payment
    requirePaymentProof: {
      type: Boolean,
      default: false
    },
    // New field: Allow partial payments
    allowPartialPayments: {
      type: Boolean,
      default: true
    },
    // New field: Allow payment without debt (credit)
    allowPrepayment: {
      type: Boolean,
      default: false
    },
    // New field: Auto-cancel after N days for high risk
    autoCancelHighRiskAfterDays: {
      type: Number,
      default: 30
    },
    // New field: Require manager approval for high value debts
    requireApprovalAboveAmount: {
      type: Number,
      default: 10000
    }
  },
  // Invoice settings
  invoice: {
    // New field: Company details for invoice header
    companyDetails: {
      companyName: {
        type: String,
        trim: true
      },
      companyAddress: {
        type: String,
        trim: true
      },
      companyPhone: {
        type: String,
        trim: true
      },
      companyEmail: {
        type: String,
        trim: true
      },
      taxIdentificationNumber: {
        type: String,
        trim: true
      }
    },
    // New field: Invoice prefix
    invoicePrefix: {
      type: String,
      default: 'INV-',
      trim: true
    },
    // New field: Terms and conditions
    termsAndConditions: {
      type: String,
      trim: true
    },
    // New field: Footer notes
    footerNotes: {
      type: String,
      trim: true
    },
    // New field: Logo position
    logoPosition: {
      type: String,
      enum: ['left', 'center', 'right'],
      default: 'left'
    }
  },
  // Audit and security settings
  security: {
    // New field: Require note for debt adjustments
    requireNoteForAdjustments: {
      type: Boolean,
      default: true
    },
    // New field: Store customer consent records
    storeCustomerConsent: {
      type: Boolean,
      default: true
    },
    // New field: Minimum password length for shop users
    minimumPasswordLength: {
      type: Number,
      default: 8,
      min: 6,
      max: 32
    },
    // New field: Required password complexity
    passwordComplexity: {
      requireUppercase: {
        type: Boolean,
        default: true
      },
      requireNumbers: {
        type: Boolean,
        default: true
      },
      requireSpecialChars: {
        type: Boolean,
        default: false
      }
    },
    // New field: Auto-logout time (in minutes)
    autoLogoutMinutes: {
      type: Number,
      default: 30,
      min: 5
    }
  },
  updatedBy: {
    type: String,
    required: true,
    trim: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // New field: Setting update history
  history: [{
    updatedBy: {
      type: String,
      required: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    changes: {
      type: Object
    }
  }]
}, {
  timestamps: true
});

// Pre-save middleware to track setting changes
shopSettingSchema.pre('save', function(next) {
  if (!this.isNew) {
    const changedPaths = this.modifiedPaths();
    if (changedPaths.length > 0) {
      const changes = {};
      
      changedPaths.forEach(path => {
        if (path !== 'updatedAt' && path !== 'updatedBy' && !path.startsWith('history')) {
          changes[path] = this.get(path);
        }
      });
      
      if (Object.keys(changes).length > 0) {
        if (!this.history) this.history = [];
        
        this.history.push({
          updatedBy: this.updatedBy,
          updatedAt: this.updatedAt || new Date(),
          changes
        });
        
        // Limit history size to last 20 changes
        if (this.history.length > 20) {
          this.history = this.history.slice(-20);
        }
      }
    }
  }
  next();
});

// Static method to get default settings
shopSettingSchema.statics.getDefaults = function() {
  const defaultSettings = new this();
  const defaults = {};
  
  // Extract all default values from the schema
  Object.keys(defaultSettings.toObject()).forEach(key => {
    if (key !== '_id' && key !== 'history' && key !== 'updatedBy' && key !== 'updatedAt' && key !== 'shopId') {
      defaults[key] = defaultSettings[key];
    }
  });
  
  return defaults;
};

// Static method to get settings by shopId with fallback to defaults
shopSettingSchema.statics.getByShopId = async function(shopId, defaultUser = 'system') {
  let settings = await this.findOne({ shopId });
  
  if (!settings) {
    // Create default settings for this shop
    const defaults = this.getDefaults();
    settings = new this({
      shopId,
      ...defaults,
      updatedBy: defaultUser
    });
    await settings.save();
  }
  
  return settings;
};

const ShopSetting = mongoose.model('ShopSetting', shopSettingSchema);

module.exports = ShopSetting;
