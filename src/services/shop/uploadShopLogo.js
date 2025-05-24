const { Shop, File } = require('../../models');
const { 
  AppError,
  LogHelper,
  logSuccess,
  logError,
  logInfo
} = require('../../utils');

/**
 * Upload and associate shop logo
 * @param {string} shopId - Shop ID to upload logo for
 * @param {Object} fileData - File data including url, size, extension, etc.
 * @param {string} uploadedBy - User ID who uploaded the logo
 * @returns {Promise<Object>} Result with success status and logo URL
 */
const uploadShopLogo = async (shopId, fileData, uploadedBy) => {
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
    
    // Validate file data
    if (!fileData || !fileData.url) {
      throw new AppError(
        'Invalid file data',
        400,
        'invalid_file_data'
      );
    }
    
    // Extract file information
    const {
      url,
      fileId,
      fileName,
      originalName,
      mimeType,
      size,
      extension
    } = fileData;
    
    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new AppError(
        'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed',
        400,
        'invalid_file_type'
      );
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (size > maxSize) {
      throw new AppError(
        'File too large. Maximum allowed size is 5MB',
        400,
        'file_too_large'
      );
    }
    
    // Create file record if file ID is provided
    if (fileId) {
      try {
        // Check if file record already exists
        const existingFile = await File.findOne({ fileId });
        
        if (!existingFile) {
          // Create new file record
          const file = new File({
            fileId,
            fileName,
            originalName,
            mimeType,
            size,
            extension,
            url,
            uploadedBy,
            associatedWith: {
              type: 'shop',
              id: shopId
            },
            purpose: 'logo'
          });
          
          await file.save();
          logInfo(`Created file record for shop logo: ${fileId}`, 'ShopService');
        } else {
          // Update existing file record
          existingFile.url = url;
          existingFile.fileName = fileName;
          existingFile.originalName = originalName;
          existingFile.mimeType = mimeType;
          existingFile.size = size;
          existingFile.extension = extension;
          existingFile.uploadedBy = uploadedBy;
          existingFile.associatedWith = {
            type: 'shop',
            id: shopId
          };
          existingFile.purpose = 'logo';
          existingFile.updatedAt = new Date();
          
          await existingFile.save();
          logInfo(`Updated file record for shop logo: ${fileId}`, 'ShopService');
        }
      } catch (fileError) {
        // Don't fail the logo update if file record creation fails
        logError(`Failed to create/update file record: ${fileError.message}`, 'ShopService', fileError);
      }
    }
    
    // Update shop with logo URL
    shop.logoUrl = url;
    await shop.save();
    
    // Log logo update
    await LogHelper.createShopLog(
      'shop_logo_updated',
      shopId,
      {
        actorId: uploadedBy,
        actorRole: 'unknown' // Role information not available in this context
      },
      {
        fileId,
        fileName: originalName || fileName,
        fileSize: size
      }
    );
    
    logSuccess(`Shop logo updated: ${shopId}`, 'ShopService');
    
    return {
      success: true,
      logoUrl: url
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logError(`Error uploading shop logo for ${shopId}: ${error.message}`, 'ShopService', error);
    throw new AppError('Failed to upload shop logo', 500, 'shop_logo_upload_error');
  }
};

module.exports = uploadShopLogo;
