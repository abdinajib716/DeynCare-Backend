const ShopService = require('../../services/shopService');
const { AppError } = require('../../utils');
const shopSchemas = require('../../validations/schemas/shopSchemas');

/**
 * Update shop information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
const updateShop = async (req, res, next) => {
  try {
    const { shopId } = req.params;
    
    if (!shopId) {
      return next(new AppError('Shop ID is required', 400, 'missing_shop_id'));
    }
    
    // Validate request data against schema
    const { error, value } = shopSchemas.updateShop.validate(req.body);
    
    if (error) {
      return next(new AppError(`Validation error: ${error.message}`, 400, 'validation_error'));
    }
    
    // Transform request data to match service requirements
    const updateData = {};
    
    if (value.name) {
      updateData.shopName = value.name;
    }
    
    if (value.address) {
      updateData.address = value.address;
    }
    
    if (value.isActive !== undefined) {
      updateData.status = value.isActive ? 'active' : 'suspended';
    }
    
    // Additional fields from request that might need direct mapping
    const additionalFields = ['ownerName', 'email', 'phone', 'location', 'businessDetails', 'bannerUrl', 'socialMedia'];
    
    additionalFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    // Call service with actor information
    const updatedShop = await ShopService.updateShop(shopId, updateData, {
      actorId: req.user?.userId || 'system',
      actorRole: req.user?.role || 'system',
      sanitize: true
    });
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Shop updated successfully',
      data: updatedShop
    });
  } catch (error) {
    next(error);
  }
};

module.exports = updateShop;
