const ShopService = require('../../services/shopService');
const { AppError } = require('../../utils');
const shopSchemas = require('../../validations/schemas/shopSchemas');

/**
 * Upload shop logo
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
const uploadShopLogo = async (req, res, next) => {
  try {
    const { shopId } = req.params;
    
    if (!shopId) {
      return next(new AppError('Shop ID is required', 400, 'missing_shop_id'));
    }
    
    // Validate request data against schema
    const { error, value } = shopSchemas.updateLogo.validate(req.body);
    
    if (error) {
      return next(new AppError(`Validation error: ${error.message}`, 400, 'validation_error'));
    }
    
    // Handle file upload - assuming file data is already processed by middleware
    // and available in req.file or req.body.fileData
    const fileData = req.file || req.body.fileData;
    
    if (!fileData && !value.logo) {
      return next(new AppError('No file or logo URL provided', 400, 'missing_file'));
    }
    
    // Prepare file data for service
    const logoData = fileData || { url: value.logo };
    
    // Call service with actor information
    const result = await ShopService.uploadShopLogo(
      shopId, 
      logoData, 
      req.user?.userId || 'system'
    );
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Shop logo uploaded successfully',
      data: {
        logoUrl: result.logoUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = uploadShopLogo;
