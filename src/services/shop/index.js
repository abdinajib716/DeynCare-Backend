/**
 * Shop Service
 * 
 * This module aggregates all shop-related services for easier import and better organization.
 * Each operation is now in its own file for improved maintainability, testing, and readability.
 */

// Import individual service files
const createShop = require('./createShop');
const getShopById = require('./getShopById');
const updateShop = require('./updateShop');
const uploadShopLogo = require('./uploadShopLogo');
const verifyPayment = require('./verifyPayment');
const deleteShop = require('./deleteShop');

// Export all services as a unified object
module.exports = {
  createShop,
  getShopById,
  updateShop,
  uploadShopLogo,
  verifyPayment,
  deleteShop
};
