const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  actorId: {
    type: String,
    required: true,
    trim: true
  },
  actorName: {
    type: String,
    trim: true
  },
  actorIp: {
    type: String,
    trim: true
  },
  deviceInfo: {
    type: String,
    trim: true
  },
  browserInfo: {
    name: {
      type: String,
      trim: true
    },
    version: {
      type: String,
      trim: true
    }
  },
  osInfo: {
    name: {
      type: String,
      trim: true
    },
    version: {
      type: String,
      trim: true
    }
  },
  location: {
    city: {
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
  action: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  targetId: {
    type: String,
    trim: true
  },
  targetType: {
    type: String,
    trim: true
  },
  previousState: {
    type: mongoose.Schema.Types.Mixed
  },
  newState: {
    type: mongoose.Schema.Types.Mixed
  },
  role: {
    type: String,
    required: true,
    trim: true
  },
  module: {
    type: String,
    required: true,
    trim: true
  },
  subModule: {
    type: String,
    trim: true
  },
  shopId: {
    type: String,
    trim: true 
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'warning', 'info'],
    default: 'success',
    required: true
  },
  errorDetails: {
    type: String,
    trim: true
  },
  sessionId: {
    type: String,
    trim: true
  },
  requestId: {
    type: String,
    trim: true
  },
  performanceMetrics: {
    executionTimeMs: {
      type: Number
    },
    memoryUsageMb: {
      type: Number
    }
  },
  severity: {
    type: String,
    enum: ['debug', 'info', 'warning', 'error', 'critical'],
    default: 'info'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

logSchema.index({ shopId: 1, timestamp: -1 });
logSchema.index({ actorId: 1 });
logSchema.index({ module: 1 });
logSchema.index({ actorIp: 1 });
logSchema.index({ sessionId: 1 });
logSchema.index({ status: 1 });
logSchema.index({ severity: 1 });
logSchema.index({ targetType: 1, targetId: 1 });

logSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

logSchema.statics.findSuspiciousActivities = function(shopId = null, options = {}) {
  const filter = {
    $or: [
      { status: 'failure', action: { $in: ['login', 'resetPassword', 'updatePermission'] } },
      { severity: { $in: ['error', 'critical'] } }
    ]
  };
  
  if (shopId) {
    filter.shopId = shopId;
  }
  
  const limit = options.limit || 100;
  const skipDays = options.skipDays || 0;
  
  let query = this.find(filter);
  
  if (skipDays > 0) {
    const date = new Date();
    date.setDate(date.getDate() - skipDays);
    query = query.where('timestamp').gt(date);
  }
  
  return query.sort({ timestamp: -1 }).limit(limit);
};

logSchema.statics.getUserActivityTimeline = function(actorId, limit = 50) {
  return this.find({ actorId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

logSchema.statics.getEntityHistory = function(targetType, targetId, limit = 20) {
  return this.find({ 
    targetType, 
    targetId 
  })
  .sort({ timestamp: -1 })
  .limit(limit);
};

logSchema.statics.getRecentActivitiesByModule = function(module, shopId = null, limit = 20) {
  const query = { module };
  
  if (shopId) {
    query.shopId = shopId;
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit);
};

const Log = mongoose.model('Log', logSchema);

module.exports = Log;
