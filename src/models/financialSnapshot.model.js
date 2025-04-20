const mongoose = require('mongoose');

const financialSnapshotSchema = new mongoose.Schema({
  snapshotId: {
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
  type: {
    type: String,
    enum: ['daily', 'monthly'],
    required: true
  },
  date: {
    type: String,
    required: true
  },
  totalSales: {
    type: Number,
    default: 0
  },
  totalDebtsCreated: {
    type: Number,
    default: 0
  },
  totalDebtRecovered: {
    type: Number,
    default: 0
  },
  totalProfit: {
    type: Number,
    default: 0
  },
  totalPOSOrders: {
    type: Number,
    default: 0
  },
  totalReceiptsPrinted: {
    type: Number,
    default: 0
  },
  totalSMS: {
    type: Number,
    default: 0
  },
  // Additional financial metrics
  totalOutstandingDebt: {
    type: Number,
    default: 0
  },
  highRiskDebtPercentage: {
    type: Number,
    default: 0
  },
  topSellingProducts: [{
    productId: String,
    name: String,
    quantity: Number
  }],
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
  }
});

// Add indexes for faster querying
financialSnapshotSchema.index({ shopId: 1, date: 1, type: 1 }, { unique: true });
financialSnapshotSchema.index({ type: 1, date: 1 });

const FinancialSnapshot = mongoose.model('FinancialSnapshot', financialSnapshotSchema);

module.exports = FinancialSnapshot;
