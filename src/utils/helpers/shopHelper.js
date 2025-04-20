const { Shop } = require('../../models');
const { AppError } = require('../index');
const { logError } = require('../logger.js');

/**
 * Helper for common shop operations and entity retrieval
 */
const ShopHelper = {
  /**
   * Find an active shop by ID
   * @param {string} shopId - Shop ID to find
   * @param {Object} options - Additional options
   * @param {boolean} options.includeInactive - Whether to include inactive shops
   * @param {Array<string>} options.select - Fields to select
   * @param {Object} options.session - MongoDB session
   * @returns {Promise<Object>} Shop object
   * @throws {AppError} If shop not found
   */
  async findActiveShop(shopId, options = {}) {
    try {
      const { 
        includeInactive = false, 
        select = null,
        session = null
      } = options;

      // Build query
      const query = { shopId };
      
      // Only include active shops unless specified
      if (!includeInactive) {
        query.isDeleted = false;
      }

      // Build find operation
      let operation = Shop.findOne(query);
      
      // Add selection if specified
      if (select) {
        operation = operation.select(select);
      }
      
      // Add session if specified
      if (session) {
        operation = operation.session(session);
      }
      
      // Execute query
      const shop = await operation;

      if (!shop) {
        throw new AppError('Shop not found', 404, 'shop_not_found');
      }

      return shop;
    } catch (error) {
      // Re-throw AppError, wrap others
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Error finding shop by ID: ${error.message}`, 'ShopHelper', error);
      throw new AppError('Error finding shop', 500, 'database_error');
    }
  },

  /**
   * Find an active shop by email
   * @param {string} email - Email to find
   * @param {Object} options - Additional options
   * @param {boolean} options.includeInactive - Whether to include inactive shops
   * @param {Array<string>} options.select - Fields to select
   * @param {boolean} options.throwIfNotFound - Whether to throw if not found
   * @returns {Promise<Object|null>} Shop object or null if not found and throwIfNotFound is false
   * @throws {AppError} If shop not found and throwIfNotFound is true
   */
  async findShopByEmail(email, options = {}) {
    try {
      const { 
        includeInactive = false, 
        select = null,
        throwIfNotFound = true 
      } = options;

      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase();
      
      // Build query
      const query = { email: normalizedEmail };
      
      // Only include active shops unless specified
      if (!includeInactive) {
        query.isDeleted = false;
      }

      // Build find operation
      let operation = Shop.findOne(query);
      
      // Add selection if specified
      if (select) {
        operation = operation.select(select);
      }
      
      // Execute query
      const shop = await operation;

      if (!shop && throwIfNotFound) {
        throw new AppError('Shop not found', 404, 'shop_not_found');
      }

      return shop;
    } catch (error) {
      // Re-throw AppError, wrap others
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Error finding shop by email: ${error.message}`, 'ShopHelper', error);
      throw new AppError('Error finding shop', 500, 'database_error');
    }
  },

  /**
   * Validate shop data
   * @param {Object} shopData - Shop data to validate
   * @returns {Object} Validation result { isValid, errors, sanitizedData }
   */
  validateShopData(shopData) {
    const result = {
      isValid: true,
      errors: [],
      sanitizedData: { ...shopData }
    };
    
    // Required fields
    const requiredFields = ['shopName', 'ownerName', 'email', 'phone', 'address'];
    
    // Check for required fields
    for (const field of requiredFields) {
      if (!shopData[field]) {
        result.isValid = false;
        result.errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Validate shop name
    if (shopData.shopName && (shopData.shopName.length < 2 || shopData.shopName.length > 100)) {
      result.isValid = false;
      result.errors.push('Shop name must be between 2 and 100 characters');
    }
    
    // Validate email format (basic check)
    if (shopData.email && !shopData.email.includes('@')) {
      result.isValid = false;
      result.errors.push('Invalid email format');
    } else if (shopData.email) {
      // Normalize email
      result.sanitizedData.email = shopData.email.toLowerCase().trim();
    }
    
    // Validate phone format (basic check)
    if (shopData.phone && (!shopData.phone.startsWith('+') || shopData.phone.length < 8)) {
      result.isValid = false;
      result.errors.push('Phone should be in international format (e.g. +252xxxxxxxx)');
    }
    
    // Validate status if provided
    if (shopData.status && !['active', 'pending', 'suspended', 'inactive'].includes(shopData.status)) {
      result.isValid = false;
      result.errors.push('Invalid status value');
    }
    
    return result;
  },

  /**
   * Sanitize shop data for public exposure
   * @param {Object} shop - Shop object from database
   * @returns {Object} Sanitized shop object
   */
  sanitizeShop(shop) {
    if (!shop) return null;
    
    // Extract basic fields
    const sanitized = {
      shopId: shop.shopId,
      shopName: shop.shopName,
      ownerName: shop.ownerName,
      email: shop.email,
      phone: shop.phone,
      address: shop.address,
      logoUrl: shop.logoUrl,
      status: shop.status,
      verified: shop.verified,
      registeredBy: shop.registeredBy,
      createdAt: shop.createdAt,
      updatedAt: shop.updatedAt
    };
    
    // Include subscription data if it exists (but exclude sensitive payment details)
    if (shop.subscription) {
      sanitized.subscription = {
        planType: shop.subscription.planType,
        startDate: shop.subscription.startDate,
        endDate: shop.subscription.endDate,
        paymentMethod: shop.subscription.paymentMethod,
        initialPaid: shop.subscription.initialPaid
      };
    }

    return sanitized;
  }
};

module.exports = ShopHelper;
