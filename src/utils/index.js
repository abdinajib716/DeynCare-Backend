/**
 * Utilities Index
 * Centralizes all utility exports for cleaner imports throughout the application
 * 
 * Usage example:
 * import { AppError, ErrorHandler, ResponseHelper, TokenHelper } from '../utils';
 */

// Export error handling utilities
const AppError = require('./core/AppError');
const ErrorHandler = require('./core/errorHandler');
const ErrorResponse = require('./core/errorResponse');

// Export code and ID generation utilities
const { generateVerificationCode, generateToken, calculateExpiry } = require('./generators/generateCode');
const idGenerator = require('./generators/idGenerator');

// Export new helper utilities
const TokenHelper = require('./helpers/tokenHelper');
const ResponseHelper = require('./helpers/responseHelper');
const DebugHelper = require('./helpers/debugHelper');
const LogHelper = require('./helpers/logHelper');
const UserHelper = require('./helpers/userHelper');
const ShopHelper = require('./helpers/shopHelper');
const SubscriptionHelper = require('./helpers/subscriptionHelper');
const PaginationHelper = require('./helpers/paginationHelper');
const ValidationHelper = require('./helpers/validationHelper');
const SettingsHelper = require('./helpers/settingsHelper');

// Export logging utilities
const logger = require('./logger.js');
const { 
  logInfo, 
  logSuccess, 
  logWarning, 
  logError, 
  logDebug, 
  logAuth, 
  logDatabase, 
  logApi, 
  logPerformance,
  logSession,
  logValidation,
  timer
} = require('./logger.js');

/**
 * Error Handling Utilities
 */
module.exports.AppError = AppError;
module.exports.ErrorHandler = ErrorHandler;
module.exports.ErrorResponse = ErrorResponse;

/**
 * Code Generation Utilities
 */
module.exports.generateVerificationCode = generateVerificationCode;
module.exports.generateToken = generateToken;
module.exports.calculateExpiry = calculateExpiry;
module.exports.idGenerator = idGenerator;

/**
 * Helper Utilities
 */
module.exports.TokenHelper = TokenHelper;
module.exports.ResponseHelper = ResponseHelper;
module.exports.DebugHelper = DebugHelper;
module.exports.LogHelper = LogHelper;
module.exports.UserHelper = UserHelper;
module.exports.ShopHelper = ShopHelper;
module.exports.SubscriptionHelper = SubscriptionHelper;
module.exports.PaginationHelper = PaginationHelper;
module.exports.ValidationHelper = ValidationHelper;
module.exports.SettingsHelper = SettingsHelper;

/**
 * Logging Utilities
 */
module.exports.logger = logger;
module.exports.logInfo = logInfo;
module.exports.logSuccess = logSuccess;
module.exports.logWarning = logWarning;
module.exports.logError = logError;
module.exports.logDebug = logDebug;
module.exports.logAuth = logAuth;
module.exports.logDatabase = logDatabase;
module.exports.logApi = logApi;
module.exports.logPerformance = logPerformance;
module.exports.logSession = logSession;
module.exports.logValidation = logValidation;
module.exports.timer = timer;

/**
 * Simplified export for ES modules syntax
 */
module.exports = {
  // Error utilities
  AppError,
  ErrorHandler,
  ErrorResponse,
  
  // Code generation
  generateVerificationCode,
  generateToken,
  calculateExpiry,
  idGenerator,
  
  // Helper utilities
  TokenHelper,
  ResponseHelper,
  DebugHelper,
  LogHelper,
  UserHelper,
  ShopHelper,
  SubscriptionHelper,
  PaginationHelper,
  ValidationHelper,
  SettingsHelper,
  
  // Logging
  logger,
  logInfo,
  logSuccess,
  logWarning,
  logError,
  logDebug,
  logAuth,
  logDatabase,
  logApi,
  logPerformance,
  logSession,
  logValidation,
  timer
};
