const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  shopId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  shopName: {
    type: String,
    required: true,
    trim: true
  },
  ownerName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  // Keep simple address for backward compatibility
  address: {
    type: String,
    required: true,
    trim: true
  },
  // New field: Detailed location information
  location: {
    street: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    district: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    postalCode: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true,
      default: 'Somalia'
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    placeId: {
      type: String,
      trim: true
    },
    formattedAddress: {
      type: String,
      trim: true
    }
  },
  // New field: Business details
  businessDetails: {
    type: {
      type: String,
      enum: ['retail', 'wholesale', 'service', 'manufacturing', 'restaurant', 'other'],
      default: 'retail'
    },
    category: {
      type: String,
      trim: true
    },
    foundedDate: {
      type: Date
    },
    registrationNumber: {
      type: String,
      trim: true
    },
    taxId: {
      type: String,
      trim: true
    },
    employeeCount: {
      type: Number,
      default: 1
    },
    operatingHours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String }
    }
  },
  logoUrl: {
    type: String,
    default: ''
  },
  // New field: Cover image/banner URL
  bannerUrl: {
    type: String,
    default: ''
  },
  // New field: Social media profiles
  socialMedia: {
    facebook: {
      type: String,
      trim: true
    },
    instagram: {
      type: String,
      trim: true
    },
    twitter: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true
    }
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'deleted'],
    default: 'pending'
  },
  verified: {
    type: Boolean,
    default: false
  },
  // New field: Verification information
  verificationDetails: {
    verifiedAt: {
      type: Date
    },
    verifiedBy: {
      type: String,
      trim: true
    },
    documents: [{
      type: {
        type: String,
        enum: ['businessRegistration', 'taxCertificate', 'identityDocument', 'other'],
        required: true
      },
      fileId: {
        type: String,
        trim: true
      },
      verified: {
        type: Boolean,
        default: false
      },
      notes: {
        type: String,
        trim: true
      }
    }]
  },
  // Subscription details
  subscription: {
    planType: {
      type: String,
      enum: ['monthly', 'yearly', 'trial'],
      default: 'trial'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    paymentMethod: {
      type: String,
      enum: ['online', 'offline'],
      default: 'offline'
    },
    initialPaid: {
      type: Boolean,
      default: false
    },
    paymentDetails: {
      phoneNumber: String,
      transactionId: String,
      receiptUrl: String
    },
    // New field: Plan features/limits
    features: {
      maxProducts: {
        type: Number,
        default: 100
      },
      maxEmployees: {
        type: Number,
        default: 5
      },
      maxCustomers: {
        type: Number,
        default: 500
      },
      enabledModules: {
        type: [String],
        default: ['sales', 'inventory', 'customers', 'debts']
      },
      storageLimit: {
        type: Number,
        default: 500 // In MB
      }
    }
  },
  registeredBy: {
    type: String,
    enum: ['self', 'superAdmin'],
    default: 'self'
  },
  // New field: Statistics and metrics
  statistics: {
    totalProducts: {
      type: Number,
      default: 0
    },
    totalCustomers: {
      type: Number,
      default: 0
    },
    totalSales: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    totalDebts: {
      type: Number,
      default: 0
    },
    totalDebtAmount: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  // New field: Contact person (if different from owner)
  contactPerson: {
    name: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    position: {
      type: String,
      trim: true
    }
  },
  // Enhancement: Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  // Enhancement: Notification preferences
  notifications: {
    smsEnabled: {
      type: Boolean,
      default: true
    },
    emailEnabled: {
      type: Boolean,
      default: false
    },
    dailySummary: {
      type: Boolean,
      default: true
    },
    // New notification options
    dueReminders: {
      type: Boolean,
      default: true
    },
    highRiskAlerts: {
      type: Boolean,
      default: true
    },
    lowStockAlerts: {
      type: Boolean,
      default: true
    },
    newCustomerNotifications: {
      type: Boolean,
      default: true
    },
    salesReports: {
      type: Boolean,
      default: true
    },
    paymentConfirmations: {
      type: Boolean,
      default: true
    }
  }
}, { 
  timestamps: true 
});

// Add indexes for faster querying
shopSchema.index({ status: 1 });
shopSchema.index({ 'location.city': 1 });
shopSchema.index({ 'location.coordinates': '2dsphere' });
shopSchema.index({ 'subscription.endDate': 1 });
shopSchema.index({ 'statistics.totalRevenue': -1 });

// Virtual for checking if subscription is active
shopSchema.virtual('isSubscriptionActive').get(function() {
  if (!this.subscription || !this.subscription.endDate) return false;
  return new Date() < new Date(this.subscription.endDate);
});

// Virtual for remaining subscription days
shopSchema.virtual('remainingSubscriptionDays').get(function() {
  if (!this.subscription || !this.subscription.endDate) return 0;
  
  const endDate = new Date(this.subscription.endDate);
  const today = new Date();
  
  if (today > endDate) return 0;
  
  const diffTime = Math.abs(endDate - today);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to update shop statistics
shopSchema.methods.updateStatistics = async function(updates = {}) {
  const toUpdate = {};
  
  for (const [key, value] of Object.entries(updates)) {
    if (this.statistics.hasOwnProperty(key)) {
      toUpdate[`statistics.${key}`] = value;
    }
  }
  
  if (Object.keys(toUpdate).length > 0) {
    toUpdate['statistics.lastUpdated'] = new Date();
    
    return await mongoose.model('Shop').updateOne(
      { _id: this._id },
      { $set: toUpdate }
    );
  }
  
  return null;
};

// Static method to find shops by location
shopSchema.statics.findByLocation = function(coordinates, maxDistance = 10000) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [coordinates.longitude, coordinates.latitude]
        },
        $maxDistance: maxDistance // distance in meters
      }
    },
    isDeleted: false,
    status: 'active'
  });
};

// Static method to find shops with expiring subscriptions
shopSchema.statics.findWithExpiringSubscriptions = function(daysThreshold = 7) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysThreshold);
  
  return this.find({
    isDeleted: false,
    status: 'active',
    'subscription.endDate': {
      $lte: targetDate,
      $gte: new Date()
    }
  });
};

const Shop = mongoose.model('Shop', shopSchema);

module.exports = Shop;
