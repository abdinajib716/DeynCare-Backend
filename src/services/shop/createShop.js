const { Shop } = require('../../models');

// Import utility modules
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
} = require('../../utils');

// Import subscription service
const SubscriptionService = require('../subscriptionService');

/**
 * Create a new shop
 * @param {Object} shopData - Shop data to create
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Created shop
 */
const createShop = async (shopData, options = {}) => {
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
        planType: shopPlanType
      }
    );

    logSuccess(`Shop created: ${shopId} - ${shopName}`, 'ShopService');
    
    return shop;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logError(`Error creating shop: ${error.message}`, 'ShopService', error);
    throw new AppError('Failed to create shop', 500, 'shop_creation_error');
  }
};

module.exports = createShop;
