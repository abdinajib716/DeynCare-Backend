/**
 * Discount Controller
 * Handles HTTP requests related to discount codes
 */
const DiscountService = require('../services/discountService');
const { AppError, logError, logSuccess, logInfo, logWarning } = require('../utils');

/**
 * DiscountController provides methods for handling discount-related requests
 */
const DiscountController = {
  /**
   * Create a new discount code
   * POST /api/discounts
   */
  createDiscount: async (req, res, next) => {
    try {
      const discountData = req.validatedData || req.body;
      const createdBy = req.user.userId;
      
      // Create discount through service
      const discount = await DiscountService.createDiscountCode(discountData, createdBy);
      
      logSuccess(`Discount code created: ${discount.code}`, 'DiscountController');
      
      return res.status(201).json({
        success: true,
        message: 'Discount code created successfully',
        data: discount
      });
    } catch (error) {
      logError('Failed to create discount code', 'DiscountController', error);
      return next(error);
    }
  },
  
  /**
   * Get a specific discount code by ID
   * GET /api/discounts/:discountId
   */
  getDiscountById: async (req, res, next) => {
    try {
      const { discountId } = req.params;
      
      // Include inactive codes for admins and super admins
      const includeInactive = ['admin', 'superAdmin'].includes(req.user.role);
      
      const discount = await DiscountService.getDiscountById(discountId, includeInactive);
      
      return res.status(200).json({
        success: true,
        message: 'Discount code retrieved successfully',
        data: discount
      });
    } catch (error) {
      logError(`Failed to get discount: ${req.params.discountId}`, 'DiscountController', error);
      return next(error);
    }
  },
  
  /**
   * Update a discount code
   * PUT /api/discounts/:discountId
   */
  updateDiscount: async (req, res, next) => {
    try {
      const { discountId } = req.params;
      const updateData = req.validatedData || req.body;
      const updatedBy = req.user.userId;
      
      // Update discount through service
      const discount = await DiscountService.updateDiscountCode(discountId, updateData, updatedBy);
      
      logSuccess(`Discount code updated: ${discount.code}`, 'DiscountController');
      
      return res.status(200).json({
        success: true,
        message: 'Discount code updated successfully',
        data: discount
      });
    } catch (error) {
      logError(`Failed to update discount: ${req.params.discountId}`, 'DiscountController', error);
      return next(error);
    }
  },
  
  /**
   * Delete a discount code
   * DELETE /api/discounts/:discountId
   */
  deleteDiscount: async (req, res, next) => {
    try {
      const { discountId } = req.params;
      const deletedBy = req.user.userId;
      
      // Delete discount through service
      await DiscountService.deleteDiscountCode(discountId, deletedBy);
      
      logSuccess(`Discount code deleted: ${discountId}`, 'DiscountController');
      
      return res.status(200).json({
        success: true,
        message: 'Discount code deleted successfully'
      });
    } catch (error) {
      logError(`Failed to delete discount: ${req.params.discountId}`, 'DiscountController', error);
      return next(error);
    }
  },
  
  /**
   * Get all discount codes with filtering and pagination
   * GET /api/discounts
   */
  getDiscounts: async (req, res, next) => {
    try {
      // Extract query parameters
      const { 
        isActive, 
        shopId, 
        applicableFor, 
        code,
        type,
        status,
        startDateFrom,
        startDateTo,
        expiryDateFrom,
        expiryDateTo,
        page = 1, 
        limit = 20 
      } = req.query;
      
      // Build filter object
      const filter = {};
      
      if (isActive !== undefined) {
        filter.isActive = isActive === 'true';
      }
      
      if (shopId) {
        filter.shopId = shopId;
      } else if (req.user.role !== 'superAdmin') {
        // If not super admin, only show global codes and codes for user's shop
        filter.shopId = [null, req.user.shopId];
      }
      
      if (applicableFor) {
        filter.applicableFor = applicableFor;
      }
      
      if (code) {
        filter.code = code;
      }
      
      if (type) {
        filter.type = type;
      }
      
      if (status) {
        filter.status = status;
      }
      
      if (startDateFrom) {
        filter.startDateFrom = startDateFrom;
      }
      
      if (startDateTo) {
        filter.startDateTo = startDateTo;
      }
      
      if (expiryDateFrom) {
        filter.expiryDateFrom = expiryDateFrom;
      }
      
      if (expiryDateTo) {
        filter.expiryDateTo = expiryDateTo;
      }
      
      // Set pagination options
      const options = {
        page: parseInt(page),
        limit: parseInt(limit)
      };
      
      // Get discounts through service
      const result = await DiscountService.getDiscountCodes(filter, options);
      
      return res.status(200).json({
        success: true,
        message: 'Discount codes retrieved successfully',
        data: {
          discounts: result.discountCodes,
          pagination: result.pagination
        }
      });
    } catch (error) {
      logError('Failed to get discount codes', 'DiscountController', error);
      return next(error);
    }
  },
  
  /**
   * Validate a discount code
   * POST /api/discounts/validate
   */
  validateDiscount: async (req, res, next) => {
    try {
      const { code, amount, context } = req.validatedData || req.body;
      const userId = req.user.userId;
      const shopId = req.user.shopId;
      
      // Handle debt context with special warning
      if (context === 'debt') {
        logWarning(`Attempt to validate discount code ${code} for debt context by user ${userId}`, 'DiscountController');
      }
      
      // Validate discount through service
      const discountDetails = await DiscountService.validateAndCalculateDiscount(
        code, parseFloat(amount), context, userId, shopId
      );
      
      return res.status(200).json({
        success: true,
        message: 'Discount code is valid',
        data: discountDetails
      });
    } catch (error) {
      // For validation errors, we want to return a 400 status but still a "success" API response
      if (error instanceof AppError && 
          ['invalid_discount', 'invalid_context', 'invalid_shop', 'minimum_purchase_not_met', 'invalid_context_debt']
          .includes(error.code)) {
        
        let message = error.message;
        
        // Provide more specific message for debt context errors
        if (error.code === 'invalid_context_debt') {
          message = 'Discount codes cannot be applied to debt payments unless explicitly configured to do so.';
          logInfo(`Rejected discount code for debt context: ${req.body.code}`, 'DiscountController');
        }
        
        return res.status(200).json({
          success: false,
          message: message,
          error: {
            code: error.code,
            message: message
          }
        });
      }
      
      logError('Failed to validate discount code', 'DiscountController', error);
      return next(error);
    }
  },
  
  /**
   * Apply a discount code
   * POST /api/discounts/apply
   */
  applyDiscount: async (req, res, next) => {
    try {
      const { code, amount, context } = req.validatedData || req.body;
      const userId = req.user.userId;
      const shopId = req.user.shopId;
      
      // Handle debt context with special warning
      if (context === 'debt') {
        logWarning(`Attempt to apply discount code ${code} to debt context by user ${userId}`, 'DiscountController');
      }
      
      // Apply discount through service
      const discountDetails = await DiscountService.applyDiscountCode(
        code, parseFloat(amount), context, userId, shopId
      );
      
      logSuccess(`Discount code ${code} applied successfully`, 'DiscountController');
      
      return res.status(200).json({
        success: true,
        message: 'Discount code applied successfully',
        data: discountDetails
      });
    } catch (error) {
      // For validation errors, we want to return a 400 status but still a "success" API response
      if (error instanceof AppError && 
          ['invalid_discount', 'invalid_context', 'invalid_shop', 'minimum_purchase_not_met', 'invalid_context_debt']
          .includes(error.code)) {
        
        let message = error.message;
        
        // Provide more specific message for debt context errors
        if (error.code === 'invalid_context_debt') {
          message = 'Discount codes cannot be applied to debt payments unless explicitly configured to do so.';
          logInfo(`Rejected discount code for debt context: ${req.body.code}`, 'DiscountController');
        }
        
        return res.status(200).json({
          success: false,
          message: message,
          error: {
            code: error.code,
            message: message
          }
        });
      }
      
      logError('Failed to apply discount code', 'DiscountController', error);
      return next(error);
    }
  }
};

module.exports = DiscountController;
