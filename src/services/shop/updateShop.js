const { Shop } = require('../../models');
const { 
  AppError,
  ShopHelper,
  LogHelper,
  logSuccess,
  logError,
  logWarning,
  logInfo
} = require('../../utils');

/**
 * Update shop
 * @param {string} shopId - Shop ID to update
 * @param {Object} updateData - Data to update
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Updated shop object
 */
const updateShop = async (shopId, updateData, options = {}) => {
  try {
    const { session = null } = options;
    
    // Verify shop exists
    const shop = await Shop.findOne({ shopId });
    
    if (!shop) {
      throw new AppError(
        'Shop not found',
        404,
        'shop_not_found'
      );
    }
    
    // Initialize update object
    const updates = {};
    
    // Process shop name
    if (updateData.shopName) {
      updates.shopName = updateData.shopName.trim();
    }
    
    // Process owner name
    if (updateData.ownerName) {
      updates.ownerName = updateData.ownerName.trim();
    }
    
    // Process email (normalize to lowercase)
    if (updateData.email) {
      updates.email = updateData.email.toLowerCase().trim();
    }
    
    // Process phone
    if (updateData.phone) {
      updates.phone = updateData.phone.trim();
    }
    
    // Process address
    if (updateData.address) {
      updates.address = updateData.address.trim();
    }
    
    // Process detailed location
    if (updateData.location) {
      // Only update provided fields in the location object
      updates.location = {};
      
      // Handle each field individually to avoid overwriting entire object
      if (updateData.location.street !== undefined) updates.location.street = updateData.location.street.trim();
      if (updateData.location.city !== undefined) updates.location.city = updateData.location.city.trim();
      if (updateData.location.district !== undefined) updates.location.district = updateData.location.district.trim();
      if (updateData.location.state !== undefined) updates.location.state = updateData.location.state.trim();
      if (updateData.location.postalCode !== undefined) updates.location.postalCode = updateData.location.postalCode.trim();
      if (updateData.location.country !== undefined) updates.location.country = updateData.location.country.trim();
      
      // Handle coordinates
      if (updateData.location.coordinates) {
        updates.location.coordinates = {
          latitude: updateData.location.coordinates.latitude,
          longitude: updateData.location.coordinates.longitude
        };
      }
      
      // Handle place ID and formatted address
      if (updateData.location.placeId !== undefined) updates.location.placeId = updateData.location.placeId.trim();
      if (updateData.location.formattedAddress !== undefined) updates.location.formattedAddress = updateData.location.formattedAddress.trim();
    }
    
    // Process business details
    if (updateData.businessDetails) {
      // Only update provided fields in the businessDetails object
      updates.businessDetails = {};
      
      // Handle each field individually to avoid overwriting entire object
      if (updateData.businessDetails.type !== undefined) updates.businessDetails.type = updateData.businessDetails.type;
      if (updateData.businessDetails.category !== undefined) updates.businessDetails.category = updateData.businessDetails.category.trim();
      if (updateData.businessDetails.foundedDate !== undefined) updates.businessDetails.foundedDate = updateData.businessDetails.foundedDate;
      if (updateData.businessDetails.registrationNumber !== undefined) updates.businessDetails.registrationNumber = updateData.businessDetails.registrationNumber.trim();
      if (updateData.businessDetails.taxId !== undefined) updates.businessDetails.taxId = updateData.businessDetails.taxId.trim();
      if (updateData.businessDetails.employeeCount !== undefined) updates.businessDetails.employeeCount = updateData.businessDetails.employeeCount;
      
      // Handle operating hours
      if (updateData.businessDetails.operatingHours) {
        updates.businessDetails.operatingHours = updateData.businessDetails.operatingHours;
      }
    }
    
    // Process logo URL
    if (updateData.logoUrl !== undefined) {
      updates.logoUrl = updateData.logoUrl;
    }
    
    // Process banner URL
    if (updateData.bannerUrl !== undefined) {
      updates.bannerUrl = updateData.bannerUrl;
    }
    
    // Process social media profiles
    if (updateData.socialMedia) {
      updates.socialMedia = {};
      
      if (updateData.socialMedia.facebook !== undefined) updates.socialMedia.facebook = updateData.socialMedia.facebook.trim();
      if (updateData.socialMedia.instagram !== undefined) updates.socialMedia.instagram = updateData.socialMedia.instagram.trim();
      if (updateData.socialMedia.twitter !== undefined) updates.socialMedia.twitter = updateData.socialMedia.twitter.trim();
      if (updateData.socialMedia.website !== undefined) updates.socialMedia.website = updateData.socialMedia.website.trim();
    }
    
    // Process status - restricted to certain transitions
    if (updateData.status) {
      // Verify status transition is valid
      const validStatusTransitions = {
        'pending': ['active', 'suspended', 'deleted'],
        'active': ['suspended', 'deleted'],
        'suspended': ['active', 'deleted'],
        'deleted': [] // Cannot transition from deleted status
      };
      
      const currentStatus = shop.status;
      const newStatus = updateData.status;
      
      if (!validStatusTransitions[currentStatus].includes(newStatus)) {
        throw new AppError(
          `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
          400,
          'invalid_status_transition'
        );
      }
      
      updates.status = newStatus;
      
      // Add status change timestamp
      if (newStatus === 'suspended') {
        updates.suspendedAt = new Date();
      } else if (newStatus === 'active' && currentStatus === 'suspended') {
        updates.reactivatedAt = new Date();
      }
    }
    
    // Update shop
    const updateOperation = { $set: updates };
    
    // Apply the update
    let updatedShop;
    if (session) {
      updatedShop = await Shop.findOneAndUpdate(
        { shopId },
        updateOperation,
        { new: true, session }
      );
    } else {
      updatedShop = await Shop.findOneAndUpdate(
        { shopId },
        updateOperation,
        { new: true }
      );
    }
    
    // Log shop update
    await LogHelper.createShopLog(
      'shop_updated',
      shopId,
      {
        actorId: options.actorId || 'system',
        actorRole: options.actorRole || 'system'
      },
      { 
        updatedFields: Object.keys(updates),
        statusChange: updates.status ? `${shop.status} → ${updates.status}` : null
      }
    );
    
    logSuccess(`Shop updated: ${shopId}`, 'ShopService');
    
    return updatedShop;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logError(`Error updating shop ${shopId}: ${error.message}`, 'ShopService', error);
    throw new AppError('Failed to update shop', 500, 'shop_update_error');
  }
};

module.exports = updateShop;
