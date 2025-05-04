const { Shop, File, Subscription } = require('../models');

// Import utility modules from restructured directory
const { 
  // Core utilities
  AppError,
  
  // Generator utilities
  idGenerator,
  
  // Helper utilities
  ShopHelper,
  UserHelper,
  SubscriptionHelper,
  LogHelper,
  SettingsHelper,
  
  // Logger utilities
  logSuccess,
  logError,
  logWarning,
  logInfo
} = require('../utils');

// Import subscription service
const SubscriptionService = require('./subscriptionService');

/**
 * Service for shop-related operations
 */
const ShopService = {
  /**
   * Create a new shop
   */
  /**
   * Create a new shop
   * @param {Object} shopData - Shop data to create
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Created shop
   */
  createShop: async (shopData, options = {}) => {
    try {
      const { 
        shopName, 
        ownerName,
        email,
        phone,
        address: shopAddress,
        logoUrl = '',
        status = 'pending',
        verified = false,
        subscription = {},
        registeredBy = 'self',
        session = null
      } = shopData;

      // Normalize email to lowercase
      const normalizedEmail = email ? email.toLowerCase().trim() : '';
      
      // Validate shop data
      const validation = ShopHelper.validateShopData({
        ...shopData,
        email: normalizedEmail,
        address: shopAddress
      });
      
      if (!validation.isValid) {
        throw new AppError(
          `Invalid shop data: ${validation.errors.join(', ')}`,
          400,
          'invalid_shop_data'
        );
      }
      
      // Generate shop ID
      const shopId = await idGenerator.generateShopId(Shop);
      
      // Handle logo - only accept file upload objects
      let finalLogoUrl = '';
      if (logoUrl && typeof logoUrl === 'object' && logoUrl.fileId) {
        // This is a file upload result object, extract the URL
        finalLogoUrl = logoUrl.url || '';
      }
      
      // Validate subscription data - ensure we have a valid object to work with
      const subscriptionData = subscription || {};
      const planType = subscriptionData.planType || 'trial';
      const paymentMethod = subscriptionData.paymentMethod || 'offline';
      const initialPaid = subscriptionData.initialPaid || false;
      const paymentDetails = subscriptionData.paymentDetails || null;
      const discountDetails = subscriptionData.discountDetails || null;
      
      const subscriptionValidation = SubscriptionHelper.validateSubscriptionData({
        planType,
        paymentMethod,
        initialPaid,
        paymentDetails
      });
      
      if (!subscriptionValidation.isValid) {
        throw new AppError(
          `Invalid subscription data: ${subscriptionValidation.errors.join(', ')}`,
          400,
          'invalid_subscription_data'
        );
      }
      
      // Ensure payment method is valid and consistent with payment model
      let finalPaymentMethod = paymentMethod || 'offline';
      const validPaymentMethods = ['Cash', 'EVC Plus', 'Bank Transfer', 'Mobile Money', 'Check', 'Card', 'Other', 'offline'];
      
      if (!validPaymentMethods.includes(finalPaymentMethod)) {
        // Default to offline if not valid
        finalPaymentMethod = 'offline';
        logWarning(`Invalid payment method provided, defaulting to 'offline'`, 'ShopService');
      }
      
      // Get default subscription with validated data
      const finalSubscription = SubscriptionHelper.getDefaultSubscription({
        planType: planType || 'trial',
        paymentMethod: finalPaymentMethod,
        initialPaid: initialPaid || false,
        paymentDetails: paymentDetails || null
      });

      // Add discount information if provided
      if (discountDetails && initialPaid) {
        finalSubscription.pricing.discount = {
          active: true,
          code: discountDetails.code,
          discountId: discountDetails.discountId,
          amount: discountDetails.discountAmount,
          originalAmount: discountDetails.originalAmount || finalSubscription.pricing.price,
          type: discountDetails.type,
          value: discountDetails.value,
          percentage: discountDetails.type === 'percentage',
          appliedAt: new Date()
        };
        
        logInfo(`Applied discount code ${discountDetails.code} to shop subscription: ${discountDetails.discountAmount}`, 'ShopService');
      }

      // Set shop status based on plan type - trial plans should be immediately active
      // For trial plans, payment method is stored for future use but doesn't affect activation
      const shopPlanType = planType || 'trial';
      let shopStatus = status;
      
      if (shopPlanType === 'trial') {
        // Business rule: Trial plans are ALWAYS active regardless of payment method
        shopStatus = 'active';
        // For trials, mark payment as not required initially
        finalSubscription.initialPaid = true; // Consider trial as already "paid" to avoid payment requirements
      }

      // Create shop with sanitized data
      const shop = new Shop({
        shopId,
        shopName: validation.sanitizedData.shopName,
        ownerName,
        email: normalizedEmail,
        phone: validation.sanitizedData.phone,
        address: shopAddress,
        logoUrl: finalLogoUrl,
        status: shopStatus, // Use the determined status based on plan type
        verified,
        subscription: finalSubscription,
        registeredBy
      });

      // Save shop (with session if provided)
      if (session) {
        await shop.save({ session });
      } else {
        await shop.save();
      }

      // Initialize shop-specific settings
      try {
        // If we're in a transaction, skip this for now as it would require joining the session
        if (!session) {
          await SettingsHelper.createShopSettings(shopId, options.actorId || 'system');
          logSuccess(`Initialized settings for new shop: ${shopId}`, 'ShopService');
        } else {
          // Log that we'll need to create settings after transaction completes
          logInfo(`Shop settings initialization deferred until after transaction for shop: ${shopId}`, 'ShopService');
        }
      } catch (settingsError) {
        // Don't fail shop creation if settings initialization fails
        logError(`Failed to initialize shop settings: ${settingsError.message}`, 'ShopService', settingsError);
      }

      // Log shop creation using LogHelper
      await LogHelper.createShopLog(
        'shop_created', 
        shopId, 
        {
          actorId: options.actorId || 'system',
          actorRole: options.actorRole || 'system'
        }, 
        {
          registeredBy,
          planType: finalSubscription.planType,
          shopName
        }
      );

      // Create a standalone Subscription document to match the embedded subscription
      try {
        const subscriptionData = {
          shopId,
          planType: finalSubscription.planType,
          paymentMethod: finalSubscription.paymentMethod,
          paymentDetails: finalSubscription.paymentDetails || null
        };
        
        if (session) {
          // If we're in a transaction, use it for the subscription creation
          // We'll create the subscription document directly to use the same session
          const subscriptionId = await idGenerator.generateSubscriptionId(Subscription);
          const newSubscription = new Subscription({
            subscriptionId,
            shopId,
            plan: {
              name: 'standard',
              type: finalSubscription.planType
            },
            status: finalSubscription.planType === 'trial' ? 'trial' : 'active',
            payment: {
              method: finalSubscription.paymentMethod,
              verified: finalSubscription.initialPaid
            },
            dates: {
              startDate: finalSubscription.startDate,
              endDate: finalSubscription.endDate
            },
            history: [{
              action: finalSubscription.planType === 'trial' ? 'trial_started' : 'created',
              date: new Date(),
              performedBy: options.actorId || 'system',
              details: {
                createdBy: options.actorId || 'system',
                actorRole: options.actorRole || 'system'
              }
            }]
          });
          
          await newSubscription.save({ session });
          logSuccess(`Created standalone subscription ${subscriptionId} for shop: ${shopId} within transaction`, 'ShopService');
        } else {
          // If we're not in a transaction, use the SubscriptionService
          await SubscriptionService.createSubscription(subscriptionData, {
            actorId: options.actorId || 'system',
            actorRole: options.actorRole || 'system'
          });
          
          logSuccess(`Created standalone subscription for shop: ${shopId}`, 'ShopService');
        }
      } catch (subscriptionError) {
        // Don't fail shop creation if subscription creation fails
        logError(`Failed to create standalone subscription for shop ${shopId}: ${subscriptionError.message}`, 'ShopService', subscriptionError);
      }

      logSuccess(`New shop created: ${shop.shopId} (${shop.shopName})`, 'ShopService');
      
      // Return sanitized shop data
      return ShopHelper.sanitizeShop(shop);
    } catch (error) {
      // Re-throw AppError, wrap others
      if (error instanceof AppError) {
        throw error;
      }
      
      logError('Shop creation failed', 'ShopService', error);
      throw new AppError('Failed to create shop', 500, 'shop_creation_error');
    }
  },

  /**
   * Get shop by ID
   * @param {string} shopId - Shop ID to get
   * @param {Object} options - Additional options
   * @param {boolean} options.sanitize - Whether to sanitize the shop data
   * @param {boolean} options.includeInactive - Whether to include inactive shops
   * @returns {Promise<Object>} Shop object
   */
  getShopById: async (shopId, options = {}) => {
    try {
      // Use ShopHelper to find the shop by ID
      const shop = await ShopHelper.findActiveShop(shopId, options);
      
      // Return sanitized shop data if requested
      if (options.sanitize) {
        return ShopHelper.sanitizeShop(shop);
      }
      
      return shop;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Error retrieving shop by ID ${shopId}: ${error.message}`, 'ShopService', error);
      throw new AppError('Failed to retrieve shop', 500, 'shop_fetch_error');
    }
  },

  /**
   * Update shop
   * @param {string} shopId - Shop ID to update
   * @param {Object} updateData - Data to update
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Updated shop object
   */
  updateShop: async (shopId, updateData, options = {}) => {
    try {
      // Get shop by ID using ShopHelper
      const shop = await ShopHelper.findActiveShop(shopId);
      
      // Track which fields were actually changed
      const changedFields = [];
      
      // Validate shop data if provided
      if (Object.keys(updateData).some(key => ['shopName', 'phone', 'address', 'email'].includes(key))) {
        // Create a complete shop data object for validation
        const dataToValidate = {
          shopName: updateData.shopName || shop.shopName,
          phone: updateData.phone || shop.phone,
          address: updateData.address || shop.address,
          email: updateData.email || shop.email
        };
        
        const validation = ShopHelper.validateShopData(dataToValidate);
        
        if (!validation.isValid) {
          throw new AppError(
            `Invalid shop data: ${validation.errors.join(', ')}`,
            400,
            'invalid_shop_data'
          );
        }
        
        // Update with validated data
        if (updateData.shopName && updateData.shopName !== shop.shopName) {
          shop.shopName = validation.sanitizedData.shopName;
          changedFields.push('shopName');
        }
        
        if (updateData.phone && updateData.phone !== shop.phone) {
          shop.phone = validation.sanitizedData.phone;
          changedFields.push('phone');
        }
        
        if (updateData.address && updateData.address !== shop.address) {
          shop.address = validation.sanitizedData.address;
          changedFields.push('address');
        }
        
        // Email updates require special handling for uniqueness
        if (updateData.email && updateData.email !== shop.email) {
          const normalizedEmail = updateData.email.toLowerCase().trim();
          
          // Check if another shop already has this email
          const existingShop = await ShopHelper.findShopByEmail(normalizedEmail, {
            throwIfNotFound: false
          });
          
          if (existingShop && existingShop.shopId !== shopId) {
            throw new AppError('Email is already registered to another shop', 409, 'conflict_error');
          }
          
          shop.email = normalizedEmail;
          changedFields.push('email');
        }
      }
      
      // Update other basic fields
      const otherFields = ['status', 'verified', 'logoUrl'];
      otherFields.forEach(field => {
        if (updateData[field] !== undefined && updateData[field] !== shop[field]) {
          shop[field] = updateData[field];
          changedFields.push(field);
        }
      });

      // Handle subscription updates using SubscriptionHelper
      if (updateData.subscription) {
        // Validate the subscription change
        const subscriptionChange = SubscriptionHelper.validateSubscriptionChange(
          shop.subscription,
          updateData.subscription
        );
        
        // Only apply allowed changes
        if (Object.keys(subscriptionChange.allowedChanges).length > 0) {
          Object.entries(subscriptionChange.allowedChanges).forEach(([key, value]) => {
            shop.subscription[key] = value;
            changedFields.push(`subscription.${key}`);
          });
        }
      }
      
      // Only save if there were actual changes
      if (changedFields.length > 0) {
        await shop.save();
        
        // Log the update using LogHelper
        await LogHelper.createShopLog('shop_updated', {
          actorId: options.actorId || 'system',
          actorRole: options.actorRole || 'system',
          targetId: shopId,
          shopId: shopId,
          details: {
            updatedFields: changedFields
          }
        });
        
        logSuccess(`Shop updated: ${shop.shopId} (${shop.shopName})`, 'ShopService');
      } else {
        logInfo(`No changes to update for shop: ${shop.shopId}`, 'ShopService');
      }
      
      // Return sanitized shop data if requested
      if (options.sanitize) {
        return ShopHelper.sanitizeShop(shop);
      }
      
      return shop;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Error updating shop ${shopId}: ${error.message}`, 'ShopService', error);
      throw new AppError('Failed to update shop', 500, 'shop_update_error');
    }
  },

  /**
   * Upload and associate shop logo
   * @param {string} shopId - Shop ID to upload logo for
   * @param {Object} fileData - File data including url, size, extension, etc.
   * @param {string} uploadedBy - User ID who uploaded the logo
   * @returns {Promise<Object>} Result with success status and logo URL
   */
  uploadShopLogo: async (shopId, fileData, uploadedBy) => {
    try {
      // Validate file data
      if (!fileData || !fileData.url) {
        throw new AppError('Invalid file data', 400, 'invalid_file_data');
      }

      // Find shop using ShopHelper
      const shop = await ShopHelper.findActiveShop(shopId);
      
      // Validate file type (only images allowed for logos)
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      const extension = fileData.extension ? fileData.extension.toLowerCase().replace('.', '') : '';
      
      if (!validExtensions.includes(extension)) {
        throw new AppError(
          'Invalid file format. Only images are allowed for logos', 
          400, 
          'invalid_file_format'
        );
      }
      
      // Check file size (max 2MB)
      const maxSize = 2 * 1024 * 1024; // 2MB in bytes
      if (fileData.size && fileData.size > maxSize) {
        throw new AppError(
          'File size exceeds maximum allowed (2MB)', 
          400, 
          'file_too_large'
        );
      }

      // Create file record using FileHelper if available, otherwise fallback
      let file;
      if (typeof FileHelper !== 'undefined' && FileHelper.createFile) {
        file = await FileHelper.createFile({
          shopId,
          uploadedBy,
          fileType: 'logo',
          url: fileData.url,
          size: fileData.size || 0,
          extension,
          metadata: { isShopLogo: true }
        });
      } else {
        // Fallback to direct file creation if FileHelper not available
        const fileId = await idGenerator.generateFileId(File);
        file = new File({
          fileId,
          shopId,
          uploadedBy,
          fileType: 'logo',
          url: fileData.url,
          size: fileData.size || 0,
          extension
        });
        await file.save();
      }

      // Update shop logo URL
      shop.logoUrl = fileData.url;
      await shop.save();

      // Log the logo update
      await LogHelper.createShopLog('shop_logo_updated', {
        actorId: uploadedBy,
        targetId: shopId,
        shopId,
        details: {
          fileId: file.fileId,
          previousLogoUrl: shop.logoUrl !== fileData.url ? shop.logoUrl : null
        }
      });

      logSuccess(`Logo updated for shop: ${shop.shopId} (${shop.shopName})`, 'ShopService');
      
      return { 
        success: true, 
        message: 'Logo uploaded successfully',
        logoUrl: fileData.url,
        fileId: file.fileId
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Error uploading logo for shop ${shopId}: ${error.message}`, 'ShopService', error);
      throw new AppError('Failed to upload shop logo', 500, 'logo_upload_error');
    }
    
  },

  /**
   * Verify shop payment
   * @param {string} shopId - Shop ID to verify payment for
   * @param {Object} paymentData - Payment data with transaction details
   * @param {string} verifiedBy - User ID who verified the payment
   * @returns {Object} Result with updated subscription info
   */
  verifyPayment: async (shopId, paymentData, verifiedBy) => {
    try {
      // Validate payment data
      if (!paymentData) {
        throw new AppError('Payment data is required', 400, 'missing_payment_data');
      }

      const { 
        transactionId, 
        phoneNumber, 
        paymentMethod = 'offline',
        amount,
        currency,
        paymentDate = new Date()
      } = paymentData;
      
      // Validate transaction ID for non-offline payments
      if (paymentMethod !== 'offline' && !transactionId) {
        throw new AppError('Transaction ID is required for online payments', 400, 'missing_transaction_id');
      }
      
      // Find shop using ShopHelper
      const shop = await ShopHelper.findActiveShop(shopId);

      // Prepare payment details
      const paymentDetails = {
        transactionId,
        phoneNumber,
        amount,
        currency,
        paymentDate: new Date(paymentDate),
        verifiedAt: new Date(),
        verifiedBy
      };
      
      // Update subscription using SubscriptionHelper
      const subscriptionUpdate = await SubscriptionHelper.processPayment({
        shop,
        paymentMethod,
        paymentDetails,
        isInitialPayment: !shop.subscription.initialPaid,
      });
      
      // Apply subscription updates
      shop.subscription = subscriptionUpdate.subscription;
      
      // Update shop status to active if it was pending
      if (shop.status === 'pending') {
        shop.status = 'active';
      }

      await shop.save();

      // Log payment verification using LogHelper
      await LogHelper.createShopLog('payment_verified', {
        actorId: verifiedBy,
        targetId: shopId,
        shopId,
        details: {
          transactionId,
          paymentMethod,
          amount,
          currency,
          initialPayment: subscriptionUpdate.isInitialPayment,
          planType: shop.subscription.planType,
          newEndDate: shop.subscription.endDate
        }
      });

      logSuccess(`Payment verified for shop: ${shop.shopId} (${shop.shopName})`, 'ShopService');
      
      return {
        success: true,
        message: 'Payment verified successfully',
        subscription: shop.subscription,
        status: shop.status,
        isInitialPayment: subscriptionUpdate.isInitialPayment,
        extensionDays: subscriptionUpdate.extensionDays || 0
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Error verifying payment for shop ${shopId}: ${error.message}`, 'ShopService', error);
      throw new AppError('Failed to verify payment', 500, 'payment_verification_error');
    }
  },

  /**
   * Soft delete shop
   * @param {string} shopId - Shop ID to delete
   * @param {Object} options - Additional options
   * @param {string} options.actorId - ID of the actor performing the deletion
   * @param {string} options.actorRole - Role of the actor performing the deletion
   * @param {string} options.reason - Reason for deletion
   * @returns {Object} Result with success status
   */
  deleteShop: async (shopId, options = {}) => {
    try {
      // Get shop by ID using ShopHelper
      const shop = await ShopHelper.findActiveShop(shopId);
      
      // Check if the shop can be deleted (not already deleted)
      if (shop.isDeleted) {
        throw new AppError('Shop is already deleted', 400, 'shop_already_deleted');
      }
      
      // Store shop name for logging
      const shopName = shop.shopName;
      
      // Perform soft delete with ShopHelper if available
      if (typeof ShopHelper.softDeleteShop === 'function') {
        await ShopHelper.softDeleteShop(shop, options);
      } else {
        // Fallback if method doesn't exist
        shop.isDeleted = true;
        shop.deletedAt = new Date();
        shop.status = 'inactive';
        shop.deletedBy = options.actorId || 'system';
        shop.deletionReason = options.reason || 'manual deletion';
        await shop.save();
      }

      // Log the deletion using LogHelper
      await LogHelper.createShopLog('shop_deleted', {
        actorId: options.actorId || 'system',
        actorRole: options.actorRole || 'system',
        targetId: shopId,
        shopId: shopId,
        details: {
          shopName,
          reason: options.reason || 'manual deletion'
        }
      });
      
      logSuccess(`Shop soft deleted: ${shopId} (${shopName})`, 'ShopService');
      
      return { 
        success: true, 
        message: 'Shop deleted successfully',
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
  }
};

module.exports = ShopService;
