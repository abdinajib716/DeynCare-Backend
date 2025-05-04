const express = require('express');
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { userSchemas } = require('../validations');

const router = express.Router();

/**
 * User Management Routes
 * Base path: /api/users
 * These endpoints are primarily for SuperAdmin functionality
 */

// List all users - SuperAdmin only
router.get(
  '/',
  authenticate,
  authorize(['superAdmin']),
  userController.getAllUsers
);

// Get user by ID - SuperAdmin can get any user, Admin can only get users from their shop
router.get(
  '/:userId',
  authenticate,
  authorize(['superAdmin', 'admin']),
  userController.getUserById
);

// Create new user - SuperAdmin can create users for any shop
router.post(
  '/',
  authenticate,
  authorize(['superAdmin']),
  validate(userSchemas.createUser),
  userController.createUser
);

// Update user - SuperAdmin can update any user, Admin can only update users from their shop
router.put(
  '/:userId',
  authenticate,
  authorize(['superAdmin', 'admin']),
  validate(userSchemas.updateUser),
  userController.updateUser
);

// Change user status - SuperAdmin can change any user's status, Admin can only change users from their shop
router.patch(
  '/:userId/status',
  authenticate,
  authorize(['superAdmin', 'admin']),
  validate(userSchemas.changeUserStatus),
  // Add error catching middleware for this route specifically
  (req, res, next) => {
    try {
      // Apply additional validation that the schema might not catch
      const { status } = req.body;
      
      // Verify the status enum value is valid
      if (!['active', 'inactive', 'suspended'].includes(status)) {
        return res.status(400).json({
          success: false, 
          message: 'Invalid status value provided',
          statusCode: 400,
          type: 'validation_error'
        });
      }
      
      // All checks passed - continue to controller
      next();
    } catch (err) {
      console.error('User status route validation error:', err);
      return res.status(400).json({
        success: false,
        message: 'Error in status update request',
        statusCode: 400,
        type: 'validation_error'
      });
    }
  },
  userController.changeUserStatus
);

// Delete user - SuperAdmin can delete any user, Admin can only delete users from their shop
router.delete(
  '/:userId',
  authenticate,
  authorize(['superAdmin', 'admin']),
  validate(userSchemas.deleteUser),
  userController.deleteUser
);

module.exports = router;
