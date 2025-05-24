const { Shop } = require('../../models');
const { 
  AppError,
  LogHelper,
  logSuccess,
  logError,
  logInfo
} = require('../../utils');

/**
 * Soft delete shop
 * @param {string} shopId - Shop ID to delete
 * @param {Object} options - Additional options
 * @param {string} options.actorId - ID of the actor performing the deletion
 * @param {string} options.actorRole - Role of the actor performing the deletion
 * @param {string} options.reason - Reason for deletion
 * @returns {Object} Result with success status
 */
const deleteShop = async (shopId, options = {}) => {
  try {
    // Validate shop exists
    const shop = await Shop.findOne({ shopId });
    
    if (!shop) {
      throw new AppError(
        'Shop not found',
        404,
        'shop_not_found'
      );
    }
    
    // Validate shop is not already deleted
    if (shop.status === 'deleted') {
      throw new AppError(
        'Shop is already deleted',
        400,
        'shop_already_deleted'
      );
    }
    
    // Extract options
    const {
      actorId = 'system',
      actorRole = 'system',
      reason = 'Unspecified'
    } = options;
    
    // Update shop status to deleted
    shop.status = 'deleted';
    shop.deletedAt = new Date();
    shop.deletedBy = actorId;
    shop.deletionReason = reason;
    
    // Save shop
    await shop.save();
    
    // Log shop deletion
    await LogHelper.createShopLog(
      'shop_deleted',
      shopId,
      {
        actorId,
        actorRole
      },
      {
        reason,
        shopName: shop.shopName,
        deletedAt: new Date()
      }
    );
    
    logSuccess(`Shop deleted: ${shopId}`, 'ShopService');
    
    return {
      success: true,
      shopId,
      deletedAt: new Date()
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logError(`Error deleting shop ${shopId}: ${error.message}`, 'ShopService', error);
    throw new AppError('Failed to delete shop', 500, 'shop_deletion_error');
  }
};

module.exports = deleteShop;
