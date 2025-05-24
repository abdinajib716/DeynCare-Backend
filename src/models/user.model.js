const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const mongoosePaginate = require('mongoose-paginate-v2');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  fullName: {
    type: String, 
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['superAdmin', 'admin', 'employee'],
    required: true
  },
  shopId: {
    type: String,
    default: null // superAdmin can operate without a shop, admin/employee must have a shop
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'active'
  },
  // New field: Flag for suspension
  isSuspended: {
    type: Boolean,
    default: false
  },
  // New field: Suspension reason
  suspensionReason: {
    type: String,
    default: null
  },
  verified: {
    type: Boolean,
    default: false
  },
  // Enhancement: Email verification status
  emailVerified: {
    type: Boolean,
    default: false
  },
  verificationCode: {
    type: String
  },
  verifiedAt: {
    type: Date
  },
  // New field: Last login time tracking
  lastLoginAt: {
    type: Date,
    default: null
  },
  // New field: Login history
  loginHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    device: String,
    browser: String,
    location: String,
    status: {
      type: String,
      enum: ['success', 'failed'],
      default: 'success'
    }
  }],
  // Password reset fields
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  // New field: Password history
  passwordHistory: [{
    password: String,
    changedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // New field: Account preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: true
      },
      app: {
        type: Boolean,
        default: true
      }
    }
  },
  // New field: Two-factor authentication
  twoFactorAuth: {
    enabled: {
      type: Boolean,
      default: false
    },
    method: {
      type: String,
      enum: ['app', 'sms', 'email', 'none'],
      default: 'none'
    },
    secret: {
      type: String,
      default: null
    }
  },
  // New field: Profile picture
  profilePicture: {
    type: String,
    default: null
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

// Index for optimizing queries
userSchema.index({ shopId: 1, role: 1 });
userSchema.index({ email: 1 });
userSchema.index({ status: 1 });
userSchema.index({ lastLoginAt: 1 });

// Apply the pagination plugin
userSchema.plugin(mongoosePaginate);

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    // Store old password in history before changing
    if (this.password && this.isModified('password') && !this.isNew) {
      if (!this.passwordHistory) this.passwordHistory = [];
      
      // Only keep up to 5 previous passwords
      if (this.passwordHistory.length >= 5) {
        this.passwordHistory.shift();
      }
      
      this.passwordHistory.push({
        password: this.password,
        changedAt: new Date()
      });
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if password was used before
userSchema.methods.isPasswordReused = async function(newPassword) {
  if (!this.passwordHistory || this.passwordHistory.length === 0) {
    return false;
  }
  
  // Check against stored password history
  for (const historyItem of this.passwordHistory) {
    if (await bcrypt.compare(newPassword, historyItem.password)) {
      return true;
    }
  }
  
  return false;
};

// Method to update last login time
userSchema.methods.updateLastLogin = function(loginData = {}) {
  this.lastLoginAt = new Date();
  
  // Add to login history
  if (!this.loginHistory) this.loginHistory = [];
  
  // Keep only last 10 login records
  if (this.loginHistory.length >= 10) {
    this.loginHistory.shift();
  }
  
  this.loginHistory.push({
    timestamp: new Date(),
    ipAddress: loginData.ipAddress || null,
    device: loginData.device || null,
    browser: loginData.browser || null,
    location: loginData.location || null,
    status: loginData.status || 'success'
  });
  
  return this.save();
};

// Updates auto-suspend status based on login attempts
userSchema.statics.checkFailedLoginAttempts = async function(userId) {
  const user = await this.findOne({ userId });
  if (!user) return null;
  
  // Count recent failed attempts (within last 30 minutes)
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const recentFailedAttempts = user.loginHistory.filter(
    login => login.status === 'failed' && login.timestamp > thirtyMinutesAgo
  ).length;
  
  // Auto-suspend on too many failed attempts
  if (recentFailedAttempts >= 5 && !user.isSuspended) {
    user.isSuspended = true;
    user.status = 'suspended';
    user.suspensionReason = 'Automatic suspension due to multiple failed login attempts';
    await user.save();
  }
  
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
