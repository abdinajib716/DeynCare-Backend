/**
 * Settings Service
 * Provides utility functions for managing and retrieving system settings
 */
const { Setting } = require('../models');
const { AppError, logInfo, logError, logSuccess } = require('../utils');

/**
 * SettingsService handles retrieval and management of application settings
 */
const SettingsService = {
  /**
   * Get a setting value with fallback to default
   * @param {string} key - Setting key
   * @param {string|null} shopId - Shop ID for shop-specific settings (null for global)
   * @param {*} defaultValue - Default value if setting not found
   * @returns {Promise<*>} Setting value or default
   */
  getSetting: async (key, shopId = null, defaultValue = null) => {
    try {
      // First try shop-specific setting if shopId provided
      if (shopId) {
        const shopSetting = await Setting.findOne({ key, shopId });
        if (shopSetting) {
          return shopSetting.value;
        }
      }

      // Fall back to global setting
      const globalSetting = await Setting.findOne({ key, shopId: null });
      if (globalSetting) {
        return globalSetting.value;
      }

      // Return default if no setting found
      return defaultValue;
    } catch (error) {
      logError(`Failed to get setting ${key}: ${error.message}`, 'SettingsService', error);
      return defaultValue;
    }
  },

  /**
   * Get multiple settings at once 
   * @param {Array<string>} keys - Array of setting keys
   * @param {string|null} shopId - Shop ID for shop-specific settings
   * @returns {Promise<Object>} Object with setting keys and values
   */
  getMultipleSettings: async (keys, shopId = null) => {
    try {
      const result = {};

      // First get all global settings for the keys
      const globalSettings = await Setting.find({
        key: { $in: keys },
        shopId: null
      });

      // Add global settings to result
      for (const setting of globalSettings) {
        result[setting.key] = setting.value;
      }

      // If shopId provided, get shop-specific settings
      if (shopId) {
        const shopSettings = await Setting.find({
          key: { $in: keys },
          shopId
        });

        // Shop settings override global settings
        for (const setting of shopSettings) {
          result[setting.key] = setting.value;
        }
      }

      return result;
    } catch (error) {
      logError(`Failed to get multiple settings: ${error.message}`, 'SettingsService', error);
      return {};
    }
  },

  /**
   * Check if a payment method is enabled
   * @param {string} methodName - Payment method name
   * @param {string|null} shopId - Shop ID for shop-specific settings
   * @returns {Promise<boolean>} Whether the payment method is enabled
   */
  isPaymentMethodEnabled: async (methodName, shopId = null) => {
    try {
      // First check the global online/offline payment switch
      const isOnlineMethod = ['EVC Plus', 'Card', 'Mobile Money'].includes(methodName);
      const isOfflineMethod = ['Cash', 'Bank Transfer', 'Check', 'Other'].includes(methodName);
      
      if (isOnlineMethod) {
        const onlineEnabled = await SettingsService.getSetting('enable_online_payment', null, true);
        if (!onlineEnabled) return false;
      } else if (isOfflineMethod) {
        const offlineEnabled = await SettingsService.getSetting('enable_offline_payment', null, true);
        if (!offlineEnabled) return false;
      }

      // Then check if the method is in the available methods for the shop
      const availableMethods = await SettingsService.getSetting(
        'payment_methods_available',
        shopId,
        ['Cash', 'EVC Plus', 'Bank Transfer']
      );

      return availableMethods.includes(methodName);
    } catch (error) {
      logError(`Failed to check if payment method is enabled: ${error.message}`, 'SettingsService', error);
      // Default to enabling common payment methods if there's an error
      return ['Cash', 'EVC Plus', 'Bank Transfer'].includes(methodName);
    }
  },

  /**
   * Get available payment methods
   * @param {string} context - Context (subscription, pos, etc)
   * @param {string|null} shopId - Shop ID for shop-specific settings
   * @returns {Promise<Array<string>>} List of available payment methods
   */
  getAvailablePaymentMethods: async (context = 'general', shopId = null) => {
    try {
      // Get specific context setting first
      let settingKey = 'payment_methods_available';
      
      if (context === 'subscription') {
        settingKey = 'subscription_payment_methods';
      } else if (context === 'pos') {
        settingKey = 'pos_payment_methods';
      }

      // Get methods from settings
      const methods = await SettingsService.getSetting(
        settingKey,
        shopId,
        ['Cash', 'EVC Plus', 'Bank Transfer']
      );

      // Filter methods based on global switches
      const enabledMethods = [];
      
      // Get global switches
      const onlineEnabled = await SettingsService.getSetting('enable_online_payment', null, true);
      const offlineEnabled = await SettingsService.getSetting('enable_offline_payment', null, true);
      
      // Add methods if they're enabled based on type
      for (const method of methods) {
        const isOnlineMethod = ['EVC Plus', 'Card', 'Mobile Money'].includes(method);
        const isOfflineMethod = ['Cash', 'Bank Transfer', 'Check', 'Other'].includes(method);
        
        if ((isOnlineMethod && onlineEnabled) || (isOfflineMethod && offlineEnabled) || (!isOnlineMethod && !isOfflineMethod)) {
          enabledMethods.push(method);
        }
      }
      
      return enabledMethods;
    } catch (error) {
      logError(`Failed to get available payment methods: ${error.message}`, 'SettingsService', error);
      // Default to common payment methods if there's an error
      return ['Cash', 'EVC Plus', 'Bank Transfer'];
    }
  },

  /**
   * Update a setting value
   * @param {string} key - Setting key
   * @param {*} value - New value
   * @param {string} updatedBy - User ID who is updating the setting
   * @param {string|null} shopId - Shop ID for shop-specific settings
   * @param {string} reason - Reason for the update (for audit)
   * @returns {Promise<Object>} Updated setting
   */
  updateSetting: async (key, value, updatedBy, shopId = null, reason = '') => {
    try {
      let setting = await Setting.findOne({ key, shopId });
      
      if (!setting) {
        throw new AppError(`Setting ${key} not found`, 404);
      }
      
      // Update with reason for audit
      await setting.updateWithReason(value, updatedBy, reason);
      
      logSuccess(`Setting ${key} updated by ${updatedBy}`, 'SettingsService');
      return setting;
    } catch (error) {
      logError(`Failed to update setting ${key}: ${error.message}`, 'SettingsService', error);
      throw error;
    }
  },
  
  /**
   * Reset a setting to its default value
   * @param {string} key - Setting key
   * @param {string} updatedBy - User ID who is resetting the setting
   * @param {string|null} shopId - Shop ID for shop-specific settings
   * @returns {Promise<Object>} Reset setting
   */
  resetSetting: async (key, updatedBy, shopId = null) => {
    try {
      let setting = await Setting.findOne({ key, shopId });
      
      if (!setting) {
        throw new AppError(`Setting ${key} not found`, 404);
      }
      
      // Reset to default
      await setting.resetToDefault(updatedBy);
      
      logSuccess(`Setting ${key} reset to default by ${updatedBy}`, 'SettingsService');
      return setting;
    } catch (error) {
      logError(`Failed to reset setting ${key}: ${error.message}`, 'SettingsService', error);
      throw error;
    }
  }
};

module.exports = SettingsService;
