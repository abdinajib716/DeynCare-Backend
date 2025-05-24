const ShopService = require('../../services/shopService');
const { AppError } = require('../../utils');
const { User } = require('../../models');
const ShopEmailService = require('../../services/email/shopEmailService');
const { logInfo, logError } = require('../../utils/logger');

/**
 * Delete shop (soft delete)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
const deleteShop = async (req, res, next) => {
  try {
    const { shopId } = req.params;
    
    if (!shopId) {
      return next(new AppError('Shop ID is required', 400, 'missing_shop_id'));
    }
    
    // Get reason from request body if provided
    const { reason } = req.body;
    
    // Call service with actor information
    const result = await ShopService.deleteShop(shopId, {
      actorId: req.user?.userId || 'system',
      actorRole: req.user?.role || 'system',
      reason: reason || 'Deleted by administrator'
    });
    
    // Send shop deletion notification email
    try {
      // Get the shop owner user
      const shopOwner = await User.findOne({ 
        role: 'admin',
        shopId: shopId,
        isOwner: true
      });
      
      if (shopOwner) {
        // For shop deletion, we'll adapt the existing email template
        // In a real implementation, you would create a specific template for shop deletion
        await ShopEmailService.sendShopActivationEmail(
          shopOwner,
          {
            shopId: result.shopId,
            shopName: `Shop Deleted: ${shopId}`,
            status: 'deleted'
          },
          {
            planType: 'deleted',
            notes: `Shop deleted on ${new Date().toLocaleDateString()} with reason: ${reason || 'Unspecified'}`
          }
        );
        
        logInfo(`Shop deletion notification email sent to ${shopOwner.email} for shop ${shopId}`, 'deleteShop');
      } else {
        logError(`Could not find shop owner for deleted shop ${shopId}`, 'deleteShop');
      }
    } catch (emailError) {
      // Don't fail the shop deletion if email sending fails
      logError(`Failed to send shop deletion notification email: ${emailError.message}`, 'deleteShop', emailError);
    }
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Shop deleted successfully',
      data: {
        shopId: result.shopId,
        deletedAt: result.deletedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = deleteShop;
