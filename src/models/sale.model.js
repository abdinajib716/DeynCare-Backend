const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true
  },
  cost: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    trim: true
  },
  discount: {
    type: Number,
    default: 0
  },
  taxRate: {
    type: Number,
    default: 0
  },
  originalPrice: {
    type: Number
  }
}, { _id: false });

const saleSchema = new mongoose.Schema({
  saleId: {
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
    trim: true
  },
  customerName: {
    type: String,
    default: 'Walk-in',
    trim: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  soldBy: {
    type: String,
    trim: true,
    required: true
  },
  soldByName: {
    type: String,
    trim: true
  },
  items: [saleItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  totalCost: {
    type: Number,
    required: true
  },
  totalProfit: {
    type: Number,
    required: true
  },
  subtotal: {
    type: Number,
    required: true
  },
  totalDiscount: {
    type: Number,
    default: 0
  },
  totalTax: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    required: true,
    trim: true
  },
  paymentDetails: {
    cardType: String,
    last4Digits: String,
    transactionId: String,
    mobileNumber: String,
    amountTendered: Number,
    changeGiven: Number
  },
  status: {
    type: String,
    enum: ['completed', 'returned', 'partially-returned', 'cancelled'],
    default: 'completed'
  },
  isCredit: {
    type: Boolean,
    default: false
  },
  debtId: {
    type: String,
    trim: true
  },
  returnInfo: {
    returnedAt: {
      type: Date
    },
    returnedBy: {
      type: String,
      trim: true
    },
    returnReason: {
      type: String,
      trim: true
    },
    returnedItems: [{
      productId: String,
      name: String,
      quantity: Number,
      refundAmount: Number
    }],
    totalRefundAmount: {
      type: Number,
      default: 0
    }
  },
  receiptNumber: {
    type: String,
    trim: true
  },
  note: {
    type: String,
    trim: true
  },
  channel: {
    type: String,
    enum: ['pos', 'online', 'phone', 'other'],
    default: 'pos'
  },
  discountInfo: {
    code: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'none'],
      default: 'none'
    },
    value: {
      type: Number,
      default: 0
    },
    reason: {
      type: String,
      trim: true
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
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

saleSchema.index({ shopId: 1, createdAt: -1 });
saleSchema.index({ paymentMethod: 1 });
saleSchema.index({ customerId: 1 });
saleSchema.index({ 'items.productId': 1 });
saleSchema.index({ soldBy: 1 });
saleSchema.index({ receiptNumber: 1 });
saleSchema.index({ status: 1 });
saleSchema.index({ isCredit: 1 });
saleSchema.index({ tags: 1 });

saleSchema.virtual('ageInDays').get(function() {
  return Math.ceil((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

saleSchema.methods.getProfitMarginPercentage = function() {
  if (this.totalAmount === 0) return 0;
  return (this.totalProfit / this.totalAmount) * 100;
};

saleSchema.methods.processReturn = function(returnData) {
  const { returnedBy, returnReason, returnedItems } = returnData;
  
  if (!returnedItems || !Array.isArray(returnedItems) || returnedItems.length === 0) {
    throw new Error('Must provide items to return');
  }
  
  let totalRefundAmount = 0;
  
  returnedItems.forEach(item => {
    const originalItem = this.items.find(i => i.productId === item.productId);
    if (!originalItem) {
      throw new Error(`Item ${item.productId} not found in original sale`);
    }
    
    if (item.quantity > originalItem.quantity) {
      throw new Error(`Cannot return more than original quantity for ${originalItem.name}`);
    }
    
    item.name = originalItem.name;
    item.refundAmount = item.quantity * originalItem.price;
    totalRefundAmount += item.refundAmount;
  });
  
  const areAllItemsReturned = returnedItems.every(item => {
    const originalItem = this.items.find(i => i.productId === item.productId);
    return item.quantity === originalItem.quantity;
  });
  
  this.status = areAllItemsReturned ? 'returned' : 'partially-returned';
  
  this.returnInfo = {
    returnedAt: new Date(),
    returnedBy,
    returnReason: returnReason || 'No reason provided',
    returnedItems,
    totalRefundAmount
  };
  
  return this.save();
};

saleSchema.statics.getSalesByDateRange = function(shopId, startDate, endDate) {
  return this.find({
    shopId,
    createdAt: { $gte: startDate, $lte: endDate },
    isDeleted: false
  }).sort({ createdAt: -1 });
};

saleSchema.statics.getProductSalesStats = function(shopId, productId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        shopId,
        createdAt: { $gte: startDate, $lte: endDate },
        'items.productId': productId,
        isDeleted: false
      }
    },
    { $unwind: '$items' },
    {
      $match: {
        'items.productId': productId
      }
    },
    {
      $group: {
        _id: null,
        totalQuantitySold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        totalProfit: {
          $sum: {
            $multiply: [
              { $subtract: ['$items.price', '$items.cost'] },
              '$items.quantity'
            ]
          }
        },
        saleCount: { $sum: 1 }
      }
    }
  ]);
};

saleSchema.statics.getTopSellingProducts = function(shopId, limit = 10, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        shopId,
        createdAt: { $gte: startDate, $lte: endDate },
        isDeleted: false
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: {
          productId: '$items.productId',
          name: '$items.name'
        },
        totalQuantitySold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        totalProfit: {
          $sum: {
            $multiply: [
              { $subtract: ['$items.price', '$items.cost'] },
              '$items.quantity'
            ]
          }
        },
        saleCount: { $sum: 1 }
      }
    },
    { $sort: { totalQuantitySold: -1 } },
    { $limit: limit }
  ]);
};

const Sale = mongoose.model('Sale', saleSchema);

module.exports = Sale;
