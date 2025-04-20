const mongoose = require('mongoose');

const debtSchema = new mongoose.Schema({
  debtId: {
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
  customerId: {
    type: String,
    required: true,
    trim: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  debtAmount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  isSettled: {
    type: Boolean,
    default: false
  },
  dueDate: {
    type: Date,
    required: true
  },
  remindersSent: [{
    type: {
      type: String,
      enum: ['sms', 'email', 'manual'],
      required: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'success'
    }
  }],
  lastReminderDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'overdue', 'high-risk', 'paid', 'partially-paid', 'in-collection'],
    default: 'active'
  },
  riskScore: {
    type: Number,
    default: 0
  },
  riskLevel: {
    type: String,
    enum: ['High Risk', 'Medium Risk', 'Low Risk'],
    default: 'Low Risk'
  },
  collectionStatus: {
    type: String,
    enum: ['none', 'pending', 'in-process', 'resolved'],
    default: 'none'
  },
  shortNote: {
    type: String,
    trim: true
  },
  syncStatus: {
    type: String,
    enum: ['synced', 'pending'],
    default: 'synced'
  },
  syncedAt: {
    type: Date,
    default: Date.now
  },
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

debtSchema.index({ shopId: 1, customerId: 1 });
debtSchema.index({ status: 1 });
debtSchema.index({ dueDate: 1 });
debtSchema.index({ isSettled: 1 });
debtSchema.index({ shopId: 1, isSettled: 1 });
debtSchema.index({ customerPhone: 1 });

debtSchema.virtual('remainingAmount').get(function() {
  return Math.max(0, this.debtAmount - this.paidAmount);
});

debtSchema.virtual('daysOverdue').get(function() {
  if (!this.dueDate) return 0;
  
  const today = new Date();
  const dueDate = new Date(this.dueDate);
  
  if (today <= dueDate || this.isSettled) return 0;
  
  const diffTime = Math.abs(today - dueDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

debtSchema.pre('save', function(next) {
  this.isSettled = this.paidAmount >= this.debtAmount;
  
  if (this.isSettled) {
    this.status = 'paid';
  } else if (this.paidAmount > 0 && !this.isSettled) {
    this.status = 'partially-paid';
  }
  
  next();
});

const Debt = mongoose.model('Debt', debtSchema);

module.exports = Debt;
