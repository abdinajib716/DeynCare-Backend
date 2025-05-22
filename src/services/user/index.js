/**
 * User Service
 * 
 * This module aggregates all user-related services for easier import and better organization.
 * Each operation is now in its own file for improved maintainability, testing, and readability.
 */

// Import individual service files
const createUser = require('./createUser');
const getUserById = require('./getUserById');
const getUserByEmail = require('./getUserByEmail');
const updateUser = require('./updateUser');
const deleteUser = require('./deleteUser');
const listUsersByShop = require('./listUsersByShop');
const sanitizeUserForResponse = require('./sanitizeUserForResponse');
// Import the function directly without destructuring
const populateShopNames = require('./populateShopNames');

// Export all services as a unified object
module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser,
  listUsersByShop,
  sanitizeUserForResponse,
  populateShopNames
};
