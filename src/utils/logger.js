/**
 * Console logger with color-coded outputs, emoji indicators, and timestamps
 * Makes server logs beautiful, searchable, and readable
 */

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Text colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Background colors (uncomment if needed)
  // bgBlack: '\x1b[40m',
  // bgRed: '\x1b[41m',
  // bgGreen: '\x1b[42m',
  // bgYellow: '\x1b[43m',
  // bgBlue: '\x1b[44m',
  // bgMagenta: '\x1b[45m',
  // bgCyan: '\x1b[46m',
  // bgWhite: '\x1b[47m'
};

// Logger configuration
const config = {
  // Log types with associated emoji and color
  logTypes: {
    info: { emoji: 'ℹ️', color: colors.blue },
    success: { emoji: '🟢', color: colors.green },
    warning: { emoji: '🟡', color: colors.yellow },
    error: { emoji: '🔴', color: colors.red },
    debug: { emoji: '🔍', color: colors.magenta },
    auth: { emoji: '🔒', color: colors.cyan },
    database: { emoji: '🗄️', color: colors.cyan },
    api: { emoji: '🌐', color: colors.blue },
    performance: { emoji: '⚡', color: colors.yellow },
    session: { emoji: '👤', color: colors.magenta },
    validation: { emoji: '✅', color: colors.green }
  },
  
  // Get the current time in a readable format
  // @returns {string} - Formatted timestamp [HH:MM:SS]
  getTimestamp() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    return `[${hours}:${minutes}:${seconds}]`;
  },
  
  // Format a string with colors and styling
  // @param {string} str - String to format
  // @param {string} color - Color to apply
  // @param {boolean} bold - Whether to make the text bold
  // @returns {string} - Formatted string
  formatString(str, color, bold = false) {
    if (process.env.NODE_ENV === 'test') {
      return str; // No color in test environment
    }
    
    return bold 
      ? `${color}${colors.bright}${str}${colors.reset}`
      : `${color}${str}${colors.reset}`;
  },
  
  // Base log function
  // @param {string} message - Message to log
  // @param {string} type - Type of log (info, success, error, etc.)
  // @param {string} location - Where the log originated from
  // @param {Object} data - Additional data to log
  log(message, type = 'info', location = '', data = null) {
    // Skip logs in test environment unless they're errors
    if (process.env.NODE_ENV === 'test' && type !== 'error') {
      return;
    }
    
    // Skip debug logs in production unless DEBUG=true is set
    if (type === 'debug' && process.env.NODE_ENV === 'production' && process.env.DEBUG !== 'true') {
      return;
    }
    
    const logConfig = this.logTypes[type] || this.logTypes.info;
    const timestamp = this.formatString(this.getTimestamp(), colors.dim);
    const emoji = logConfig.emoji;
    const typeFormatted = this.formatString(type.toUpperCase(), logConfig.color, true);
    
    // Add location if provided
    const locationStr = location 
      ? this.formatString(`[${location}]`, colors.cyan) + ' '
      : '';
    
    // Log the message
    console.log(`${timestamp} ${emoji} ${typeFormatted} ${locationStr}${message}`);
    
    // Log additional data if provided
    if (data) {
      if (data instanceof Error) {
        console.log(this.formatString('ERROR DETAILS:', colors.red));
        console.log(data);
        if (data.stack) {
          console.log(this.formatString('STACK TRACE:', colors.red));
          console.log(data.stack);
        }
      } else {
        console.log(this.formatString('ADDITIONAL DATA:', colors.dim));
        console.log(data);
      }
    }
  }
};

// Bind the log function to the config object
const log = config.log.bind(config);

// Export specific log types
const logInfo = (message, location = '', data = null) => log('info', message, location, data);
const logSuccess = (message, location = '', data = null) => log('success', message, location, data);
const logWarning = (message, location = '', data = null) => log('warning', message, location, data);
const logError = (message, location = '', data = null) => log('error', message, location, data);
const logDebug = (message, location = '', data = null) => log('debug', message, location, data);
const logAuth = (message, location = '', data = null) => log('auth', message, location, data);
const logDatabase = (message, location = '', data = null) => log('database', message, location, data);
const logApi = (message, location = '', data = null) => log('api', message, location, data);
const logPerformance = (message, location = '', data = null) => log('performance', message, location, data);
const logSession = (message, location = '', data = null) => log('session', message, location, data);
const logValidation = (message, location = '', data = null) => log('validation', message, location, data);

/**
 * Performance timer for tracking execution time
 */
const timer = {
  /**
   * Start a performance timer
   * @param {string} label - Timer label
   * @returns {Function} - Function to stop the timer
   */
  start(label) {
    const startTime = process.hrtime();
    
    return () => {
      const diff = process.hrtime(startTime);
      const time = diff[0] * 1000 + diff[1] / 1000000; // Convert to milliseconds
      
      logPerformance(
        `${label}: ${time.toFixed(2)}ms`,
        'Timer'
      );
      
      return time;
    };
  }
};

// Export the module
module.exports = {
  log,
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
  timer,
  colors
};
