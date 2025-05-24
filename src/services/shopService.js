/**
 * Shop Service
 * 
 * This module serves as the main entry point for shop-related operations.
 * Each operation has been refactored into its own file in the shop/ directory
 * for better code organization, maintainability, and testing.
 */

// Import all operations from the shop/ directory
const {
  createShop,
  getShopById,
  updateShop,
  uploadShopLogo,
  verifyPayment,
  deleteShop
} = require('./shop');

// Re-export all shop service functions
const ShopService = {
  createShop,
  getShopById,
  updateShop,
  uploadShopLogo,
  verifyPayment,
  deleteShop
};

module.exports = ShopService;