/**
 * Registration Payment Routes
 * Handles payment flow during user registration
 */
const express = require('express');
const registrationPaymentController = require('../controllers/registrationPaymentController');
const { validate } = require('../middleware/validationMiddleware');
const { registrationPaymentSchemas } = require('../validations');

const router = express.Router();

/**
 * Registration Payment Routes
 * Base path: /api/registration-payment
 */

// Process payments during registration
router.post('/evc', validate(registrationPaymentSchemas.evcPayment), registrationPaymentController.processEvcPayment);

// Check registration payment status
router.get('/:registrationId/status', registrationPaymentController.checkPaymentStatus);

// Handle EVC Plus callback
router.post('/evc-callback', registrationPaymentController.handleEvcCallback);

module.exports = router;
