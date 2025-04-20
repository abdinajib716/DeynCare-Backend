const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: {
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
    trim: true
  },
  paymentContext: {
    type: String,
    enum: ['debt', 'subscription', 'pos'],
    required: true
  },
  debtId: {
    type: String,
    required: function () {
      return this.paymentContext === 'debt';
    },
    trim: true
  },
  subscriptionId: {
    type: String,
    trim: true
  },
  posOrderId: {
    type: String,
    trim: true
  },
  invoiceId: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  },
  debtAmount: {
    type: Number
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  method: {
    type: String,
    enum: ['Cash', 'EVC Plus', 'Bank Transfer', 'Mobile Money', 'Check', 'Card', 'Other'],
    required: true
  },
  referenceNumber: {
    type: String,
    trim: true
  },
  isConfirmed: {
    type: Boolean,
    default: false
  },
  confirmedAt: {
    type: Date
  },
  confirmedBy: {
    type: String,
    trim: true
  },
  receiptNumber: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed', 'refunded', 'partially-refunded'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true
  },
  proofFileId: {
    type: String,
    trim: true
  },
  refund: {
    amount: {
      type: Number,
      default: 0
    },
    date: {
      type: Date
    },
    reason: {
      type: String,
      trim: true
    },
    processedBy: {
      type: String,
      trim: true
    }
  },
  recordedBy: {
    type: String,
    required: true
  },
  recordedFromIp: {
    type: String,
    trim: true
  },
  verificationAttempts: [{
    attemptedAt: {
      type: Date,
      default: Date.now
    },
    attemptedBy: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['successful', 'failed'],
      default: 'failed'
    },
    notes: {
      type: String,
      trim: true
    }
  }],
  gatewayInfo: {
    gatewayName: {
      type: String,
      trim: true
    },
    transactionId: {
      type: String,
      trim: true
    },
    gatewayFee: {
      type: Number,
      default: 0
    },
    responseCode: {
      type: String,
      trim: true
    },
    responseMessage: {
      type: String,
      trim: true
    }
  },
  integrationStatus: {
    type: String,
    enum: ['not_applicable', 'requested', 'processing', 'success', 'failed'],
    default: 'not_applicable'
  },
  sessionType: {
    type: String,
    enum: ['walk-in', 'online'],
    default: 'walk-in'
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

paymentSchema.index({ shopId: 1, debtId: 1 });
paymentSchema.index({ customerId: 1 });
paymentSchema.index({ paymentDate: 1 });
paymentSchema.index({ isConfirmed: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ 'refund.date': 1 });
paymentSchema.index({ receiptNumber: 1 });

paymentSchema.virtual('settlesDebtFully').get(function() {
  if (!this.debtAmount || this.debtAmount === 0) return false;
  return this.amount >= this.debtAmount;
});

paymentSchema.virtual('relatedRecord').get(function() {
  if (this.paymentContext === 'debt') return this.debtId;
  if (this.paymentContext === 'subscription') return this.subscriptionId;
  if (this.paymentContext === 'pos') return this.posOrderId;
  return null;
});

paymentSchema.methods.confirm = function(userId) {
  this.isConfirmed = true;
  this.confirmedAt = new Date();
  this.confirmedBy = userId;
  this.status = 'confirmed';

  this.verificationAttempts.push({
    attemptedAt: new Date(),
    attemptedBy: userId,
    status: 'successful',
    notes: 'Payment confirmed manually'
  });

  return this.save();
};

paymentSchema.methods.recordRefund = function(refundData) {
  if (!refundData.amount || refundData.amount <= 0) {
    throw new Error('Refund amount must be greater than zero');
  }

  if (refundData.amount > this.amount) {
    throw new Error('Refund amount cannot exceed original payment amount');
  }

  this.refund = {
    amount: refundData.amount,
    date: new Date(),
    reason: refundData.reason || 'No reason provided',
    processedBy: refundData.processedBy
  };

  this.status = refundData.amount === this.amount ? 'refunded' : 'partially-refunded';

  return this.save();
};

paymentSchema.methods.addVerificationAttempt = function(attemptData) {
  if (!this.verificationAttempts) {
    this.verificationAttempts = [];
  }

  this.verificationAttempts.push({
    attemptedAt: new Date(),
    attemptedBy: attemptData.attemptedBy,
    status: attemptData.status || 'failed',
    notes: attemptData.notes || ''
  });

  return this.save();
};

paymentSchema.statics.findUnconfirmedPayments = function(shopId, options = {}) {
  const query = { 
    shopId, 
    isConfirmed: false,
    isDeleted: false,
    status: { $ne: 'refunded' } 
  };

  if (options.olderThan) {
    const date = new Date();
    date.setHours(date.getHours() - options.olderThan);
    query.createdAt = { $lte: date };
  }

  const limit = options.limit || 50;

  return this.find(query)
    .sort({ createdAt: 1 })
    .limit(limit);
};

paymentSchema.statics.getPaymentStatsByDateRange = function(shopId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        shopId,
        paymentDate: { $gte: startDate, $lte: endDate },
        isDeleted: false,
        status: 'confirmed'
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        methods: {
          $push: {
            method: '$method',
            amount: '$amount'
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
