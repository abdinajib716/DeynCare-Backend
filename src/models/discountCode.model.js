/**
 * Discount Code Model
 * Handles discount codes for promotions
 */
const mongoose = require('mongoose');
const { idGenerator, logInfo, logWarning } = require('../utils');

/**
 * Discount Code Schema
 * @type {mongoose.Schema}
 */
const discountCodeSchema = new mongoose.Schema({
  // Unique identifier for the discount code
  discountId: {
    type: String,
    required: true,
    unique: true
  },
  
  // The actual code users will enter (e.g., "SUMMER20")
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  
  // Description of the discount
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  
  // Type of discount: 'fixed' (amount) or 'percentage'
  type: {
    type: String,
    required: true,
    enum: ['fixed', 'percentage']
  },
  
  // Discount value (amount or percentage)
  value: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Minimum purchase amount to apply the discount
  minimumPurchase: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Maximum discount amount (for percentage discounts)
  maxDiscountAmount: {
    type: Number,
    default: null
  },
  
  // Start date when code becomes active
  startDate: {
    type: Date,
    default: Date.now
  },
  
  // Expiration date
  expiryDate: {
    type: Date,
    required: true
  },
  
  // Maximum number of times this code can be used in total
  usageLimit: {
    type: Number,
    default: null
  },
  
  // Number of times the code has been used
  usageCount: {
    type: Number,
    default: 0
  },
  
  // Maximum number of times a single user can use this code
  perUserLimit: {
    type: Number,
    default: 1
  },
  
  // Applicable for specific context (subscription, pos, etc.)
  applicableFor: {
    type: [String],
    enum: ['subscription', 'pos', 'debt', 'all'],
    default: ['subscription', 'pos'],
    validate: {
      validator: function(v) {
        // Either must contain 'all' or only specific contexts
        return v.includes('all') || 
               v.every(context => ['subscription', 'pos', 'debt'].includes(context));
      },
      message: 'applicableFor must contain valid values: subscription, pos, debt, all'
    }
  },
  
  // Shop ID for shop-specific discounts (null for global)
  shopId: {
    type: String,
    default: null
  },
  
  // Is the code currently active
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Is the code deleted
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  // Created by user ID
  createdBy: {
    type: String,
    required: true
  },
  
  // Last updated by user ID
  updatedBy: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

/**
 * Pre-save hook to generate discount ID
 */
discountCodeSchema.pre('save', async function(next) {
  // If discount ID doesn't exist, generate one
  if (!this.discountId) {
    try {
      this.discountId = await idGenerator.generateDiscountId();
    } catch (error) {
      logWarning('Failed to generate discount ID, using fallback', 'DiscountModel', error);
      // Fallback to a timestamp-based ID
      this.discountId = 'disc_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    }
  }
  
  // Force code to uppercase
  if (this.code) {
    this.code = this.code.toUpperCase();
  }
  
  next();
});

/**
 * Calculate the discount amount for a given purchase amount
 * @param {Number} purchaseAmount - The purchase amount
 * @returns {Number} The discount amount
 */
discountCodeSchema.methods.calculateDiscount = function(purchaseAmount) {
  // If purchase amount is less than minimum, no discount
  if (purchaseAmount < this.minimumPurchase) {
    return 0;
  }
  
  let discountAmount = 0;
  
  if (this.type === 'fixed') {
    // Fixed amount discount
    discountAmount = this.value;
  } else if (this.type === 'percentage') {
    // Percentage discount
    discountAmount = (purchaseAmount * this.value) / 100;
    
    // Apply max discount if specified
    if (this.maxDiscountAmount !== null && discountAmount > this.maxDiscountAmount) {
      discountAmount = this.maxDiscountAmount;
    }
  }
  
  // Ensure discount doesn't exceed purchase amount
  return Math.min(discountAmount, purchaseAmount);
};

/**
 * Check if the discount code is valid for use
 * @returns {Boolean} Whether the code is valid
 */
discountCodeSchema.methods.isValid = function() {
  const now = new Date();
  
  // Check if code is active and not deleted
  if (!this.isActive || this.isDeleted) {
    return false;
  }
  
  // Check if code has expired
  if (now > this.expiryDate) {
    return false;
  }
  
  // Check if code is not yet active
  if (now < this.startDate) {
    return false;
  }
  
  // Check if usage limit has been reached
  if (this.usageLimit !== null && this.usageCount >= this.usageLimit) {
    return false;
  }
  
  return true;
};

/**
 * Increment usage count
 * @returns {Promise<void>}
 */
discountCodeSchema.methods.use = async function() {
  this.usageCount += 1;
  await this.save();
  
  logInfo(`Discount code ${this.code} used - ${this.usageCount}/${this.usageLimit || 'unlimited'}`, 'DiscountModel');
};

// Create indexes
discountCodeSchema.index({ code: 1 }, { unique: true });
discountCodeSchema.index({ discountId: 1 }, { unique: true });
discountCodeSchema.index({ shopId: 1 });
discountCodeSchema.index({ isActive: 1, isDeleted: 1 });
discountCodeSchema.index({ expiryDate: 1 });

// Create model
const DiscountCode = mongoose.model('DiscountCode', discountCodeSchema);

module.exports = DiscountCode;
