/**
 * Shop Controller
 * 
 * This module aggregates all shop-related controllers for easier import and better organization.
 * Each operation is in its own file for improved maintainability, testing, and readability.
 */

// Import individual controller files
const createShop = require('./createShop');
const getShopById = require('./getShopById');
const getShops = require('./getShops');
const updateShop = require('./updateShop');
const uploadShopLogo = require('./uploadShopLogo');
const verifyPayment = require('./verifyPayment');
const deleteShop = require('./deleteShop');
const verifyShop = require('./verifyShop');
const changeShopStatus = require('./changeShopStatus');

// Export all controllers as a unified object
module.exports = {
  createShop,
  getShopById,
  getShops,
  updateShop,
  uploadShopLogo,
  verifyPayment,
  deleteShop,
  verifyShop,
  changeShopStatus
};
