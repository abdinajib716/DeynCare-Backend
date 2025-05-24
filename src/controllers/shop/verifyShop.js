const ShopService = require('../../services/shopService');
const { AppError } = require('../../utils');
const { User } = require('../../models');
const ShopEmailService = require('../../services/email/shopEmailService');
const { logInfo, logError } = require('../../utils/logger');

/**
 * Verify shop (approve or reject shop registration)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
const verifyShop = async (req, res, next) => {
  try {
    const { shopId } = req.params;
    
    if (!shopId) {
      return next(new AppError('Shop ID is required', 400, 'missing_shop_id'));
    }
    
    // Get verification data from request body
    const { verified, status, notes, sendEmail } = req.body;
    
    if (verified === undefined) {
      return next(new AppError('Verification status is required', 400, 'missing_verification_status'));
    }
    
    // Prepare update data for service
    const updateData = {
      verified: verified === true,
      status: status || (verified ? 'active' : 'suspended'),
      verificationDetails: {
        verifiedAt: new Date(),
        verifiedBy: req.user?.userId || 'system',
        notes: notes || ''
      }
    };
    
    // Call service with actor information
    const updatedShop = await ShopService.updateShop(shopId, updateData, {
      actorId: req.user?.userId || 'system',
      actorRole: req.user?.role || 'system',
      sanitize: true
    });
    
    // Send email notification if sendEmail is true and shop was verified/activated
    if (sendEmail && verified) {
      try {
        // Get the shop owner user
        const shopOwner = await User.findOne({ 
          role: 'admin',
          shopId: shopId,
          isOwner: true
        });
        
        if (shopOwner) {
          // Send shop activation email
          await ShopEmailService.sendShopActivationEmail(
            shopOwner, 
            updatedShop, 
            updatedShop.subscription
          );
          
          logInfo(`Shop activation email sent to ${shopOwner.email} for shop ${shopId}`, 'verifyShop');
        } else {
          logError(`Could not find shop owner for shop ${shopId}`, 'verifyShop');
        }
      } catch (emailError) {
        // Don't fail the verification if email sending fails
        logError(`Failed to send shop activation email: ${emailError.message}`, 'verifyShop', emailError);
      }
    }
    
    // Return success response
    res.status(200).json({
      success: true,
      message: verified ? 'Shop verified and activated successfully' : 'Shop verification rejected',
      data: {
        shopId: updatedShop.shopId,
        shopName: updatedShop.shopName,
        verified: updatedShop.verified,
        status: updatedShop.status,
        verifiedBy: updateData.verificationDetails.verifiedBy,
        verifiedAt: updateData.verificationDetails.verifiedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = verifyShop;
