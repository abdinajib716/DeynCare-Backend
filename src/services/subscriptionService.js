/**
 * Subscription Service
 * Handles all business logic related to subscriptions
 */
const mongoose = require('mongoose');
const { Subscription, Shop } = require('../models');
const { 
  AppError, 
  generateId,
  logInfo, 
  logError,
  logSuccess 
} = require('../utils');

/**
 * SubscriptionService provides methods for managing subscription lifecycle
 */
const SubscriptionService = {
  /**
   * Create a new subscription
   * @param {Object} subscriptionData - Subscription details
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Created subscription
   */
  createSubscription: async (subscriptionData, options = {}) => {
    try {
      const { shopId } = subscriptionData;
      
      // Validate shop existence
      const shop = await Shop.findOne({ shopId, isDeleted: false });
      if (!shop) {
        throw new AppError('Shop not found', 404, 'shop_not_found');
      }
      
      // Set defaults if not provided
      const subscriptionId = subscriptionData.subscriptionId || generateId('sub');
      const planType = subscriptionData.planType || 'trial';
      
      // Create subscription document
      const subscription = new Subscription({
        subscriptionId,
        shopId,
        plan: {
          name: 'standard',
          type: planType
        },
        status: planType === 'trial' ? 'trial' : 'active',
        history: [{
          action: planType === 'trial' ? 'trial_started' : 'created',
          date: new Date(),
          performedBy: options.actorId || 'system',
          details: {
            createdBy: options.actorId || 'system',
            actorRole: options.actorRole || 'system'
          }
        }]
      });
      
      // Save subscription
      const savedSubscription = await subscription.save();
      logSuccess(`Created subscription: ${subscriptionId} for shop: ${shopId}`, 'SubscriptionService');
      
      return savedSubscription;
    } catch (error) {
      logError('Failed to create subscription', 'SubscriptionService', error);
      throw error;
    }
  },
  
  /**
   * Get subscription by ID
   * @param {string} subscriptionId - ID of the subscription
   * @returns {Promise<Object>} Found subscription
   */
  getSubscriptionById: async (subscriptionId) => {
    try {
      const subscription = await Subscription.findOne({ 
        subscriptionId, 
        isDeleted: false 
      });
      
      if (!subscription) {
        throw new AppError('Subscription not found', 404, 'subscription_not_found');
      }
      
      return subscription;
    } catch (error) {
      logError(`Failed to get subscription: ${subscriptionId}`, 'SubscriptionService', error);
      throw error;
    }
  },
  
  /**
   * Get active subscription for a shop
   * @param {string} shopId - ID of the shop
   * @returns {Promise<Object>} Active subscription
   */
  getActiveSubscription: async (shopId) => {
    try {
      const activeSubscription = await Subscription.findOne({
        shopId,
        isDeleted: false,
        status: { $nin: ['canceled', 'expired'] },
        'dates.endDate': { $gt: new Date() }
      });
      
      if (!activeSubscription) {
        throw new AppError('No active subscription found', 404, 'no_active_subscription');
      }
      
      return activeSubscription;
    } catch (error) {
      logError(`Failed to get active subscription for shop: ${shopId}`, 'SubscriptionService', error);
      throw error;
    }
  },
  
  /**
   * Get subscription history for a shop
   * @param {string} shopId - ID of the shop
   * @returns {Promise<Array>} Subscription history
   */
  getSubscriptionHistory: async (shopId) => {
    try {
      const subscriptions = await Subscription.find({
        shopId,
        isDeleted: false
      }).sort({ 'dates.startDate': -1 });
      
      return subscriptions;
    } catch (error) {
      logError(`Failed to get subscription history for shop: ${shopId}`, 'SubscriptionService', error);
      throw error;
    }
  },
  
  /**
   * Upgrade subscription from trial to paid plan
   * @param {string} subscriptionId - ID of the subscription
   * @param {Object} upgradeData - Upgrade details
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Updated subscription
   */
  upgradeFromTrial: async (subscriptionId, upgradeData, options = {}) => {
    try {
      const subscription = await SubscriptionService.getSubscriptionById(subscriptionId);
      
      if (!subscription.isInTrial()) {
        throw new AppError('Subscription is not in trial period', 400, 'not_trial_subscription');
      }
      
      // Convert trial to paid plan
      const updatedSubscription = await subscription.convertTrialToPaid({
        planType: upgradeData.planType,
        paymentMethod: upgradeData.paymentMethod,
        paymentDetails: upgradeData.paymentDetails,
        performedBy: options.actorId || 'system'
      });
      
      logSuccess(`Upgraded subscription ${subscriptionId} from trial to ${upgradeData.planType}`, 'SubscriptionService');
      
      return updatedSubscription;
    } catch (error) {
      logError(`Failed to upgrade subscription: ${subscriptionId}`, 'SubscriptionService', error);
      throw error;
    }
  },
  
  /**
   * Change subscription plan
   * @param {string} subscriptionId - ID of the subscription
   * @param {Object} changeData - Plan change details
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Updated subscription
   */
  changePlan: async (subscriptionId, changeData, options = {}) => {
    try {
      const subscription = await SubscriptionService.getSubscriptionById(subscriptionId);
      
      if (!subscription.isActive()) {
        throw new AppError('Cannot change plan on inactive subscription', 400, 'inactive_subscription');
      }
      
      // Change the plan
      const updatedSubscription = await subscription.changePlan({
        newPlanType: changeData.newPlanType,
        prorated: changeData.prorated !== false, // default to true
        performedBy: options.actorId || 'system'
      });
      
      logSuccess(`Changed subscription ${subscriptionId} plan to ${changeData.newPlanType}`, 'SubscriptionService');
      
      return updatedSubscription;
    } catch (error) {
      logError(`Failed to change subscription plan: ${subscriptionId}`, 'SubscriptionService', error);
      throw error;
    }
  },
  
  /**
   * Record payment for subscription
   * @param {string} subscriptionId - ID of the subscription
   * @param {Object} paymentData - Payment details
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Updated subscription
   */
  recordPayment: async (subscriptionId, paymentData, options = {}) => {
    try {
      const subscription = await SubscriptionService.getSubscriptionById(subscriptionId);
      
      // Record the payment
      const updatedSubscription = await subscription.recordPayment({
        transactionId: paymentData.transactionId,
        method: paymentData.method,
        amount: paymentData.amount,
        receiptUrl: paymentData.receiptUrl,
        extend: paymentData.extend !== false, // default to true
        performedBy: options.actorId || 'system'
      });
      
      logSuccess(`Recorded payment for subscription ${subscriptionId}`, 'SubscriptionService');
      
      return updatedSubscription;
    } catch (error) {
      logError(`Failed to record payment: ${subscriptionId}`, 'SubscriptionService', error);
      throw error;
    }
  },
  
  /**
   * Cancel a subscription
   * @param {string} subscriptionId - ID of the subscription
   * @param {Object} cancellationData - Cancellation details
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Updated subscription
   */
  cancelSubscription: async (subscriptionId, cancellationData, options = {}) => {
    try {
      const subscription = await SubscriptionService.getSubscriptionById(subscriptionId);
      
      if (subscription.status === 'canceled') {
        throw new AppError('Subscription is already canceled', 400, 'already_canceled');
      }
      
      // Cancel the subscription
      const updatedSubscription = await subscription.cancel({
        reason: cancellationData.reason,
        feedback: cancellationData.feedback,
        immediateEffect: cancellationData.immediateEffect,
        performedBy: options.actorId || 'system'
      });
      
      logSuccess(`Canceled subscription ${subscriptionId}`, 'SubscriptionService');
      
      return updatedSubscription;
    } catch (error) {
      logError(`Failed to cancel subscription: ${subscriptionId}`, 'SubscriptionService', error);
      throw error;
    }
  },
  
  /**
   * Extend a subscription
   * @param {string} subscriptionId - ID of the subscription
   * @param {Object} extensionData - Extension details
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Updated subscription
   */
  extendSubscription: async (subscriptionId, extensionData, options = {}) => {
    try {
      const subscription = await SubscriptionService.getSubscriptionById(subscriptionId);
      
      // Extend the subscription
      const updatedSubscription = await subscription.extend({
        days: extensionData.days,
        reason: extensionData.reason,
        performedBy: options.actorId || 'system'
      });
      
      logSuccess(`Extended subscription ${subscriptionId} by ${extensionData.days} days`, 'SubscriptionService');
      
      return updatedSubscription;
    } catch (error) {
      logError(`Failed to extend subscription: ${subscriptionId}`, 'SubscriptionService', error);
      throw error;
    }
  },
  
  /**
   * Get expired active subscriptions that are still active
   * @returns {Promise<Array>} Array of expired active subscriptions
   */
  async getExpiredActiveSubscriptions() {
    try {
      const currentDate = new Date();
      
      // Find subscriptions that have:
      // 1. Status of 'active'
      // 2. End date that has passed
      // 3. Auto-renewal disabled (if it's enabled, the renewal job should handle it)
      const expiredSubscriptions = await Subscription.find({
        status: 'active',
        endDate: { $lt: currentDate },
        autoRenew: false
      }).populate('shopId', 'name owner email');
      
      logInfo(`Found ${expiredSubscriptions.length} expired active subscriptions`, 'SubscriptionService');
      return expiredSubscriptions;
    } catch (error) {
      logError('Failed to retrieve expired active subscriptions', 'SubscriptionService', error);
      throw error;
    }
  },
  
  /**
   * Deactivate an expired subscription
   * @param {string} subscriptionId - ID of the subscription to deactivate
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Updated subscription
   */
  async deactivateExpiredSubscription(subscriptionId, options = {}) {
    try {
      // Find the subscription
      const subscription = await Subscription.findById(subscriptionId);
      
      if (!subscription) {
        throw new AppError('Subscription not found', 404, 'subscription_not_found');
      }
      
      // Check if the subscription is already expired/canceled
      if (subscription.status !== 'active') {
        logInfo(`Subscription ${subscriptionId} is already ${subscription.status}`, 'SubscriptionService');
        return subscription;
      }
      
      // Update subscription status
      subscription.status = 'expired';
      
      // Add to history
      subscription.history.push({
        action: 'expired',
        date: new Date(),
        performedBy: options.actorId || 'system',
        details: {
          reason: options.reason || 'Subscription period ended'
        }
      });
      
      // Calculate data retention period (configurable via env variable)
      const dataRetentionDays = process.env.DATA_RETENTION_DAYS || 30;
      const dataRetentionDate = new Date();
      dataRetentionDate.setDate(dataRetentionDate.getDate() + parseInt(dataRetentionDays));
      
      subscription.dataRetentionDate = dataRetentionDate;
      
      // Save changes
      await subscription.save();
      
      // Log activity for audit trail
      logSuccess(`Subscription ${subscriptionId} deactivated due to expiration. Data retention until: ${dataRetentionDate.toISOString().split('T')[0]}`, 'SubscriptionService');
      
      return subscription;
    } catch (error) {
      logError(`Failed to deactivate expired subscription: ${subscriptionId}`, 'SubscriptionService', error);
      throw error;
    }
  },
  
  /**
   * Get subscriptions expiring soon but still active
   * @param {number} days - Number of days to look ahead
   * @returns {Promise<Array>} Array of soon-to-expire subscriptions
   */
  async getExpiringSubscriptions(days = 5) {
    try {
      const currentDate = new Date();
      const futureDate = new Date();
      futureDate.setDate(currentDate.getDate() + days);
      
      // Find subscriptions that:
      // 1. Are still active
      // 2. Have end dates between now and the future date
      // 3. Haven't had a reminder sent yet (or consider a frequency check)
      const expiringSubscriptions = await Subscription.find({
        status: 'active',
        endDate: { $gte: currentDate, $lte: futureDate },
        reminderSent: { $ne: true }
      }).populate('shopId', 'name owner email');
      
      logInfo(`Found ${expiringSubscriptions.length} subscriptions expiring in the next ${days} days`, 'SubscriptionService');
      return expiringSubscriptions;
    } catch (error) {
      logError(`Failed to retrieve expiring subscriptions`, 'SubscriptionService', error);
      throw error;
    }
  },
  
  /**
   * Get trials ending soon
   * @param {number} days - Number of days to look ahead
   * @returns {Promise<Array>} Array of ending trial subscriptions
   */
  async getTrialsEndingSoon(days = 2) {
    try {
      const currentDate = new Date();
      const futureDate = new Date();
      futureDate.setDate(currentDate.getDate() + days);
      
      // Find subscriptions that:
      // 1. Are on trial plan
      // 2. Are still active
      // 3. Have end dates between now and the future date
      // 4. Haven't had a reminder sent yet
      const endingTrials = await Subscription.find({
        planType: 'trial',
        status: 'active',
        endDate: { $gte: currentDate, $lte: futureDate },
        reminderSent: { $ne: true }
      }).populate('shopId', 'name owner email');
      
      logInfo(`Found ${endingTrials.length} trials ending in the next ${days} days`, 'SubscriptionService');
      return endingTrials;
    } catch (error) {
      logError(`Failed to retrieve ending trials`, 'SubscriptionService', error);
      throw error;
    }
  },
  
  /**
   * Get subscriptions ready for auto-renewal
   * @param {number} days - Number of days to look ahead
   * @returns {Promise<Array>} Array of subscriptions ready for renewal
   */
  async getSubscriptionsForRenewal(days = 3) {
    try {
      const currentDate = new Date();
      const futureDate = new Date();
      futureDate.setDate(currentDate.getDate() + days);
      
      // Find subscriptions that:
      // 1. Are not on trial
      // 2. Are active
      // 3. Have auto-renewal enabled
      // 4. Expire between now and the future date
      const renewalSubscriptions = await Subscription.find({
        planType: { $ne: 'trial' },
        status: 'active',
        autoRenew: true,
        endDate: { $gte: currentDate, $lte: futureDate }
      }).populate('shopId', 'name owner email');
      
      logInfo(`Found ${renewalSubscriptions.length} subscriptions ready for renewal in the next ${days} days`, 'SubscriptionService');
      return renewalSubscriptions;
    } catch (error) {
      logError(`Failed to retrieve subscriptions for renewal`, 'SubscriptionService', error);
      throw error;
    }
  },
  
  /**
   * Get all subscriptions with filtering and pagination
   * @param {Object} filter - Filter criteria
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object>} Paginated results
   */
  async getAllSubscriptions(filter = {}, options = {}) {
    try {
      // Default options
      const defaultOptions = {
        page: 1,
        limit: 10,
        sort: { createdAt: -1 }
      };
      
      // Merge with provided options
      const mergedOptions = { ...defaultOptions, ...options };
      
      // Add isDeleted filter (don't show deleted subscriptions by default)
      const mergedFilter = { 
        ...filter,
        isDeleted: filter.isDeleted !== undefined ? filter.isDeleted : false
      };
      
      // Get paginated results
      // Note: This implementation uses mongoose-paginate-v2 which should be added to the Subscription model
      // If that plugin isn't available, we can use manual pagination with skip/limit
      const subscriptions = await Subscription.paginate(mergedFilter, mergedOptions);
      
      logInfo(`Retrieved ${subscriptions.docs.length} subscriptions (page ${subscriptions.page} of ${subscriptions.totalPages})`, 'SubscriptionService');
      return subscriptions;
    } catch (error) {
      logError('Failed to retrieve subscriptions', 'SubscriptionService', error);
      throw error;
    }
  }
};

module.exports = SubscriptionService;
