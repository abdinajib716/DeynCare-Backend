const express = require('express');
const router = express.Router();
const ShopController = require('../controllers/shopController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/shops
 * @desc    Create a new shop
 * @access  Private (superAdmin, admin)
 */
router.post(
  '/',
  authenticate,
  authorize(['superAdmin', 'admin']),
  ShopController.createShop
);

/**
 * @route   GET /api/shops
 * @desc    Get all shops with pagination and filtering
 * @access  Private (superAdmin)
 */
router.get(
  '/',
  authenticate,
  authorize(['superAdmin']),
  ShopController.getShops
);

/**
 * @route   GET /api/shops/:shopId
 * @desc    Get shop by ID
 * @access  Private (superAdmin, admin if shop matches their shopId)
 */
router.get(
  '/:shopId',
  authenticate,
  // Note: Shop-specific authorization is handled in controller
  ShopController.getShopById
);

/**
 * @route   PUT /api/shops/:shopId
 * @desc    Update shop information
 * @access  Private (superAdmin, admin if shop matches their shopId)
 */
router.put(
  '/:shopId',
  authenticate,
  // Note: Shop-specific authorization is handled in controller
  ShopController.updateShop
);

/**
 * @route   PUT /api/shops/:shopId/logo
 * @desc    Upload shop logo
 * @access  Private (superAdmin, admin if shop matches their shopId)
 */
router.put(
  '/:shopId/logo',
  authenticate,
  // Note: Shop-specific authorization is handled in controller
  ShopController.uploadShopLogo
);

/**
 * @route   PUT /api/shops/:shopId/verify
 * @desc    Approve or reject shop registration
 * @access  Private (superAdmin)
 */
router.put(
  '/:shopId/verify',
  authenticate,
  authorize(['superAdmin']),
  ShopController.verifyShop
);

/**
 * @route   PUT /api/shops/:shopId/status
 * @desc    Suspend or reactivate shop
 * @access  Private (superAdmin)
 */
router.put(
  '/:shopId/status',
  authenticate,
  authorize(['superAdmin']),
  ShopController.changeShopStatus
);

/**
 * @route   PUT /api/shops/:shopId/payment
 * @desc    Verify shop payment
 * @access  Private (superAdmin)
 */
router.put(
  '/:shopId/payment',
  authenticate,
  authorize(['superAdmin']),
  ShopController.verifyPayment
);

/**
 * @route   DELETE /api/shops/:shopId
 * @desc    Delete shop (soft delete)
 * @access  Private (superAdmin)
 */
router.delete(
  '/:shopId',
  authenticate,
  authorize(['superAdmin']),
  ShopController.deleteShop
);

module.exports = router;
