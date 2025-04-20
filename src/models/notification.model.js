const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notificationId: {
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
  recipient: {
    type: String,
    required: true,
    trim: true
  },
  // New field: Recipient type (user, customer, etc.)
  recipientType: {
    type: String,
    enum: ['user', 'customer', 'admin', 'system'],
    default: 'user'
  },
  // New field: Recipient name for better readability in logs
  recipientName: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['SMS', 'Push', 'Email', 'InApp'],
    required: true
  },
  // New field: Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  // New field: Category for filtering
  category: {
    type: String,
    enum: ['transactional', 'promotional', 'reminder', 'alert', 'system'],
    default: 'transactional'
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  // New field: Title/subject of notification
  title: {
    type: String,
    trim: true
  },
  // New field: Template ID if using a template
  templateId: {
    type: String,
    trim: true
  },
  // New field: Template data
  templateData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'pending', 'delivered', 'read'],
    default: 'pending'
  },
  // New field: Failure reason when status is 'failed'
  failureReason: {
    type: String,
    trim: true
  },
  // New field: Delivery attempts
  deliveryAttempts: {
    type: Number,
    default: 0
  },
  // New field: Maximum retry attempts
  maxRetries: {
    type: Number,
    default: 3
  },
  // New field: Next retry time
  nextRetryAt: {
    type: Date
  },
  // New field: Provider info (e.g., Twilio for SMS)
  provider: {
    name: {
      type: String,
      trim: true
    },
    messageId: {
      type: String,
      trim: true
    },
    cost: {
      type: Number
    }
  },
  // New field: Read status
  readAt: {
    type: Date
  },
  // New field: Delivered timestamp
  deliveredAt: {
    type: Date
  },
  // New field: Related entity (e.g., order, debt, payment)
  relatedEntity: {
    type: {
      type: String,
      trim: true
    },
    id: {
      type: String,
      trim: true
    }
  },
  // New field: Action URL (for clickable notifications)
  actionUrl: {
    type: String,
    trim: true
  },
  // New field: Expiration for time-sensitive notifications
  expiresAt: {
    type: Date
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

// Add indexes for faster querying
notificationSchema.index({ shopId: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ category: 1 });
notificationSchema.index({ nextRetryAt: 1 }); // For retry queue processing
notificationSchema.index({ expiresAt: 1 }); // For auto-expiring notifications
notificationSchema.index({ 'relatedEntity.type': 1, 'relatedEntity.id': 1 }); // For finding related notifications

// Virtual property to check if notification is expired
notificationSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Virtual property to check if notification is retryable
notificationSchema.virtual('isRetryable').get(function() {
  return this.status === 'failed' && this.deliveryAttempts < this.maxRetries;
});

// Method to increment delivery attempts
notificationSchema.methods.incrementAttempts = function() {
  this.deliveryAttempts += 1;
  
  if (this.deliveryAttempts >= this.maxRetries) {
    this.status = 'failed';
    this.failureReason = this.failureReason || 'Maximum retry attempts reached';
  } else {
    // Exponential backoff for retries: 5min, 15min, 60min
    const delayMinutes = Math.pow(3, this.deliveryAttempts) * 5; 
    this.nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
  }
  
  return this.save();
};

// Method to mark as delivered
notificationSchema.methods.markDelivered = function() {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  return this.save();
};

// Method to mark as read
notificationSchema.methods.markRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// Static method to find pending notifications ready for processing
notificationSchema.statics.findPendingForProcessing = function() {
  return this.find({
    status: 'pending',
    $or: [
      { nextRetryAt: { $exists: false } },
      { nextRetryAt: { $lte: new Date() } }
    ],
    isDeleted: false
  }).sort({ priority: -1, createdAt: 1 });
};

// Static method to find failed notifications
notificationSchema.statics.findFailed = function(shopId) {
  const query = { 
    status: 'failed',
    isDeleted: false 
  };
  
  if (shopId) {
    query.shopId = shopId;
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to find messages for a specific recipient
notificationSchema.statics.findByRecipient = function(recipient, options = {}) {
  const query = { recipient, isDeleted: false };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.category) {
    query.category = options.category;
  }
  
  const limit = options.limit || 20;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit);
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
