/**
 * Email Service - Main entry point
 * 
 * This module re-exports the modular email service components
 * from the email/ directory. It provides backwards compatibility
 * while allowing for a cleaner, more maintainable organization.
 * 
 * The implementation follows the DeynCare architecture pattern
 * with separation of concerns and modular design.
 */

// Import the modular email service
const EmailService = require('./email');

/**
 * Export the EmailService directly to maintain backward compatibility
 * with existing codebase that imports the service from this file.
 */
module.exports = EmailService;
