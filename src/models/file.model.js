const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  fileId: {
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
  uploadedBy: {
    type: String,
    required: true,
    trim: true
  },
  fileType: {
    type: String,
    enum: ['logo', 'payment-proof', 'receipt', 'customer-document', 'other'],
    required: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  size: {
    type: Number,
    required: true
  },
  extension: {
    type: String,
    required: true,
    trim: true
  },
  // New fields: Polymorphic relationship
  linkedEntityType: {
    type: String,
    enum: ['shop', 'user', 'customer', 'payment', 'debt', 'product', 'report', 'none'],
    default: 'none'
  },
  linkedEntityId: {
    type: String,
    default: null,
    trim: true
  },
  // New field: File description
  description: {
    type: String,
    trim: true,
    default: ''
  },
  // New field: Public access flag
  isPublic: {
    type: Boolean,
    default: false
  },
  // New field: File metadata (flexible schema)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  // New field: File expiration date
  expiresAt: {
    type: Date,
    default: null
  }
});

// Add indexes for faster querying
fileSchema.index({ shopId: 1, fileType: 1 });
fileSchema.index({ uploadedBy: 1 });
fileSchema.index({ linkedEntityType: 1, linkedEntityId: 1 }); // Index for polymorphic lookups
fileSchema.index({ expiresAt: 1 }); // Index for TTL operations

// Check if file has expired
fileSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Pre-find hook to exclude expired files
fileSchema.pre(/^find/, function(next) {
  // By default, don't return expired or deleted files
  if (!this._conditions.includeExpired) {
    this.where({ 
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ],
      isDeleted: false
    });
  }
  next();
});

// Set a function to calculate storage usage by shopId
fileSchema.statics.calculateStorageUsage = async function(shopId) {
  const result = await this.aggregate([
    { $match: { shopId, isDeleted: false } },
    { $group: { _id: null, totalSize: { $sum: '$size' } } }
  ]);
  
  return result.length > 0 ? result[0].totalSize : 0;
};

const File = mongoose.model('File', fileSchema);

module.exports = File;
