/**
 * Pricing Plan Model
 * Stores plan pricing information for dynamic management
 */
const mongoose = require('mongoose');
const { generateId } = require('../utils/generators/idGenerator');

const pricingPlanSchema = new mongoose.Schema({
  planId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    default: () => generateId('plan')
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['trial', 'monthly', 'yearly'],
    required: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  pricing: {
    basePrice: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true
    },
    billingCycle: {
      type: String,
      enum: ['one-time', 'monthly', 'yearly'],
      required: true
    },
    trialDays: {
      type: Number,
      default: 14,
      min: 0
    },
    setupFee: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  features: {
    debtTracking: {
      type: Boolean,
      default: true
    },
    customerPayments: {
      type: Boolean,
      default: true
    },
    smsReminders: {
      type: Boolean,
      default: true
    },
    smartRiskScore: {
      type: Boolean,
      default: true
    },
    productSalesSystem: {
      type: Boolean,
      default: true
    },
    businessDashboard: {
      type: Boolean,
      default: true
    },
    exportReports: {
      type: Boolean,
      default: true
    },
    customerProfiles: {
      type: Boolean,
      default: true
    },
    posAndReceipt: {
      type: Boolean,
      default: true
    },
    offlineSupport: {
      type: Boolean,
      default: true
    }
  },
  limits: {
    maxProducts: {
      type: Number,
      default: 1000
    },
    maxEmployees: {
      type: Number,
      default: 10
    },
    maxStorageMB: {
      type: Number,
      default: 500
    },
    maxCustomers: {
      type: Number,
      default: 1000
    },
    maxDailyTransactions: {
      type: Number,
      default: 500
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 1
  },
  metadata: {
    isRecommended: {
      type: Boolean,
      default: false
    },
    tags: [String],
    customFields: mongoose.Schema.Types.Mixed
  },
  createdBy: {
    type: String,
    trim: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true 
});

// Create indexes for better performance
pricingPlanSchema.index({ type: 1, isActive: 1 });
pricingPlanSchema.index({ isActive: 1, displayOrder: 1 });

/**
 * Create default plans when collection is empty
 */
pricingPlanSchema.statics.createDefaultPlans = async function() {
  const count = await this.countDocuments({});
  
  if (count === 0) {
    const defaultPlans = [
      {
        planId: generateId('plan'),
        name: 'trial',
        type: 'trial',
        displayName: 'Free Trial',
        description: 'Try all features free for 14 days',
        pricing: {
          basePrice: 0,
          currency: 'USD',
          billingCycle: 'one-time',
          trialDays: 14,
          setupFee: 0
        },
        displayOrder: 1,
        metadata: {
          isRecommended: false,
          tags: ['trial', 'free']
        }
      },
      {
        planId: generateId('plan'),
        name: 'monthly',
        type: 'monthly',
        displayName: 'Monthly Plan',
        description: 'Full access to all features with monthly billing',
        pricing: {
          basePrice: 10,
          currency: 'USD',
          billingCycle: 'monthly',
          trialDays: 0,
          setupFee: 0
        },
        displayOrder: 2,
        metadata: {
          isRecommended: true,
          tags: ['monthly', 'standard']
        }
      },
      {
        planId: generateId('plan'),
        name: 'yearly',
        type: 'yearly',
        displayName: 'Annual Plan',
        description: 'Save 20% with yearly billing',
        pricing: {
          basePrice: 8,
          currency: 'USD',
          billingCycle: 'yearly',
          trialDays: 0,
          setupFee: 0
        },
        displayOrder: 3,
        metadata: {
          isRecommended: false,
          tags: ['yearly', 'discounted']
        }
      }
    ];
    
    await this.insertMany(defaultPlans);
  }
};

/**
 * Find active plans
 */
pricingPlanSchema.statics.findActivePlans = async function() {
  return this.find({
    isActive: true,
    isDeleted: false
  }).sort({ displayOrder: 1 });
};

/**
 * Find plan by type
 */
pricingPlanSchema.statics.findPlanByType = async function(planType) {
  return this.findOne({
    type: planType,
    isActive: true,
    isDeleted: false
  });
};

const PricingPlan = mongoose.model('PricingPlan', pricingPlanSchema);

module.exports = PricingPlan;
