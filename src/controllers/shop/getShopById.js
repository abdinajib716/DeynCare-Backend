const ShopService = require('../../services/shopService');
const { AppError } = require('../../utils');

/**
 * Get shop by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
const getShopById = async (req, res, next) => {
  try {
    const { shopId } = req.params;
    
    if (!shopId) {
      return next(new AppError('Shop ID is required', 400, 'missing_shop_id'));
    }
    
    // Determine if inactive shops should be included based on user role
    const includeInactive = req.user && req.user.role === 'superAdmin';
    
    // Get shop with options
    const shop = await ShopService.getShopById(shopId, {
      sanitize: true,
      includeInactive
    });
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Shop retrieved successfully',
      data: shop
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getShopById;
