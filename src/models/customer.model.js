const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  shopId: {
    type: String,
    required: true,
    trim: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  // New field: Email for communications
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: null
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  // New field: Secondary/alternative phone
  alternativePhone: {
    type: String,
    trim: true,
    default: null
  },
  type: {
    type: String,
    enum: ['new', 'returning'],
    default: 'new'
  },
  // New field: Customer category/segment
  category: {
    type: String,
    enum: ['regular', 'vip', 'wholesale', 'corporate', 'other'],
    default: 'regular'
  },
  address: {
    type: String,
    trim: true
  },
  // Enhanced address structure
  detailedAddress: {
    street: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    zipCode: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true,
      default: 'Nigeria'
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  // New field: Outstanding balance
  outstandingBalance: {
    type: Number,
    default: 0
  },
  // New field: Credit limit
  creditLimit: {
    type: Number,
    default: 0
  },
  // New field: Payment terms (in days)
  paymentTerms: {
    type: Number,
    default: 0 // 0 means no credit terms
  },
  // New field: Customer notes
  notes: {
    type: String,
    trim: true
  },
  // New field: Last purchase date
  lastPurchaseDate: {
    type: Date,
    default: null
  },
  // New field: Total purchase amount
  totalPurchaseAmount: {
    type: Number,
    default: 0
  },
  // New field: Total debt amount (historical)
  totalDebtAmount: {
    type: Number,
    default: 0
  },
  // New field: Risk score (0-100)
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  // New field: Contact preferences
  contactPreferences: {
    allowSMS: {
      type: Boolean,
      default: true
    },
    allowEmail: {
      type: Boolean,
      default: true
    },
    allowPhoneCall: {
      type: Boolean,
      default: true
    }
  },
  // Enhancement: Sync status for offline use
  syncStatus: {
    type: String,
    enum: ['synced', 'pending'],
    default: 'synced'
  },
  syncedAt: {
    type: Date,
    default: Date.now
  },
  // Enhancement: Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, { 
  timestamps: true 
});

// Add indexes for optimal performance
customerSchema.index({ shopId: 1, phone: 1 });
customerSchema.index({ shopId: 1, email: 1 });
customerSchema.index({ shopId: 1, outstandingBalance: -1 });
customerSchema.index({ shopId: 1, category: 1 });
customerSchema.index({ shopId: 1, lastPurchaseDate: -1 });
customerSchema.index({ riskScore: -1 });

// Method to check if customer has exceeded credit limit
customerSchema.methods.hasExceededCreditLimit = function() {
  return this.creditLimit > 0 && this.outstandingBalance >= this.creditLimit;
};

// Method to check if customer is high risk
customerSchema.methods.isHighRisk = function() {
  return this.riskScore >= 70;
};

// Method to calculate days since last purchase
customerSchema.methods.daysSinceLastPurchase = function() {
  if (!this.lastPurchaseDate) return null;
  
  const now = new Date();
  const lastPurchase = new Date(this.lastPurchaseDate);
  const diffTime = Math.abs(now - lastPurchase);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Static method to find customers with outstanding balances
customerSchema.statics.findWithOutstandingBalance = function(shopId) {
  return this.find({ 
    shopId, 
    outstandingBalance: { $gt: 0 },
    isDeleted: false
  }).sort({ outstandingBalance: -1 });
};

// Static method to find high-risk customers
customerSchema.statics.findHighRiskCustomers = function(shopId) {
  return this.find({ 
    shopId, 
    riskScore: { $gte: 70 },
    isDeleted: false
  }).sort({ riskScore: -1 });
};

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
