/**
 * Settings Routes
 * Handles routes related to system settings
 */
const express = require('express');
const settingsController = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Settings Routes
 * Base path: /api/settings
 */

// Public route to get available payment methods
// This can be accessed without authentication for registration
router.get('/payment-methods', settingsController.getPaymentMethods);

// Admin-only routes to manage settings
router.get('/', authenticate, authorize(['admin', 'superAdmin']), settingsController.getSettings);

module.exports = router;
