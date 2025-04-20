/**
 * Settings Controller
 * Handles HTTP requests related to system settings
 */
const { Setting } = require('../models');
const { AppError, SettingsHelper, ResponseHelper, logError, logSuccess } = require('../utils');

/**
 * SettingsController handles settings-related HTTP requests
 */
const SettingsController = {
  /**
   * Get all available payment methods
   * GET /api/settings/payment-methods
   */
  getPaymentMethods: async (req, res, next) => {
    try {
      // Get context if provided (default to general)
      const { context = 'general' } = req.query;
      
      // Get methods based on context and settings
      let paymentMethods = [];
      let isOnlineEnabled = true;
      let isOfflineEnabled = true;
      
      // Get global switches
      const onlineSetting = await Setting.findOne({
        key: 'enable_online_payment',
        shopId: null
      });
      
      const offlineSetting = await Setting.findOne({
        key: 'enable_offline_payment',
        shopId: null
      });
      
      if (onlineSetting) {
        isOnlineEnabled = onlineSetting.value;
      }
      
      if (offlineSetting) {
        isOfflineEnabled = offlineSetting.value;
      }
      
      // Get context-specific settings
      let settingKey = 'payment_methods_available';
      if (context === 'subscription') {
        settingKey = 'subscription_payment_methods';
      } else if (context === 'pos') {
        settingKey = 'pos_payment_methods';
      }
      
      // Get methods from settings
      const methodsSetting = await Setting.findOne({
        key: settingKey,
        shopId: null
      });
      
      if (methodsSetting) {
        // Filter methods based on global switches
        const methods = methodsSetting.value || [];
        
        paymentMethods = methods.filter(method => {
          const isOnlineMethod = ['EVC Plus', 'Card', 'Mobile Money'].includes(method);
          const isOfflineMethod = ['Cash', 'Bank Transfer', 'Check', 'Other', 'offline'].includes(method);
          
          return (isOnlineMethod && isOnlineEnabled) || 
                 (isOfflineMethod && isOfflineEnabled) || 
                 (!isOnlineMethod && !isOfflineMethod);
        });
      } else {
        // Default methods if no setting found
        const defaultMethods = ['Cash', 'EVC Plus', 'Bank Transfer', 'offline'];
        
        paymentMethods = defaultMethods.filter(method => {
          const isOnlineMethod = ['EVC Plus', 'Card', 'Mobile Money'].includes(method);
          const isOfflineMethod = ['Cash', 'Bank Transfer', 'Check', 'Other', 'offline'].includes(method);
          
          return (isOnlineMethod && isOnlineEnabled) || 
                 (isOfflineMethod && isOfflineEnabled) || 
                 (!isOnlineMethod && !isOfflineMethod);
        });
      }
      
      return res.status(200).json({
        success: true,
        data: {
          paymentMethods,
          onlinePaymentsEnabled: isOnlineEnabled,
          offlinePaymentsEnabled: isOfflineEnabled,
          context
        }
      });
    } catch (error) {
      logError(`Error getting payment methods: ${error.message}`, 'SettingsController', error);
      return next(error);
    }
  },
  
  /**
   * Get current system settings
   * GET /api/settings
   * Requires admin authentication
   */
  getSettings: async (req, res, next) => {
    try {
      // Get category from query
      const { category = 'all' } = req.query;
      
      let query = { shopId: null }; // Global settings only
      
      // Filter by category if provided
      if (category !== 'all') {
        query.category = category;
      }
      
      // Get settings (exclude sensitive data)
      const settings = await Setting.find(query).select('-history -__v');
      
      // Format settings for response
      const formattedSettings = settings.map(setting => ({
        key: setting.key,
        category: setting.category,
        displayName: setting.displayName,
        description: setting.description,
        value: setting.value,
        dataType: setting.dataType,
        isEditable: setting.isEditable,
        accessLevel: setting.accessLevel
      }));
      
      return res.status(200).json({
        success: true,
        data: formattedSettings
      });
    } catch (error) {
      logError(`Error getting settings: ${error.message}`, 'SettingsController', error);
      return next(error);
    }
  }
};

module.exports = SettingsController;
