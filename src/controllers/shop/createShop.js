const ShopService = require('../../services/shopService');
const { AppError } = require('../../utils');
const shopSchemas = require('../../validations/schemas/shopSchemas');
const ShopEmailService = require('../../services/email/shopEmailService');
const { logInfo, logError } = require('../../utils/logger');

/**
 * Create a new shop
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
const createShop = async (req, res, next) => {
  try {
    // Get data from validatedData or directly from body
    const userData = req.validatedData || req.body;
    
    // Transform request data to match service requirements
    const shopData = {
      shopName: userData.name,
      ownerName: userData.ownerName || req.user?.fullName || 'Unknown',
      email: userData.email,
      phone: userData.phone,
      address: userData.address,
      logoUrl: userData.logo || '',
      subscription: userData.subscription || {},
      registeredBy: req.user?.userId || 'self'
    };
    
    // Call service with actor information
    const shop = await ShopService.createShop(shopData, {
      actorId: req.user?.userId || 'system',
      actorRole: req.user?.role || 'system'
    });
    
    // Send shop registration/welcome email
    try {
      // If the shop was created in pending status, we can send a registration confirmation
      // If the shop was auto-activated (e.g., trial plan), we can send an activation email
      
      if (shop.status === 'active') {
        // Shop is already active (e.g., trial plan), send activation email
        await ShopEmailService.sendShopActivationEmail(
          {
            fullName: shopData.ownerName,
            email: shopData.email
          },
          shop,
          shop.subscription
        );
        logInfo(`Shop activation email sent to ${shopData.email} for new shop ${shop.shopId}`, 'createShop');
      } else {
        // For shops in pending status, we would typically send a registration confirmation
        // If a specific template doesn't exist, we could adapt the activation template
        // with pending-specific messaging
        
        // Note: This is a placeholder. You may want to create a dedicated registration email template
        await ShopEmailService.sendShopActivationEmail(
          {
            fullName: shopData.ownerName,
            email: shopData.email
          },
          {
            ...shop,
            name: `${shop.shopName} (PENDING APPROVAL)`
          },
          {
            ...shop.subscription,
            planType: 'pending-approval',
            notes: 'Your shop registration is being reviewed by our team. You will receive an email once it is approved.'
          }
        );
        logInfo(`Shop registration confirmation email sent to ${shopData.email} for new shop ${shop.shopId}`, 'createShop');
      }
    } catch (emailError) {
      // Don't fail the shop creation if email sending fails
      logError(`Failed to send shop registration/welcome email: ${emailError.message}`, 'createShop', emailError);
    }
    
    // Return success response
    res.status(201).json({
      success: true,
      message: 'Shop created successfully',
      data: shop
    });
  } catch (error) {
    next(error);
  }
};

module.exports = createShop;
