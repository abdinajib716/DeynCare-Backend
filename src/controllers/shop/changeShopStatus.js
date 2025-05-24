const ShopService = require('../../services/shopService');
const { AppError } = require('../../utils');
const { User } = require('../../models');
const ShopEmailService = require('../../services/email/shopEmailService');
const { logInfo, logError } = require('../../utils/logger');

/**
 * Change shop status (suspend or reactivate shop)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
const changeShopStatus = async (req, res, next) => {
  try {
    const { shopId } = req.params;
    
    if (!shopId) {
      return next(new AppError('Shop ID is required', 400, 'missing_shop_id'));
    }
    
    // Get status data from request body
    const { status, reason, duration, sendEmail } = req.body;
    
    if (!status || !['active', 'suspended'].includes(status)) {
      return next(new AppError('Valid status (active or suspended) is required', 400, 'invalid_status'));
    }
    
    // Calculate suspension end date if duration is provided
    let suspensionEndDate;
    if (status === 'suspended' && duration) {
      suspensionEndDate = new Date();
      suspensionEndDate.setDate(suspensionEndDate.getDate() + parseInt(duration, 10));
    }
    
    // Prepare update data for service
    const updateData = {
      status,
      suspensionReason: status === 'suspended' ? reason : null,
      suspensionEndDate: suspensionEndDate || null
    };
    
    if (status === 'suspended') {
      updateData.suspendedAt = new Date();
      updateData.suspendedBy = req.user?.userId || 'system';
    } else if (status === 'active') {
      updateData.reactivatedAt = new Date();
      updateData.reactivatedBy = req.user?.userId || 'system';
      // Clear suspension fields if reactivating
      updateData.suspensionReason = null;
      updateData.suspensionEndDate = null;
    }
    
    // Call service with actor information
    const updatedShop = await ShopService.updateShop(shopId, updateData, {
      actorId: req.user?.userId || 'system',
      actorRole: req.user?.role || 'system',
      sanitize: true
    });
    
    // Send email notification if sendEmail is true
    if (sendEmail) {
      try {
        // Get the shop owner user
        const shopOwner = await User.findOne({ 
          role: 'admin',
          shopId: shopId,
          isOwner: true
        });
        
        if (shopOwner) {
          // For now, we'll use the shop activation email for both cases
          // In a real implementation, you might want different email templates for suspension vs. reactivation
          if (status === 'active') {
            await ShopEmailService.sendShopActivationEmail(
              shopOwner, 
              updatedShop, 
              updatedShop.subscription
            );
            logInfo(`Shop reactivation email sent to ${shopOwner.email} for shop ${shopId}`, 'changeShopStatus');
          } else {
            // For suspension, you would implement a specific email template
            // As a fallback, we'll use the existing template but mention it's about suspension
            await ShopEmailService.sendShopActivationEmail(
              shopOwner, 
              {
                ...updatedShop,
                name: `${updatedShop.shopName} (SUSPENDED)`
              }, 
              {
                ...updatedShop.subscription,
                planType: 'suspended',
                reason: reason || 'Policy violation'
              }
            );
            logInfo(`Shop suspension email sent to ${shopOwner.email} for shop ${shopId}`, 'changeShopStatus');
          }
        } else {
          logError(`Could not find shop owner for shop ${shopId}`, 'changeShopStatus');
        }
      } catch (emailError) {
        // Don't fail the status change if email sending fails
        logError(`Failed to send shop status change email: ${emailError.message}`, 'changeShopStatus', emailError);
      }
    }
    
    // Return success response
    res.status(200).json({
      success: true,
      message: status === 'active' ? 'Shop reactivated successfully' : 'Shop suspended successfully',
      data: {
        shopId: updatedShop.shopId,
        shopName: updatedShop.shopName,
        status: updatedShop.status,
        suspendedBy: status === 'suspended' ? updateData.suspendedBy : null,
        suspendedAt: status === 'suspended' ? updateData.suspendedAt : null,
        suspensionReason: status === 'suspended' ? reason : null,
        suspensionEndDate: suspensionEndDate || null
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = changeShopStatus;
