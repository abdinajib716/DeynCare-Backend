/**
 * Discount Routes
 * Defines API endpoints for discount code management
 */
const express = require('express');
const router = express.Router();

// Controllers
const DiscountController = require('../controllers/discountController');

// Middleware
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');

// Validation Schemas
const { discountSchemas } = require('../validations');

/**
 * @route   POST /api/discounts
 * @desc    Create a new discount code
 * @access  Private (Admin, SuperAdmin)
 */
router.post(
  '/',
  authenticate,
  authorize('admin', 'superAdmin'),
  validate(discountSchemas.create),
  DiscountController.createDiscount
);

/**
 * @route   GET /api/discounts
 * @desc    Get all discount codes with filtering and pagination
 * @access  Private (Admin, SuperAdmin)
 */
router.get(
  '/',
  authenticate,
  authorize('admin', 'superAdmin'),
  DiscountController.getDiscounts
);

/**
 * @route   GET /api/discounts/:discountId
 * @desc    Get a specific discount code by ID
 * @access  Private (Admin, SuperAdmin)
 */
router.get(
  '/:discountId',
  authenticate,
  authorize('admin', 'superAdmin'),
  DiscountController.getDiscountById
);

/**
 * @route   PUT /api/discounts/:discountId
 * @desc    Update a discount code
 * @access  Private (Admin, SuperAdmin)
 */
router.put(
  '/:discountId',
  authenticate,
  authorize('admin', 'superAdmin'),
  validate(discountSchemas.update),
  DiscountController.updateDiscount
);

/**
 * @route   DELETE /api/discounts/:discountId
 * @desc    Delete a discount code
 * @access  Private (Admin, SuperAdmin)
 */
router.delete(
  '/:discountId',
  authenticate,
  authorize('admin', 'superAdmin'),
  DiscountController.deleteDiscount
);

/**
 * @route   POST /api/discounts/validate
 * @desc    Validate a discount code
 * @access  Private (All authenticated users)
 */
router.post(
  '/validate',
  authenticate,
  validate(discountSchemas.validate),
  DiscountController.validateDiscount
);

/**
 * @route   POST /api/discounts/apply
 * @desc    Apply a discount code
 * @access  Private (All authenticated users)
 */
router.post(
  '/apply',
  authenticate,
  validate(discountSchemas.validate),
  DiscountController.applyDiscount
);

module.exports = router;
