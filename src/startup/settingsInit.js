/**
 * Settings Initialization
 * Initialize system settings on application startup
 */
const { logInfo, logSuccess, logError, SettingsHelper } = require('../utils');

/**
 * Initialize all system settings
 */
const initializeSettings = async () => {
  try {
    logInfo('Starting system settings initialization...', 'SettingsInit');
    
    // Initialize base system settings including payment method options
    await SettingsHelper.initializeSystemSettings();
    
    logSuccess('System settings initialization complete', 'SettingsInit');
  } catch (error) {
    logError(`Failed to initialize system settings: ${error.message}`, 'SettingsInit', error);
    // Don't throw the error as we want app to still start even if settings init fails
  }
};

module.exports = {
  initializeSettings
};
