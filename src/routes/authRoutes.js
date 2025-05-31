const express = require('express');
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { authSchemas } = require('../validations');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

/**
 * Auth Routes
 * Base path: /api/auth
 */

// Registration and verification
router.post('/register', upload.single('shopLogo'), validate(authSchemas.register), authController.register);
router.post('/check-email', validate(authSchemas.checkEmail), authController.checkEmailExists);
router.post('/verify-email', validate(authSchemas.verifyEmail), authController.verifyEmail);
router.post('/resend-verification', validate(authSchemas.forgotPassword), authController.resendVerification);

// Create employee user (requires admin authentication)
router.post('/create-employee', authenticate, authorize(['admin']), validate(authSchemas.createEmployee), authController.createEmployee);

// Login, token refresh, and logout
router.post('/login', validate(authSchemas.login), authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);

// Password management
router.post('/forgot-password', validate(authSchemas.forgotPassword), authController.forgotPassword);
router.post('/reset-password', validate(authSchemas.resetPassword), authController.resetPassword);
router.post('/change-password', authenticate, validate(authSchemas.changePassword), authController.changePassword);

// User profile
router.get('/me', authenticate, authController.getProfile);

module.exports = router;
