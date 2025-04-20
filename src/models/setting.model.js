const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  // New field: Category for organizing settings
  category: {
    type: String,
    enum: ['system', 'notification', 'payment', 'security', 'display', 'ml', 'integration', 'custom'],
    default: 'system',
    required: true
  },
  // New field: Display name for UI
  displayName: {
    type: String,
    trim: true
  },
  // New field: Description of what the setting controls
  description: {
    type: String,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  // New field: Data type for validation
  dataType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array', 'date'],
    required: true
  },
  // New field: Default value to reset to
  defaultValue: {
    type: mongoose.Schema.Types.Mixed
  },
  // New field: Validation constraints
  validation: {
    // For strings
    minLength: Number,
    maxLength: Number,
    pattern: String,
    // For numbers
    min: Number,
    max: Number,
    // For arrays
    minItems: Number,
    maxItems: Number,
    // For objects
    required: [String],
    // For all
    enum: [mongoose.Schema.Types.Mixed]
  },
  // New field: Access level required to modify
  accessLevel: {
    type: String,
    enum: ['superAdmin', 'admin', 'all'],
    default: 'admin'
  },
  // New field: Is setting editable by users
  isEditable: {
    type: Boolean,
    default: true
  },
  // New field: Is setting visible in UI
  isVisible: {
    type: Boolean,
    default: true
  },
  // New field: Shop ID (null for global settings)
  shopId: {
    type: String,
    default: null
  },
  updatedBy: {
    type: String,
    required: true,
    trim: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // New field: Value history for auditing
  history: [{
    value: mongoose.Schema.Types.Mixed,
    updatedBy: String,
    updatedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }]
});

// Add indexes for performance
settingSchema.index({ category: 1 });
settingSchema.index({ shopId: 1, key: 1 }, { unique: true });

// Pre-save hook to validate setting value based on data type
settingSchema.pre('save', function(next) {
  // Only run validation if value or dataType has been modified
  if (!this.isModified('value') && !this.isModified('dataType')) {
    return next();
  }
  
  try {
    const { value, dataType, validation = {} } = this;
    
    // Type validation
    switch(dataType) {
      case 'string':
        if (typeof value !== 'string') {
          throw new Error(`Expected string value for setting ${this.key}`);
        }
        if (validation.minLength && value.length < validation.minLength) {
          throw new Error(`String length below minimum of ${validation.minLength}`);
        }
        if (validation.maxLength && value.length > validation.maxLength) {
          throw new Error(`String length exceeds maximum of ${validation.maxLength}`);
        }
        if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
          throw new Error(`String does not match required pattern`);
        }
        break;
        
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          throw new Error(`Expected number value for setting ${this.key}`);
        }
        if (validation.min !== undefined && value < validation.min) {
          throw new Error(`Number below minimum of ${validation.min}`);
        }
        if (validation.max !== undefined && value > validation.max) {
          throw new Error(`Number exceeds maximum of ${validation.max}`);
        }
        break;
        
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new Error(`Expected boolean value for setting ${this.key}`);
        }
        break;
        
      case 'array':
        if (!Array.isArray(value)) {
          throw new Error(`Expected array value for setting ${this.key}`);
        }
        if (validation.minItems && value.length < validation.minItems) {
          throw new Error(`Array length below minimum of ${validation.minItems}`);
        }
        if (validation.maxItems && value.length > validation.maxItems) {
          throw new Error(`Array length exceeds maximum of ${validation.maxItems}`);
        }
        break;
        
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          throw new Error(`Expected object value for setting ${this.key}`);
        }
        if (validation.required && Array.isArray(validation.required)) {
          for (const field of validation.required) {
            if (!(field in value)) {
              throw new Error(`Required field "${field}" missing in object`);
            }
          }
        }
        break;
        
      case 'date':
        if (!(value instanceof Date) && isNaN(new Date(value).getTime())) {
          throw new Error(`Expected valid date value for setting ${this.key}`);
        }
        break;
    }
    
    // Enum validation for any type
    if (validation.enum && Array.isArray(validation.enum) && validation.enum.length > 0) {
      if (!validation.enum.some(item => 
        JSON.stringify(item) === JSON.stringify(value)
      )) {
        throw new Error(`Value not in allowed options for setting ${this.key}`);
      }
    }
    
    // Add to history if this is an update (not a new document)
    if (!this.isNew && this.isModified('value')) {
      if (!this.history) {
        this.history = [];
      }
      
      this.history.push({
        value: this._previousValue || this.value,
        updatedBy: this.updatedBy,
        updatedAt: this.updatedAt,
        reason: this._updateReason || 'Value update'
      });
      
      // Limit history size (keep last 10 entries)
      if (this.history.length > 10) {
        this.history = this.history.slice(-10);
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to get settings by category
settingSchema.statics.getByCategory = function(category, shopId = null) {
  const query = { category };
  if (shopId) {
    query.shopId = shopId;
  }
  return this.find(query);
};

// Static method to get settings by shop
settingSchema.statics.getShopSettings = function(shopId) {
  return this.find({ shopId });
};

// Static method to get global settings
settingSchema.statics.getGlobalSettings = function() {
  return this.find({ shopId: null });
};

// Static method to get a setting with default fallback
settingSchema.statics.getValueWithDefault = async function(key, shopId = null, defaultValue = null) {
  const query = { key };
  if (shopId) {
    query.shopId = shopId;
  }
  
  const setting = await this.findOne(query);
  if (!setting) {
    return defaultValue;
  }
  
  return setting.value;
};

// Instance method to update with reason for audit trail
settingSchema.methods.updateWithReason = function(newValue, updatedBy, reason) {
  this._previousValue = this.value;
  this._updateReason = reason;
  
  this.value = newValue;
  this.updatedBy = updatedBy;
  this.updatedAt = new Date();
  
  return this.save();
};

// Instance method to reset to default value
settingSchema.methods.resetToDefault = function(updatedBy) {
  if (this.defaultValue === undefined) {
    throw new Error(`No default value defined for setting ${this.key}`);
  }
  
  return this.updateWithReason(
    this.defaultValue,
    updatedBy,
    'Reset to default value'
  );
};

const Setting = mongoose.model('Setting', settingSchema);

module.exports = Setting;
