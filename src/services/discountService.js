/**
 * Discount Service
 * Handles business logic for discount codes
 */
const { DiscountCode, User } = require('../models');
const { AppError, logInfo, logError, logSuccess } = require('../utils');

/**
 * DiscountService provides methods for managing discount codes
 */
const DiscountService = {
  /**
   * Create a new discount code
   * @param {Object} discountData - Discount code data
   * @param {String} createdBy - User ID creating the discount
   * @returns {Promise<Object>} Created discount code
   */
  createDiscountCode: async (discountData, createdBy) => {
    try {
      // Check if code already exists
      const existingCode = await DiscountCode.findOne({ 
        code: discountData.code.toUpperCase(), 
        isDeleted: false 
      });
      
      if (existingCode) {
        throw new AppError('Discount code already exists', 400, 'duplicate_code');
      }
      
      // Create discount code
      const discountCode = new DiscountCode({
        ...discountData,
        createdBy,
        updatedBy: createdBy
      });
      
      // Save to database
      await discountCode.save();
      
      logSuccess(`Discount code created: ${discountCode.code}`, 'DiscountService');
      return discountCode;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Failed to create discount code: ${error.message}`, 'DiscountService', error);
      throw new AppError('Failed to create discount code', 500, 'discount_creation_error');
    }
  },
  
  /**
   * Get discount code by ID
   * @param {String} discountId - Discount code ID
   * @param {Boolean} includeInactive - Whether to include inactive codes
   * @returns {Promise<Object>} Discount code
   */
  getDiscountById: async (discountId, includeInactive = false) => {
    try {
      const query = { 
        discountId,
        isDeleted: false
      };
      
      if (!includeInactive) {
        query.isActive = true;
      }
      
      const discountCode = await DiscountCode.findOne(query);
      
      if (!discountCode) {
        throw new AppError('Discount code not found', 404, 'discount_not_found');
      }
      
      return discountCode;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Failed to get discount code: ${error.message}`, 'DiscountService', error);
      throw new AppError('Failed to retrieve discount code', 500, 'discount_retrieval_error');
    }
  },
  
  /**
   * Get discount code by code string
   * @param {String} code - Discount code string
   * @param {Boolean} includeInactive - Whether to include inactive codes
   * @returns {Promise<Object>} Discount code
   */
  getDiscountByCode: async (code, includeInactive = false) => {
    try {
      const query = { 
        code: code.toUpperCase(),
        isDeleted: false
      };
      
      if (!includeInactive) {
        query.isActive = true;
      }
      
      const discountCode = await DiscountCode.findOne(query);
      
      if (!discountCode) {
        throw new AppError('Discount code not found', 404, 'discount_not_found');
      }
      
      return discountCode;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Failed to get discount code: ${error.message}`, 'DiscountService', error);
      throw new AppError('Failed to retrieve discount code', 500, 'discount_retrieval_error');
    }
  },
  
  /**
   * Update a discount code
   * @param {String} discountId - Discount code ID
   * @param {Object} updateData - Data to update
   * @param {String} updatedBy - User ID updating the discount
   * @returns {Promise<Object>} Updated discount code
   */
  updateDiscountCode: async (discountId, updateData, updatedBy) => {
    try {
      // Get the discount code
      const discountCode = await DiscountService.getDiscountById(discountId, true);
      
      // Don't allow updating the code itself
      if (updateData.code) {
        delete updateData.code;
      }
      
      // Update fields
      Object.keys(updateData).forEach(key => {
        discountCode[key] = updateData[key];
      });
      
      // Update metadata
      discountCode.updatedBy = updatedBy;
      
      // Save changes
      await discountCode.save();
      
      logSuccess(`Discount code updated: ${discountCode.code}`, 'DiscountService');
      return discountCode;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Failed to update discount code: ${error.message}`, 'DiscountService', error);
      throw new AppError('Failed to update discount code', 500, 'discount_update_error');
    }
  },
  
  /**
   * Delete a discount code (soft delete)
   * @param {String} discountId - Discount code ID
   * @param {String} deletedBy - User ID deleting the discount
   * @returns {Promise<Object>} Deleted discount code
   */
  deleteDiscountCode: async (discountId, deletedBy) => {
    try {
      // Get the discount code
      const discountCode = await DiscountService.getDiscountById(discountId, true);
      
      // Soft delete
      discountCode.isDeleted = true;
      discountCode.isActive = false;
      discountCode.updatedBy = deletedBy;
      
      // Save changes
      await discountCode.save();
      
      logSuccess(`Discount code deleted: ${discountCode.code}`, 'DiscountService');
      return discountCode;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Failed to delete discount code: ${error.message}`, 'DiscountService', error);
      throw new AppError('Failed to delete discount code', 500, 'discount_deletion_error');
    }
  },
  
  /**
   * Get discount codes with filtering and pagination
   * @param {Object} filter - Filter criteria
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object>} Discount codes with pagination info
   */
  getDiscountCodes: async (filter = {}, options = {}) => {
    try {
      // Default options
      const defaultOptions = {
        page: 1,
        limit: 20,
        sort: { createdAt: -1 }
      };
      
      // Merge with provided options
      const mergedOptions = { ...defaultOptions, ...options };
      
      // Build query
      const query = { isDeleted: false };
      
      // Apply filters
      if (filter.isActive !== undefined) {
        query.isActive = filter.isActive;
      }
      
      if (filter.shopId) {
        query.shopId = filter.shopId;
      }
      
      if (filter.applicableFor) {
        query.applicableFor = { $in: [filter.applicableFor, 'all'] };
      }
      
      if (filter.code) {
        query.code = { $regex: new RegExp(filter.code, 'i') };
      }
      
      if (filter.type) {
        query.type = filter.type;
      }
      
      // Handle date range filters
      if (filter.startDateFrom || filter.startDateTo) {
        query.startDate = {};
        
        if (filter.startDateFrom) {
          query.startDate.$gte = new Date(filter.startDateFrom);
        }
        
        if (filter.startDateTo) {
          query.startDate.$lte = new Date(filter.startDateTo);
        }
      }
      
      if (filter.expiryDateFrom || filter.expiryDateTo) {
        query.expiryDate = {};
        
        if (filter.expiryDateFrom) {
          query.expiryDate.$gte = new Date(filter.expiryDateFrom);
        }
        
        if (filter.expiryDateTo) {
          query.expiryDate.$lte = new Date(filter.expiryDateTo);
        }
      }
      
      // Handle active/expired filter
      if (filter.status === 'active') {
        query.isActive = true;
        query.expiryDate = { $gt: new Date() };
      } else if (filter.status === 'expired') {
        query.expiryDate = { $lte: new Date() };
      }
      
      // Get total count
      const totalCount = await DiscountCode.countDocuments(query);
      
      // Calculate pagination
      const totalPages = Math.ceil(totalCount / mergedOptions.limit);
      const skip = (mergedOptions.page - 1) * mergedOptions.limit;
      
      // Get discount codes
      const discountCodes = await DiscountCode.find(query)
        .sort(mergedOptions.sort)
        .skip(skip)
        .limit(mergedOptions.limit);
      
      return {
        discountCodes,
        pagination: {
          total: totalCount,
          page: mergedOptions.page,
          limit: mergedOptions.limit,
          pages: totalPages
        }
      };
    } catch (error) {
      logError(`Failed to get discount codes: ${error.message}`, 'DiscountService', error);
      throw new AppError('Failed to retrieve discount codes', 500, 'discount_retrieval_error');
    }
  },
  
  /**
   * Validate and calculate discount for a purchase
   * @param {String} code - Discount code
   * @param {Number} amount - Purchase amount
   * @param {String} context - Context (subscription, pos, debt)
   * @param {String} userId - User ID
   * @param {String} shopId - Shop ID
   * @returns {Promise<Object>} Discount details and amount
   */
  validateAndCalculateDiscount: async (code, amount, context = 'subscription', userId, shopId = null) => {
    try {
      // Get the discount code
      const discountCode = await DiscountService.getDiscountByCode(code);
      
      // Check if valid
      if (!discountCode.isValid()) {
        throw new AppError('Discount code is expired or inactive', 400, 'invalid_discount');
      }
      
      // Special handling for debt context - we want to be extra careful about this
      if (context === 'debt') {
        // Check if explicitly allowed for debt context
        if (!discountCode.applicableFor.includes('debt') && !discountCode.applicableFor.includes('all')) {
          throw new AppError('Discount codes cannot be applied to debt payments by default', 400, 'invalid_context_debt');
        }
      }
      
      // Check if applicable for this context
      if (!discountCode.applicableFor.includes('all') && !discountCode.applicableFor.includes(context)) {
        throw new AppError(`Discount code is not applicable for ${context}`, 400, 'invalid_context');
      }
      
      // Check if shop-specific discount matches
      if (discountCode.shopId && discountCode.shopId !== shopId) {
        throw new AppError('Discount code is not valid for this shop', 400, 'invalid_shop');
      }
      
      // Check if user has already used this code
      if (discountCode.perUserLimit > 0) {
        // This would ideally check against a usage tracking table
        // For now, we'll assume the limit is enforced elsewhere
      }
      
      // Calculate discount amount
      const discountAmount = discountCode.calculateDiscount(amount);
      
      // If minimum purchase not met
      if (discountAmount === 0 && amount > 0) {
        throw new AppError(
          `Minimum purchase amount of ${discountCode.minimumPurchase} not met`,
          400, 
          'minimum_purchase_not_met'
        );
      }
      
      // Format response
      return {
        discountId: discountCode.discountId,
        code: discountCode.code,
        type: discountCode.type,
        value: discountCode.value,
        discountAmount,
        finalAmount: amount - discountAmount,
        description: discountCode.description
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Failed to validate discount code: ${error.message}`, 'DiscountService', error);
      throw new AppError('Failed to validate discount code', 500, 'discount_validation_error');
    }
  },
  
  /**
   * Apply a discount code to a purchase
   * @param {String} code - Discount code
   * @param {Number} amount - Purchase amount
   * @param {String} context - Context (subscription, pos, debt)
   * @param {String} userId - User ID
   * @param {String} shopId - Shop ID
   * @returns {Promise<Object>} Applied discount details
   */
  applyDiscountCode: async (code, amount, context = 'subscription', userId, shopId = null) => {
    try {
      // First validate and calculate
      const discountDetails = await DiscountService.validateAndCalculateDiscount(
        code, amount, context, userId, shopId
      );
      
      // Get the discount code
      const discountCode = await DiscountService.getDiscountByCode(code);
      
      // Increment usage count
      await discountCode.use();
      
      // Return discount details
      return {
        ...discountDetails,
        applied: true,
        usageCount: discountCode.usageCount,
        usageLimit: discountCode.usageLimit
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Failed to apply discount code: ${error.message}`, 'DiscountService', error);
      throw new AppError('Failed to apply discount code', 500, 'discount_application_error');
    }
  }
};

module.exports = DiscountService;
