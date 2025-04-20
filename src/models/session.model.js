const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  userId: {
    type: String,
    required: true,
    trim: true
  },
  userRole: {
    type: String,
    trim: true,
    required: true
  },
  shopId: {
    type: String,
    trim: true
  },
  device: {
    type: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop', 'unknown'],
      default: 'unknown'
    },
    name: {
      type: String,
      trim: true
    },
    model: {
      type: String,
      trim: true
    },
    os: {
      name: {
        type: String,
        trim: true
      },
      version: {
        type: String,
        trim: true
      }
    }
  },
  browser: {
    name: {
      type: String,
      trim: true
    },
    version: {
      type: String,
      trim: true
    },
    language: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    }
  },
  ip: {
    type: String,
    trim: true
  },
  location: {
    city: {
      type: String,
      trim: true
    },
    region: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  name: {
    type: String,
    trim: true,
    default: 'Default Session'
  },
  token: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    trim: true
  },
  lastRefreshed: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['active', 'idle', 'expired', 'terminated', 'suspicious'],
    default: 'active'
  },
  terminationReason: {
    type: String,
    trim: true
  },
  activities: [{
    action: {
      type: String,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed,
    ip: String
  }],
  accessedRoutes: [{
    path: String,
    count: Number,
    lastAccessed: Date
  }],
  suspiciousActivities: [{
    type: {
      type: String,
      enum: ['multipleFailedAttempts', 'unusualLocation', 'rapidRequests', 'sensitiveActions', 'other'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: {
      type: String,
      trim: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  }],
  features: {
    allowedModules: {
      type: [String],
      default: []
    },
    restrictions: {
      type: [String],
      default: []
    },
    temporaryPermissions: [{
      permission: String,
      expiresAt: Date,
      grantedBy: String
    }]
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  idleTimeoutMinutes: {
    type: Number,
    default: 30,
    min: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

sessionSchema.index({ userId: 1 });
sessionSchema.index({ token: 1 });
sessionSchema.index({ refreshToken: 1 });
sessionSchema.index({ expiresAt: 1 });
sessionSchema.index({ 'device.name': 1, 'device.type': 1 });
sessionSchema.index({ 'location.country': 1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ isActive: 1, lastSeen: -1 });

sessionSchema.virtual('durationMinutes').get(function() {
  const now = new Date();
  const start = this.createdAt || now;
  const diffMs = Math.abs(now - start);
  return Math.floor(diffMs / (1000 * 60));
});

sessionSchema.virtual('minutesUntilExpiration').get(function() {
  const now = new Date();
  const expiry = this.expiresAt;
  
  if (now >= expiry) return 0;
  
  const diffMs = Math.abs(expiry - now);
  return Math.floor(diffMs / (1000 * 60));
});

sessionSchema.virtual('isExpired').get(function() {
  return new Date() >= this.expiresAt;
});

sessionSchema.virtual('isIdle').get(function() {
  if (!this.lastActive) return false;
  
  const now = new Date();
  const lastActive = new Date(this.lastActive);
  const idleThresholdMs = this.idleTimeoutMinutes * 60 * 1000;
  
  return (now - lastActive) >= idleThresholdMs;
});

sessionSchema.methods.updateActivity = function(action, details = {}, ip = null) {
  this.lastSeen = new Date();
  this.lastActive = new Date();
  
  if (!this.activities) this.activities = [];
  
  this.activities.push({
    action,
    timestamp: new Date(),
    details,
    ip: ip || this.ip
  });
  
  if (this.activities.length > 50) {
    this.activities = this.activities.slice(-50);
  }
  
  return this.save();
};

sessionSchema.methods.recordRouteAccess = function(path) {
  if (!this.accessedRoutes) this.accessedRoutes = [];
  
  const existingRoute = this.accessedRoutes.find(r => r.path === path);
  
  if (existingRoute) {
    existingRoute.count += 1;
    existingRoute.lastAccessed = new Date();
  } else {
    this.accessedRoutes.push({
      path,
      count: 1,
      lastAccessed: new Date()
    });
  }
  
  this.lastActive = new Date();
  this.lastSeen = new Date();
  
  return this.save();
};

sessionSchema.methods.flagSuspiciousActivity = function(type, details, severity = 'medium') {
  if (!this.suspiciousActivities) this.suspiciousActivities = [];
  
  this.suspiciousActivities.push({
    type,
    timestamp: new Date(),
    details,
    severity
  });
  
  if (severity === 'high') {
    this.status = 'suspicious';
  }
  
  return this.save();
};

sessionSchema.methods.terminate = function(reason = 'User logout') {
  this.isActive = false;
  this.status = 'terminated';
  this.terminationReason = reason;
  
  return this.save();
};

sessionSchema.methods.refresh = function(newExpiresAt, newToken = null, newRefreshToken = null) {
  this.expiresAt = newExpiresAt;
  this.lastRefreshed = new Date();
  
  if (newToken) {
    this.token = newToken;
  }
  
  if (newRefreshToken) {
    this.refreshToken = newRefreshToken;
  }
  
  return this.save();
};

sessionSchema.statics.findActiveSessionsByUser = function(userId) {
  return this.find({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).sort({ lastSeen: -1 });
};

sessionSchema.statics.cleanupExpiredSessions = function() {
  return this.updateMany(
    { expiresAt: { $lte: new Date() }, isActive: true },
    { $set: { isActive: false, status: 'expired' } }
  );
};

sessionSchema.statics.getSessionAnalytics = async function(timeframe = 30) {
  const date = new Date();
  date.setDate(date.getDate() - timeframe);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: date }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        byDevice: {
          $push: {
            deviceType: '$device.type',
            deviceName: '$device.name'
          }
        },
        byCountry: {
          $push: '$location.country'
        }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
