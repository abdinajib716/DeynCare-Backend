/**
 * Shop Controller
 * 
 * This module serves as the main entry point for shop-related controller operations.
 * Each operation has been refactored into its own file in the shop/ directory
 * for better code organization, maintainability, and testing.
 */

// Import all controllers from the shop/ directory
const {
  createShop,
  getShopById,
  getShops,
  updateShop,
  uploadShopLogo,
  verifyPayment,
  deleteShop,
  verifyShop,
  changeShopStatus
} = require('./shop');

// Re-export all shop controllers
const ShopController = {
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

module.exports = ShopController;
