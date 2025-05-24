const { Shop } = require('../../models');
const { 
  AppError,
  logError,
  logInfo
} = require('../../utils');

/**
 * Get shop by ID
 * @param {string} shopId - Shop ID to get
 * @param {Object} options - Additional options
 * @param {boolean} options.sanitize - Whether to sanitize the shop data
 * @param {boolean} options.includeInactive - Whether to include inactive shops
 * @returns {Promise<Object>} Shop object
 */
const getShopById = async (shopId, options = {}) => {
  try {
    const { sanitize = true, includeInactive = false } = options;
    
    // Construct query to find shop by ID
    const query = { shopId };
    
    // If not explicitly including inactive shops, only return active ones
    if (!includeInactive) {
      query.status = 'active';
    }
    
    // Find the shop
    const shop = await Shop.findOne(query).lean();
    
    if (!shop) {
      throw new AppError(
        includeInactive ? 'Shop not found' : 'Active shop not found',
        404,
        'shop_not_found'
      );
    }
    
    // Return sanitized version if requested
    if (sanitize) {
      // Remove sensitive fields
      delete shop.__v;
      delete shop.verificationDetails?.documents;
    }
    
    return shop;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logError(`Error getting shop ${shopId}: ${error.message}`, 'ShopService', error);
    throw new AppError('Failed to get shop', 500, 'shop_retrieval_error');
  }
};

module.exports = getShopById;
