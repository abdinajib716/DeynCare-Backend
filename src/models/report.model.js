const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reportId: {
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
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['debt', 'sales', 'ml-risk', 'pos-profit'],
    required: true
  },
  format: {
    type: String,
    enum: ['pdf', 'csv', 'excel'],
    required: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  parameters: {
    startDate: Date,
    endDate: Date,
    filters: mongoose.Schema.Types.Mixed
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
  generatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: String,
    required: true,
    trim: true
  }
});

// Add indexes for faster querying
reportSchema.index({ shopId: 1, type: 1 });
reportSchema.index({ createdBy: 1 });
reportSchema.index({ generatedAt: -1 });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
