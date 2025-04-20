/**
 * Payment Routes
 * Defines API routes for payment-related operations
 */
const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { paymentSchemas } = require('../validations');

// All payment routes require authentication
router.use(authenticate);

// Create payment - all authenticated users can create payments
router.post(
  '/',
  validate(paymentSchemas.createPayment),
  PaymentController.createPayment
);

// Get payments by shop - shop owners and authorized users only
router.get(
  '/shop/:shopId',
  authorize('admin', 'shopOwner', 'employee'),
  PaymentController.getPaymentsByShop
);

// Get unconfirmed payments
router.get(
  '/unconfirmed',
  authorize('admin', 'shopOwner'),
  PaymentController.getUnconfirmedPayments
);

// Get payment statistics
router.get(
  '/shop/:shopId/stats',
  authorize('admin', 'shopOwner'),
  PaymentController.getPaymentStats
);

// Confirm payment - shop owners and admins only
router.post(
  '/:paymentId/confirm',
  authorize('admin', 'shopOwner'),
  validate(paymentSchemas.confirmPayment),
  PaymentController.confirmPayment
);

// Refund payment - shop owners and admins only
router.post(
  '/:paymentId/refund',
  authorize('admin', 'shopOwner'),
  validate(paymentSchemas.refundPayment),
  PaymentController.refundPayment
);

// Add verification attempt
router.post(
  '/:paymentId/verify',
  authorize('admin', 'shopOwner', 'employee'),
  validate(paymentSchemas.verifyPayment),
  PaymentController.addVerificationAttempt
);

// Get single payment - placed at end to avoid route conflicts
router.get(
  '/:paymentId',
  PaymentController.getPaymentById
);

// Process payment using EVC Plus
router.post(
  '/evc',
  validate(paymentSchemas.evcPayment),
  PaymentController.payWithEvc
);

module.exports = router;
