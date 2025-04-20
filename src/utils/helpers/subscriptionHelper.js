const { AppError } = require('../index');
const { logError } = require('../logger.js');

/**
 * Helper for subscription-related operations
 */
const SubscriptionHelper = {
  /**
   * Calculate subscription end date based on plan type
   * @param {string} planType - Subscription plan type (trial, monthly, yearly)
   * @param {Date} startDate - Subscription start date (default: now)
   * @returns {Date} Calculated end date
   */
  calculateEndDate(planType, startDate = new Date()) {
    try {
      const start = new Date(startDate);
      
      switch (planType.toLowerCase()) {
        case 'trial':
          // Trial periods last 14 days
          return new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
        case 'monthly':
          return new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
        case 'yearly':
          return new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
        default:
          // Default to trial if unknown plan type
          return new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
      }
    } catch (error) {
      logError(`Error calculating subscription end date: ${error.message}`, 'SubscriptionHelper', error);
      // Default fallback to 14 days (trial period)
      return new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000);
    }
  },

  /**
   * Get default subscription configuration
   * @param {Object} options - Subscription options
   * @param {string} options.planType - Plan type (default: trial)
   * @param {string} options.paymentMethod - Payment method (default: offline)
   * @param {boolean} options.initialPaid - Whether initial payment is made (default: false)
   * @param {Object} options.paymentDetails - Payment details (optional)
   * @returns {Object} Default subscription configuration
   */
  getDefaultSubscription(options = {}) {
    const {
      planType = 'trial',
      paymentMethod = 'offline',
      initialPaid = false,
      paymentDetails = null
    } = options;

    const startDate = new Date();
    
    return {
      planType,
      startDate,
      endDate: this.calculateEndDate(planType, startDate),
      paymentMethod,
      initialPaid,
      paymentDetails
    };
  },

  /**
   * Validate subscription data
   * @param {Object} subscriptionData - Subscription data to validate
   * @returns {Object} Validation result with errors and sanitized data
   */
  validateSubscription(subscriptionData) {
    const result = {
      isValid: true,
      errors: [],
      sanitizedData: { ...subscriptionData }
    };
    
    // Validate plan type
    if (subscriptionData.planType) {
      if (!['trial', 'monthly', 'yearly'].includes(subscriptionData.planType.toLowerCase())) {
        result.isValid = false;
        result.errors.push('Invalid plan type. Must be "trial", "monthly", or "yearly"');
        // Set default plan type
        result.sanitizedData.planType = 'trial';
      }
    }
    
    // Validate payment method
    if (subscriptionData.paymentMethod) {
      if (!['offline', 'online', 'evc', 'bank'].includes(subscriptionData.paymentMethod.toLowerCase())) {
        result.isValid = false;
        result.errors.push('Invalid payment method. Must be "offline", "online", "evc", or "bank"');
        // Set default payment method
        result.sanitizedData.paymentMethod = 'offline';
      }
    }
    
    // Validate payment details if initialPaid is true
    if (subscriptionData.initialPaid === true && !subscriptionData.paymentDetails) {
      result.isValid = false;
      result.errors.push('Payment details required when initialPaid is true');
    }
    
    return result;
  },

  /**
   * Check if a subscription is active
   * @param {Object} subscription - Subscription object
   * @returns {boolean} Whether subscription is active
   */
  isActive(subscription) {
    if (!subscription || !subscription.endDate) {
      return false;
    }
    
    const now = new Date();
    const endDate = new Date(subscription.endDate);
    
    return endDate > now;
  },

  /**
   * Get days remaining in subscription
   * @param {Object} subscription - Subscription object
   * @returns {number} Days remaining (0 if expired)
   */
  getDaysRemaining(subscription) {
    if (!subscription || !subscription.endDate) {
      return 0;
    }
    
    const now = new Date();
    const endDate = new Date(subscription.endDate);
    
    if (endDate <= now) {
      return 0;
    }
    
    const diffTime = Math.abs(endDate - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  },

  /**
   * Validate a subscription change
   * @param {Object} currentSubscription - Current subscription
   * @param {Object} newSubscription - Proposed new subscription
   * @returns {Object} Validation result
   */
  validateSubscriptionChange(currentSubscription, newSubscription) {
    const result = {
      isValid: true,
      errors: [],
      allowedChanges: {}
    };
    
    // Check which fields can be changed
    if (newSubscription.planType && newSubscription.planType !== currentSubscription.planType) {
      // Allow plan type change
      result.allowedChanges.planType = newSubscription.planType;
      
      // Recalculate end date based on new plan type
      const remainingDays = this.getDaysRemaining(currentSubscription);
      if (remainingDays > 0) {
        // Prorate remaining days
        let additionalDays = 0;
        
        if (currentSubscription.planType === 'monthly' && newSubscription.planType === 'yearly') {
          // Monthly to yearly upgrade - give bonus days
          additionalDays = 30; // One month bonus
        }
        
        const newEndDate = new Date();
        newEndDate.setDate(newEndDate.getDate() + remainingDays + additionalDays);
        result.allowedChanges.endDate = newEndDate;
      } else {
        // Simply calculate new end date from now
        result.allowedChanges.endDate = this.calculateEndDate(newSubscription.planType);
      }
    }
    
    // Allow payment method change
    if (newSubscription.paymentMethod && newSubscription.paymentMethod !== currentSubscription.paymentMethod) {
      result.allowedChanges.paymentMethod = newSubscription.paymentMethod;
    }
    
    // Allow payment details change
    if (newSubscription.paymentDetails) {
      result.allowedChanges.paymentDetails = newSubscription.paymentDetails;
    }
    
    // Allow initialPaid change
    if (newSubscription.initialPaid !== undefined && newSubscription.initialPaid !== currentSubscription.initialPaid) {
      result.allowedChanges.initialPaid = newSubscription.initialPaid;
    }
    
    return result;
  }
};

module.exports = SubscriptionHelper;
