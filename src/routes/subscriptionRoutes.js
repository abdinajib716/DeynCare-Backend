/**
 * Subscription Routes
 * Handles all routes related to subscription management
 */
const express = require('express');
const subscriptionController = require('../controllers/subscriptionController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { subscriptionSchemas } = require('../validations');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

/**
 * Subscription Routes
 * Base path: /api/subscriptions
 */

// Require authentication for all subscription routes
router.use(authMiddleware.authenticate);

// Get current subscription (for authenticated user's shop)
router.get('/current', subscriptionController.getCurrentSubscription);

// Get subscription history
router.get('/history', subscriptionController.getSubscriptionHistory);

// Create a new subscription (usually initiated after trial)
router.post(
  '/', 
  validate(subscriptionSchemas.createSubscription),
  subscriptionController.createSubscription
);

// Upgrade subscription plan from trial
router.post(
  '/upgrade',
  validate(subscriptionSchemas.upgradeSubscription),
  subscriptionController.upgradeFromTrial
);

// Change subscription plan (between monthly/yearly)
router.post(
  '/change-plan',
  validate(subscriptionSchemas.createSubscription),
  subscriptionController.changePlan
);

// Cancel subscription
router.post(
  '/cancel',
  validate(subscriptionSchemas.cancelSubscription),
  subscriptionController.cancelSubscription
);

// Record payment for a subscription
router.post(
  '/payment',
  validate(subscriptionSchemas.recordPayment),
  subscriptionController.recordPayment
);

// Update auto-renewal settings
router.patch(
  '/auto-renewal',
  validate(subscriptionSchemas.updateAutoRenewal),
  subscriptionController.updateAutoRenewal
);

// Renew subscription
router.post(
  '/renew',
  validate(subscriptionSchemas.renewSubscription),
  subscriptionController.renewSubscription
);

// Pay subscription using EVC Plus
router.post(
  '/pay-evc',
  validate(subscriptionSchemas.payWithEvc),
  subscriptionController.payWithEvc
);

// Submit offline payment with proof
router.post(
  '/offline-payment',
  authMiddleware.authorize('shopOwner', 'admin'),
  upload.single('paymentProof'),
  validate(subscriptionSchemas.offlinePayment),
  subscriptionController.submitOfflinePayment
);

// Verify offline payment (Super Admin only)
router.post(
  '/verify-payment/:paymentId',
  authMiddleware.authorize('superAdmin'),
  validate(subscriptionSchemas.verifyOfflinePayment),
  subscriptionController.verifyOfflinePayment
);

// Get payment proof file
router.get(
  '/payment-proof/:fileId',
  authMiddleware.authorize('superAdmin', 'admin', 'shopOwner'),
  subscriptionController.getPaymentProofFile
);

// Get all subscriptions (admin only)
router.get(
  '/',
  authMiddleware.authorize('admin', 'superAdmin'),
  subscriptionController.getAllSubscriptions
);

// Get subscription by ID - This must come after other specific routes to avoid conflicts
router.get('/:subscriptionId', subscriptionController.getSubscriptionById);

// Extend subscription (admin only)
router.post(
  '/:subscriptionId/extend',
  authMiddleware.authorize('admin', 'superAdmin'),
  validate(subscriptionSchemas.extendSubscription),
  subscriptionController.extendSubscription
);

module.exports = router;
