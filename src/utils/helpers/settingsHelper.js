/**
 * Settings Helper
 * Provides utility functions for managing system settings
 */
const { Setting } = require('../../models');
const { logInfo, logError, logSuccess } = require('../logger');

/**
 * Default payment settings to initialize the system with
 */
const DEFAULT_PAYMENT_SETTINGS = [
  // Global payment method switches
  {
    key: 'enable_online_payment',
    category: 'payment',
    displayName: 'Enable Online Payments',
    description: 'Master switch for all API payment integrations',
    value: true,
    dataType: 'boolean',
    defaultValue: true,
    accessLevel: 'superAdmin',
    isEditable: true,
    isVisible: true,
    shopId: null, // Global setting
    updatedBy: 'system'
  },
  {
    key: 'enable_offline_payment',
    category: 'payment',
    displayName: 'Enable Offline Payments',
    description: 'Global toggle for bank/cash/manual uploads',
    value: true,
    dataType: 'boolean',
    defaultValue: true,
    accessLevel: 'superAdmin',
    isEditable: true,
    isVisible: true,
    shopId: null, // Global setting
    updatedBy: 'system'
  },
  {
    key: 'require_receipt_proof_offline',
    category: 'payment',
    displayName: 'Require Receipt for Offline Payments',
    description: 'Whether to require proof of payment for offline payment methods',
    value: true,
    dataType: 'boolean',
    defaultValue: true,
    accessLevel: 'admin',
    isEditable: true,
    isVisible: true,
    shopId: null, // Global setting
    updatedBy: 'system'
  },
  
  // Available payment methods
  {
    key: 'payment_methods_available',
    category: 'payment',
    displayName: 'Available Payment Methods',
    description: 'List of all payment methods available in the system',
    value: ['Cash', 'EVC Plus', 'Bank Transfer', 'Mobile Money', 'Check', 'Card', 'Other', 'offline'],
    dataType: 'array',
    defaultValue: ['Cash', 'EVC Plus', 'Bank Transfer', 'offline'],
    validation: {
      minItems: 1
    },
    accessLevel: 'superAdmin',
    isEditable: true,
    isVisible: true,
    shopId: null, // Global setting
    updatedBy: 'system'
  },
  
  // Specific payment methods for subscription payments
  {
    key: 'subscription_payment_methods',
    category: 'payment',
    displayName: 'Subscription Payment Methods',
    description: 'Payment methods available for subscription payments',
    value: ['Cash', 'EVC Plus', 'Bank Transfer', 'Mobile Money', 'offline'],
    dataType: 'array',
    defaultValue: ['Cash', 'EVC Plus', 'offline'],
    validation: {
      minItems: 1
    },
    accessLevel: 'admin',
    isEditable: true,
    isVisible: true,
    shopId: null, // Global setting
    updatedBy: 'system'
  }
];

/**
 * Helper functions for settings management
 */
const SettingsHelper = {
  /**
   * Initialize system settings
   * @returns {Promise<void>}
   */
  async initializeSystemSettings() {
    try {
      logInfo('Initializing system settings...', 'SettingsHelper');
      await this.ensurePaymentSettings();
      logSuccess('System settings initialized successfully', 'SettingsHelper');
    } catch (error) {
      logError(`Failed to initialize system settings: ${error.message}`, 'SettingsHelper', error);
    }
  },

  /**
   * Ensure payment settings are in the database
   * @returns {Promise<void>}
   */
  async ensurePaymentSettings() {
    try {
      const results = {
        created: 0,
        existing: 0
      };

      for (const setting of DEFAULT_PAYMENT_SETTINGS) {
        // Check if setting already exists
        const exists = await Setting.findOne({
          key: setting.key,
          shopId: setting.shopId
        });

        if (!exists) {
          // Create new setting
          await Setting.create(setting);
          results.created++;
          logInfo(`Created payment setting: ${setting.key}`, 'SettingsHelper');
        } else {
          results.existing++;
        }
      }

      logSuccess(`Payment settings check complete: ${results.created} created, ${results.existing} already exist`, 'SettingsHelper');
    } catch (error) {
      logError(`Failed to ensure payment settings: ${error.message}`, 'SettingsHelper', error);
      throw error;
    }
  },

  /**
   * Create shop-specific settings when a new shop is created
   * @param {string} shopId - ID of the shop
   * @param {string} updatedBy - ID of the user creating the settings
   * @returns {Promise<Object>} Result with counts
   */
  async createShopSettings(shopId, updatedBy = 'system') {
    if (!shopId) {
      throw new Error('Shop ID is required');
    }

    try {
      const shopSettings = [
        // Shop-specific available payment methods
        {
          key: `shop_payment_methods_${shopId}`, // Using a shop-specific key to avoid conflicts
          category: 'payment',
          displayName: 'Shop Payment Methods',
          description: 'Payment methods available for this shop',
          value: ['Cash', 'EVC Plus', 'Bank Transfer', 'Mobile Money', 'offline'],
          dataType: 'array',
          defaultValue: ['Cash', 'EVC Plus', 'offline'],
          accessLevel: 'admin',
          isEditable: true,
          isVisible: true,
          shopId,
          updatedBy
        }
      ];

      const results = {
        created: 0
      };

      for (const setting of shopSettings) {
        // Check if already exists
        const exists = await Setting.findOne({
          key: setting.key,
          shopId
        });

        if (!exists) {
          await Setting.create(setting);
          results.created++;
        }
      }

      logSuccess(`Created ${results.created} shop-specific settings for shop ${shopId}`, 'SettingsHelper');
      return results;
    } catch (error) {
      logError(`Failed to create shop settings for shop ${shopId}: ${error.message}`, 'SettingsHelper', error);
      throw error;
    }
  },

  /**
   * Get all payment methods allowed by the system
   * @returns {Promise<Array<string>>} Array of payment method names
   */
  async getAllowedPaymentMethods() {
    try {
      const setting = await Setting.findOne({
        key: 'payment_methods_available',
        shopId: null
      });

      return setting?.value || ['Cash', 'EVC Plus', 'Bank Transfer', 'offline'];
    } catch (error) {
      logError(`Failed to get allowed payment methods: ${error.message}`, 'SettingsHelper', error);
      return ['Cash', 'EVC Plus', 'Bank Transfer', 'offline'];
    }
  },

  /**
   * Check if a specific payment method is enabled
   * @param {string} methodName - Name of the payment method
   * @returns {Promise<boolean>} Whether the method is enabled
   */
  async isPaymentMethodEnabled(methodName) {
    try {
      // Check if method is in allowed methods
      const allowedMethods = await this.getAllowedPaymentMethods();
      if (!allowedMethods.includes(methodName)) {
        return false;
      }

      // Check global switch for online/offline
      const isOnlineMethod = ['EVC Plus', 'Card', 'Mobile Money'].includes(methodName);
      const isOfflineMethod = ['Cash', 'Bank Transfer', 'Check', 'Other', 'offline'].includes(methodName);

      if (isOnlineMethod) {
        const onlineSetting = await Setting.findOne({
          key: 'enable_online_payment',
          shopId: null
        });
        return onlineSetting?.value !== false; // Default to true if setting doesn't exist
      }

      if (isOfflineMethod) {
        const offlineSetting = await Setting.findOne({
          key: 'enable_offline_payment',
          shopId: null
        });
        return offlineSetting?.value !== false; // Default to true if setting doesn't exist
      }

      return true; // Default to enabled for unknown types
    } catch (error) {
      logError(`Failed to check if payment method is enabled: ${error.message}`, 'SettingsHelper', error);
      return true; // Default to enabled on error
    }
  }
};

module.exports = SettingsHelper;
