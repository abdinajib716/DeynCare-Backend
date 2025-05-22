/**
 * User Service
 * 
 * This service has been refactored into a modular structure for better maintainability.
 * Each operation is now in its own file under the src/services/user/ directory.
 * 
 * This file re-exports all services for backward compatibility while providing
 * the benefits of a more modular codebase.
 */

// Re-export all user services from the modular structure
const UserService = require('./user');

// Import the dedicated populateShopNames function to resolve circular dependency issues
const populateShopNames = require('./populateShopNames');

// Explicitly add the populateShopNames function to the UserService object
UserService.populateShopNames = populateShopNames;

// For debugging purposes - display all exported functions
console.log('UserService exports:', Object.keys(UserService));

// Export the service
module.exports = UserService;