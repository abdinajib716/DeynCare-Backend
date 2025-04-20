/**
 * Bootstrap script for DeynCare Backend
 * This script runs on server startup to perform initialization tasks like:
 * - Checking for and creating a super-admin user if needed
 * - Initializing default settings
 * - Running database migrations
 */

const { logInfo, logSuccess, logError, logWarning } = require('../utils/logger');
const { createSuperAdmin } = require('../scripts/createSuperAdmin');
const { SettingsHelper } = require('../utils');

/**
 * Main bootstrap function
 * @param {Object} options - Bootstrap options
 */
const bootstrap = async (options = {}) => {
  try {
    logInfo('Starting DeynCare bootstrap process...', 'Bootstrap');
    
    // Check and create super-admin if environment variable is set
    if (process.env.CREATE_SUPER_ADMIN === 'true') {
      logInfo('Super-admin creation requested via environment variable', 'Bootstrap');
      await createSuperAdmin();
    }
    
    // Initialize system settings including payment methods
    logInfo('Initializing system settings...', 'Bootstrap');
    await SettingsHelper.initializeSystemSettings();
    logSuccess('System settings initialized successfully', 'Bootstrap');
    
    // Add other initialization tasks here as the application grows
    
    logSuccess('Bootstrap process completed successfully', 'Bootstrap');
    return true;
  } catch (error) {
    logError(`Bootstrap process failed: ${error.message}`, 'Bootstrap', error);
    
    // Determine if this is a critical failure
    if (options.exitOnError) {
      process.exit(1);
    }
    
    return false;
  }
};

module.exports = { bootstrap };
