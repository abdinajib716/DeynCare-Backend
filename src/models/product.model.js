const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productId: {
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
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  price: {
    type: Number,
    required: true
  },
  cost: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    trim: true
  },
  stockQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 5,
    min: 0
  },
  categoryId: {
    type: String,
    trim: true,
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  sku: {
    type: String,
    trim: true,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'outOfStock', 'discontinued', 'deleted'],
    default: 'active'
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

productSchema.index({ shopId: 1, name: 1 });
productSchema.index({ status: 1 });
productSchema.index({ shopId: 1, categoryId: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ stockQuantity: 1 });

productSchema.virtual('profitMargin').get(function() {
  if (!this.price || !this.cost || this.cost === 0) return 0;
  return ((this.price - this.cost) / this.price) * 100;
});

productSchema.methods.isLowStock = function() {
  return this.stockQuantity <= this.lowStockThreshold;
};

productSchema.pre('save', function(next) {
  if (this.isModified('stockQuantity') && this.stockQuantity === 0 && this.status === 'active') {
    this.status = 'outOfStock';
  }
  next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
