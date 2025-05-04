const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { generateId } = require('../utils/generators/idGenerator');

const subscriptionSchema = new mongoose.Schema({
  subscriptionId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    default: () => generateId('sub')
  },
  shopId: {
    type: String,
    required: true,
    trim: true
  },
  plan: {
    name: {
      type: String,
      enum: ['standard'],
      default: 'standard',
      required: true
    },
    type: {
      type: String,
      enum: ['trial', 'monthly', 'yearly'],
      required: true
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
      fullTrialAccess: {
        type: Boolean,
        default: function() {
          return this.plan.type === 'trial';
        }
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
    }
  },
  pricing: {
    basePrice: {
      type: Number,
      default: function() {
        if (this.plan.type === 'trial') return 0;
        if (this.plan.type === 'monthly') return 10;
        if (this.plan.type === 'yearly') return 8;
        return 10; // Default to monthly price
      }
    },
    currency: {
      type: String,
      default: 'USD'
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: function() {
        return this.plan.type === 'yearly' ? 'yearly' : 'monthly';
      }
    },
    discount: {
      active: {
        type: Boolean,
        default: false
      },
      code: {
        type: String,
        trim: true
      },
      discountId: {
        type: String,
        trim: true
      },
      amount: {
        type: Number,
        default: 0
      },
      originalAmount: {
        type: Number
      },
      type: {
        type: String,
        enum: ['fixed', 'percentage'],
        default: 'percentage'
      },
      value: {
        type: Number
      },
      percentage: {
        type: Boolean,
        default: true
      },
      expiresAt: Date,
      appliedAt: {
        type: Date,
        default: Date.now
      }
    }
  },
  status: {
    type: String,
    enum: ['trial', 'active', 'past_due', 'canceled', 'expired'],
    default: function() {
      return this.plan.type === 'trial' ? 'trial' : 'active';
    }
  },
  payment: {
    method: {
      type: String,
      enum: ['offline', 'evc_plus', 'free'],
      default: function() {
        return this.plan.type === 'trial' ? 'free' : 'offline';
      }
    },
    verified: {
      type: Boolean,
      default: function() {
        return this.plan.type === 'trial' || this.payment.method === 'free';
      }
    },
    lastPaymentDate: Date,
    nextPaymentDate: Date,
    failedPayments: {
      type: Number,
      default: 0
    },
    paymentDetails: {
      transactionId: String,
      receiptUrl: String,
      payerName: String,
      payerPhone: String,
      payerEmail: String,
      notes: String
    }
  },
  dates: {
    startDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    endDate: {
      type: Date,
      required: true,
      default: function() {
        const start = this.dates.startDate || new Date();
        
        // Calculate end date based on plan type
        if (this.plan.type === 'trial') {
          // Trial lasts 14 days
          const end = new Date(start);
          end.setDate(end.getDate() + 14);
          return end;
        } else if (this.plan.type === 'monthly') {
          // Monthly plan lasts 30 days
          const end = new Date(start);
          end.setDate(end.getDate() + 30);
          return end;
        } else if (this.plan.type === 'yearly') {
          // Yearly plan lasts 365 days
          const end = new Date(start);
          end.setDate(end.getDate() + 365);
          return end;
        }
        
        // Default to 30 days if plan type is unknown
        const end = new Date(start);
        end.setDate(end.getDate() + 30);
        return end;
      }
    },
    trialEndsAt: {
      type: Date,
      default: function() {
        if (this.plan.type === 'trial') {
          const start = this.dates.startDate || new Date();
          const end = new Date(start);
          end.setDate(end.getDate() + 14);
          return end;
        }
        return null;
      }
    },
    canceledAt: Date,
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  renewalSettings: {
    autoRenew: {
      type: Boolean,
      default: true
    },
    reminderSent: {
      type: Boolean,
      default: false
    },
    renewalAttempts: {
      type: Number,
      default: 0
    }
  },
  cancellation: {
    reason: {
      type: String,
      enum: ['cost', 'features', 'competitor', 'usability', 'support', 'other', null],
      default: null
    },
    feedback: String,
    byUserId: String,
    refundIssued: {
      type: Boolean,
      default: false
    }
  },
  history: [{
    action: {
      type: String,
      enum: ['created', 'activated', 'renewed', 'updated', 'payment_failed', 'payment_succeeded', 'canceled', 'expired', 'plan_changed', 'trial_started', 'trial_ended', 'trial_converted']
    },
    date: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed,
    performedBy: String
  }],
  metadata: {
    notes: String,
    tags: [String],
    previousPlans: [{
      name: String,
      type: String,
      startDate: Date,
      endDate: Date
    }]
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// VIRTUALS

/**
 * Status for display: indicates if subscription is trial, active, expiring soon, etc.
 */
subscriptionSchema.virtual('displayStatus').get(function() {
  if (this.isDeleted) return 'deleted';
  if (this.status === 'canceled') return 'canceled';
  
  const now = new Date();
  const endDate = new Date(this.dates.endDate);
  const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
  
  if (this.status === 'trial') {
    if (daysLeft <= 0) return 'trial_expired';
    if (daysLeft <= 2) return 'trial_ending_soon';
    return 'trial';
  }
  
  if (daysLeft <= 0) return 'expired';
  if (daysLeft <= 5) return 'expiring_soon';
  if (this.payment.failedPayments > 0) return 'payment_issue';
  
  return this.status;
});

/**
 * Calculate the total price after any discounts
 */
subscriptionSchema.virtual('totalPrice').get(function() {
  let price = this.pricing.basePrice || 0;
  
  // Apply discount if active
  if (this.pricing.discount && this.pricing.discount.active) {
    if (this.pricing.discount.type === 'fixed') {
      price -= this.pricing.discount.amount;
    } else if (this.pricing.discount.type === 'percentage') {
      price -= (price * this.pricing.discount.value / 100);
    }
  }
  
  // Ensure price is not negative
  return Math.max(0, price);
});

/**
 * Calculate the total duration of the subscription in days
 */
subscriptionSchema.virtual('durationDays').get(function() {
  if (!this.dates.startDate || !this.dates.endDate) return 0;
  
  const startDate = new Date(this.dates.startDate);
  const endDate = new Date(this.dates.endDate);
  
  return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
});

/**
 * Calculate days remaining in the subscription
 */
subscriptionSchema.virtual('daysRemaining').get(function() {
  if (!this.dates.endDate) return 0;
  
  const now = new Date();
  const endDate = new Date(this.dates.endDate);
  
  return Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
});

/**
 * Calculate percentage of subscription period used
 */
subscriptionSchema.virtual('percentageUsed').get(function() {
  const totalDays = this.durationDays;
  if (totalDays === 0) return 100;
  
  const daysRemaining = this.daysRemaining;
  const daysUsed = totalDays - daysRemaining;
  
  return Math.min(100, Math.max(0, Math.round((daysUsed / totalDays) * 100)));
});

// METHODS

/**
 * Check if the subscription is active
 * @returns {boolean} - Whether the subscription is active
 */
subscriptionSchema.methods.isActive = function() {
  if (this.isDeleted || this.status === 'canceled' || this.status === 'expired') {
    return false;
  }
  
  const now = new Date();
  const endDate = new Date(this.dates.endDate);
  
  return now <= endDate;
};

/**
 * Check if the subscription is in trial period
 * @returns {boolean} - Whether the subscription is in trial period
 */
subscriptionSchema.methods.isInTrial = function() {
  if (this.status !== 'trial' || !this.dates.trialEndsAt) {
    return false;
  }
  
  const now = new Date();
  const trialEnd = new Date(this.dates.trialEndsAt);
  
  return now <= trialEnd;
};

/**
 * Extend the subscription by a given period
 * @param {Object} extensionData - Extension details
 * @param {number} extensionData.days - Number of days to extend
 * @param {string} extensionData.reason - Reason for extension
 * @param {string} extensionData.performedBy - User ID who performed the extension
 * @returns {Object} - The updated subscription
 */
subscriptionSchema.methods.extend = async function(extensionData) {
  const { days, reason, performedBy } = extensionData;
  
  if (!days || days <= 0) {
    throw new Error('Extension days must be a positive number');
  }
  
  const currentEndDate = new Date(this.dates.endDate);
  const newEndDate = new Date(currentEndDate);
  newEndDate.setDate(newEndDate.getDate() + days);
  
  this.dates.endDate = newEndDate;
  this.dates.lastUpdated = new Date();
  
  // Add to history
  this.history.push({
    action: 'updated',
    date: new Date(),
    details: {
      extension: true,
      days,
      reason,
      previousEndDate: currentEndDate,
      newEndDate
    },
    performedBy
  });
  
  return this.save();
};

/**
 * Cancel the subscription
 * @param {Object} cancellationData - Cancellation details
 * @param {string} cancellationData.reason - Reason for cancellation
 * @param {string} cancellationData.feedback - Additional feedback
 * @param {string} cancellationData.performedBy - User ID who performed the cancellation
 * @param {boolean} cancellationData.immediateEffect - If true, set endDate to now
 * @returns {Object} - The updated subscription
 */
subscriptionSchema.methods.cancel = async function(cancellationData) {
  const { reason, feedback, performedBy, immediateEffect = false } = cancellationData;
  
  this.status = 'canceled';
  this.cancellation.reason = reason || 'other';
  this.cancellation.feedback = feedback || '';
  this.cancellation.byUserId = performedBy;
  this.cancellation.date = new Date();
  this.renewalSettings.autoRenew = false;
  
  // If immediate effect, set end date to now
  if (immediateEffect) {
    this.dates.endDate = new Date();
  }
  
  // Add to history
  this.history.push({
    action: 'canceled',
    date: new Date(),
    details: {
      reason,
      feedback,
      immediateEffect
    },
    performedBy
  });
  
  return this.save();
};

/**
 * Convert trial to paid subscription
 * @param {Object} conversionData - Conversion details
 * @param {string} conversionData.planType - New plan type ('monthly' or 'yearly')
 * @param {string} conversionData.paymentMethod - Payment method used
 * @param {Object} conversionData.paymentDetails - Payment details
 * @param {string} conversionData.performedBy - User ID who performed the conversion
 * @returns {Object} - The updated subscription
 */
subscriptionSchema.methods.convertTrialToPaid = async function(conversionData) {
  const { 
    planType = 'monthly', 
    paymentMethod = 'offline', 
    paymentDetails = {},
    performedBy 
  } = conversionData;
  
  if (!this.isInTrial()) {
    throw new Error('Subscription is not in trial period');
  }
  
  const now = new Date();
  const trialEndDate = new Date(this.dates.trialEndsAt);
  
  // Set new plan properties
  this.plan.type = planType;
  this.status = 'active';
  
  // Set new dates
  this.dates.startDate = now;
  
  // Calculate new end date based on plan type
  if (planType === 'monthly') {
    const newEndDate = new Date(now);
    newEndDate.setDate(newEndDate.getDate() + 30);
    this.dates.endDate = newEndDate;
  } else if (planType === 'yearly') {
    const newEndDate = new Date(now);
    newEndDate.setDate(newEndDate.getDate() + 365);
    this.dates.endDate = newEndDate;
  }
  
  // Set payment details
  this.payment.method = paymentMethod;
  this.payment.lastPaymentDate = now;
  this.payment.nextPaymentDate = this.dates.endDate;
  
  if (paymentDetails) {
    this.payment.paymentDetails = {
      ...this.payment.paymentDetails,
      ...paymentDetails
    };
  }
  
  // Update pricing
  this.pricing.basePrice = planType === 'yearly' ? 8 : 10;
  this.pricing.billingCycle = planType;
  
  // Add to history
  this.history.push({
    action: 'trial_converted',
    date: now,
    details: {
      fromPlanType: 'trial',
      toPlanType: planType,
      paymentMethod,
      trialEndDate
    },
    performedBy
  });
  
  return this.save();
};

/**
 * Change subscription plan
 * @param {Object} changeData - Plan change details
 * @param {string} changeData.newPlanType - New plan type ('monthly' or 'yearly')
 * @param {boolean} changeData.prorated - Whether to prorate the change
 * @param {string} changeData.performedBy - User ID who performed the change
 * @returns {Object} - The updated subscription
 */
subscriptionSchema.methods.changePlan = async function(changeData) {
  const { 
    newPlanType,
    prorated = true,
    performedBy 
  } = changeData;
  
  if (!['monthly', 'yearly'].includes(newPlanType)) {
    throw new Error('Invalid plan type');
  }
  
  const now = new Date();
  const oldPlanType = this.plan.type;
  const oldEndDate = new Date(this.dates.endDate);
  
  // Add current plan to history
  this.metadata.previousPlans.push({
    name: this.plan.name,
    type: oldPlanType,
    startDate: this.dates.startDate,
    endDate: now
  });
  
  // Set new plan properties
  this.plan.type = newPlanType;
  
  // Update pricing
  this.pricing.basePrice = newPlanType === 'yearly' ? 8 : 10;
  this.pricing.billingCycle = newPlanType;
  
  // Set new dates
  this.dates.startDate = now;
  
  // Calculate new end date based on plan type
  if (prorated && this.isActive()) {
    // Calculate remaining value of current subscription
    const daysRemaining = Math.max(0, Math.ceil((oldEndDate - now) / (1000 * 60 * 60 * 24)));
    const oldDailyRate = oldPlanType === 'yearly' ? (8 / 30) : (10 / 30);
    const remainingValue = daysRemaining * oldDailyRate;
    
    // Calculate days to add based on new plan rate
    const newDailyRate = newPlanType === 'yearly' ? (8 / 30) : (10 / 30);
    const daysToAdd = Math.round(remainingValue / newDailyRate);
    
    const newEndDate = new Date(now);
    newEndDate.setDate(newEndDate.getDate() + daysToAdd);
    this.dates.endDate = newEndDate;
  } else {
    // Just set standard duration based on plan type
    if (newPlanType === 'monthly') {
      const newEndDate = new Date(now);
      newEndDate.setDate(newEndDate.getDate() + 30);
      this.dates.endDate = newEndDate;
    } else if (newPlanType === 'yearly') {
      const newEndDate = new Date(now);
      newEndDate.setDate(newEndDate.getDate() + 365);
      this.dates.endDate = newEndDate;
    }
  }
  
  // Add to history
  this.history.push({
    action: 'plan_changed',
    date: now,
    details: {
      fromPlanType: oldPlanType,
      toPlanType: newPlanType,
      prorated,
      previousEndDate: oldEndDate,
      newEndDate: this.dates.endDate
    },
    performedBy
  });
  
  return this.save();
};

/**
 * Record a payment for the subscription
 * @param {Object} paymentData - Payment details
 * @param {string} paymentData.transactionId - ID of the payment transaction
 * @param {string} paymentData.method - Payment method used
 * @param {number} paymentData.amount - Amount paid
 * @param {string} paymentData.performedBy - User ID who recorded the payment
 * @param {boolean} paymentData.extend - Whether to extend subscription
 * @returns {Object} - The updated subscription
 */
subscriptionSchema.methods.recordPayment = async function(paymentData) {
  const { 
    transactionId, 
    method = 'offline',
    amount,
    receiptUrl,
    performedBy,
    extend = true
  } = paymentData;
  
  const now = new Date();
  
  // Update payment information
  this.payment.method = method;
  this.payment.verified = true;
  this.payment.lastPaymentDate = now;
  this.payment.failedPayments = 0;
  
  // Update payment details
  if (transactionId) {
    this.payment.paymentDetails.transactionId = transactionId;
  }
  
  if (receiptUrl) {
    this.payment.paymentDetails.receiptUrl = receiptUrl;
  }
  
  // Set subscription to active if it was past_due
  if (this.status === 'past_due') {
    this.status = 'active';
  }
  
  // Extend subscription if requested
  if (extend) {
    // Determine extension period based on plan type
    let extensionDays = 0;
    
    if (this.plan.type === 'monthly') {
      extensionDays = 30;
    } else if (this.plan.type === 'yearly') {
      extensionDays = 365;
    }
    
    const currentEndDate = new Date(this.dates.endDate);
    const newEndDate = new Date(Math.max(now.getTime(), currentEndDate.getTime()));
    newEndDate.setDate(newEndDate.getDate() + extensionDays);
    
    this.dates.endDate = newEndDate;
    this.payment.nextPaymentDate = newEndDate;
  }
  
  // Add to history
  this.history.push({
    action: 'payment_succeeded',
    date: now,
    details: {
      transactionId,
      method,
      amount,
      extend,
      newEndDate: this.dates.endDate
    },
    performedBy
  });
  
  return this.save();
};

// STATIC METHODS

/**
 * Find active subscriptions for a shop
 * @param {string} shopId - ID of the shop
 * @returns {Promise<Array>} - Array of active subscriptions
 */
subscriptionSchema.statics.findActiveSubscriptions = async function(shopId) {
  const now = new Date();
  
  return this.find({
    shopId,
    'dates.endDate': { $gte: now },
    status: { $nin: ['canceled', 'expired'] },
    isDeleted: false
  });
};

/**
 * Find subscriptions expiring soon
 * @param {number} daysThreshold - Number of days to consider "expiring soon" (default: 7)
 * @returns {Promise<Array>} - Array of soon-to-expire subscriptions
 */
subscriptionSchema.statics.findExpiringSubscriptions = async function(daysThreshold = 7) {
  const now = new Date();
  const thresholdDate = new Date(now);
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  
  return this.find({
    'dates.endDate': { $gte: now, $lte: thresholdDate },
    status: { $nin: ['canceled'] },
    'renewalSettings.autoRenew': false,
    'renewalSettings.reminderSent': false,
    isDeleted: false
  });
};

/**
 * Find subscriptions ready for renewal
 * @param {number} daysThreshold - Number of days before expiry to attempt renewal (default: 3)
 * @returns {Promise<Array>} - Array of subscriptions ready for renewal
 */
subscriptionSchema.statics.findSubscriptionsForRenewal = async function(daysThreshold = 3) {
  const now = new Date();
  const thresholdDate = new Date(now);
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  
  return this.find({
    'dates.endDate': { $gte: now, $lte: thresholdDate },
    status: { $nin: ['canceled', 'expired'] },
    'renewalSettings.autoRenew': true,
    isDeleted: false
  });
};

/**
 * Find trials ending soon
 * @param {number} daysThreshold - Number of days to consider "ending soon" (default: 2)
 * @returns {Promise<Array>} - Array of trials ending soon
 */
subscriptionSchema.statics.findTrialsEndingSoon = async function(daysThreshold = 2) {
  const now = new Date();
  const thresholdDate = new Date(now);
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  
  return this.find({
    status: 'trial',
    'dates.trialEndsAt': { $gte: now, $lte: thresholdDate },
    'renewalSettings.reminderSent': false,
    isDeleted: false
  });
};

// Add pagination plugin
subscriptionSchema.plugin(mongoosePaginate);

// Create model
const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
