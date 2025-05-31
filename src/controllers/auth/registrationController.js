const mongoose = require('mongoose');
const UserService = require('../../services/userService');
const ShopService = require('../../services/shopService');
const SettingsService = require('../../services/settingsService');
const DiscountService = require('../../services/discountService');
const EmailService = require('../../services/emailService');
const TokenService = require('../../services/tokenService');

// Import utility modules using the new directory structure
const { 
  AppError, 
  generateVerificationCode,
  ResponseHelper,
  UserHelper,
  ShopHelper,
  SubscriptionHelper,
  LogHelper,
  logInfo,
  logSuccess,
  logWarning,
  logError,
  TokenHelper,
  idGenerator
} = require('../../utils');

/**
 * Register a new user with shop
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { 
      // User data
      fullName, 
      email, 
      phone, 
      password,
      // Shop data
      shopName, 
      shopAddress,
      // Subscription data
      planType = 'trial',
      registeredBy = 'self',
      paymentMethod = 'offline',
      initialPaid = false,
      // Payment details
      paymentDetails,
      discountCode
    } = req.validatedData || req.body; // Use validated data if available

    // Check if the selected payment method is enabled
    const { Setting } = require('../../models');
    const allowedPaymentMethods = await Setting.findOne({ 
      key: 'payment_methods_available',
      shopId: null // Global setting
    });
    
    // If we have settings, validate the payment method
    if (allowedPaymentMethods && allowedPaymentMethods.value) {
      if (!allowedPaymentMethods.value.includes(paymentMethod)) {
        return next(new AppError(
          `Payment method "${paymentMethod}" is not currently available. Allowed methods: ${allowedPaymentMethods.value.join(', ')}`,
          400,
          'invalid_payment_method'
        ));
      }
      
      // Also check if online/offline payment is enabled
      const isOnlineMethod = ['EVC Plus', 'Card', 'Mobile Money'].includes(paymentMethod);
      const isOfflineMethod = ['Cash', 'Bank Transfer', 'Check', 'Other', 'offline'].includes(paymentMethod);
      
      if (isOnlineMethod) {
        const onlineEnabled = await Setting.findOne({ 
          key: 'enable_online_payment',
          shopId: null
        });
        
        if (onlineEnabled && onlineEnabled.value === false) {
          return next(new AppError(
            'Online payment methods are currently disabled',
            400,
            'payment_method_disabled'
          ));
        }
      } else if (isOfflineMethod) {
        const offlineEnabled = await Setting.findOne({ 
          key: 'enable_offline_payment',
          shopId: null
        });
        
        if (offlineEnabled && offlineEnabled.value === false) {
          return next(new AppError(
            'Offline payment methods are currently disabled',
            400,
            'payment_method_disabled'
          ));
        }
      }
    }

    // Generate verification code
    const verificationCode = generateVerificationCode(6);
    
    // Start a transaction for creating both user and shop
    const session = await mongoose.startSession();
    session.startTransaction();
    
    let userData;
    let shopId = null;
    let shopLogoData = null;
    let discountDetails = null;
    
    try {
      // Process shop logo file if uploaded
      if (req.file) {
        const FileUploadService = require('../../services/fileUploadService');
        shopLogoData = await FileUploadService.saveShopLogo(req.file);
      }
      
      // Check if there's a discount code and verify it
      if (discountCode) {
        discountDetails = await DiscountService.verifyDiscountCode(discountCode);
        
        if (!discountDetails.valid) {
          throw new AppError(
            discountDetails.message || 'Invalid discount code',
            400,
            'invalid_discount_code'
          );
        }
        
        // Log discount code usage
        logInfo(`Discount code ${discountCode} applied to shop registration`, 'AuthController');
      }
      
      // Create shop first
      const shopData = await ShopService.createShop({
        shopName: shopName,         // Changed from name to shopName
        address: shopAddress,       // This should be kept as address
        ownerName: fullName,        // Add owner name from fullName
        email: email,               // Pass email for shop record
        phone: phone,               // Pass phone for shop record
        logo: shopLogoData,
        planType,
        paymentMethod,
        initialPaid,
        paymentDetails,
        discountCode: discountDetails ? discountDetails.code : null,
        discountId: discountDetails ? discountDetails.discountId : null
      }, session);
      
      shopId = shopData.shopId;
      
      // Now create user with reference to shop
      userData = await UserService.createUser({
        fullName,
        email,
        phone,
        password,
        role: 'admin', // Shop owner is always admin
        shopId: shopId,
        registeredBy,
        verificationCode
      }, session);
      
      // Also update the shop with the owner reference
      await ShopService.updateShop(shopId, {
        ownerId: userData.userId
      }, session);
      
      // If all operations are successful, commit the transaction
      await session.commitTransaction();
      logSuccess(`Successfully registered user ${userData.userId} with shop ${shopId}`, 'AuthController');
    } catch (error) {
      // If any operation fails, abort the transaction
      await session.abortTransaction();
      
      // Handle specific database errors
      if (error.name === 'MongoServerError' && error.code === 11000) {
        // Duplicate key error
        const field = Object.keys(error.keyValue)[0];
        const errorMessage = field === 'email' 
          ? 'Email already exists'
          : `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
        
        return next(new AppError(
          errorMessage,
          409,
          'duplicate_key'
        ));
      }
      
      // Rethrow other errors
      throw error;
    } finally {
      // End session
      session.endSession();
    }
    
    // Send verification email
    try {
      // Use the auth email service for verification emails
      await EmailService.auth.sendVerificationEmail(userData, verificationCode);
      logSuccess(`Verification email sent to ${userData.email}`, 'AuthController');
    } catch (emailError) {
      logError(`Failed to send verification email to ${userData.email}`, 'AuthController', emailError);
      // Don't fail registration if email fails
    }
    
    // Generate tokens for the new user
    const tokens = await TokenService.generateAuthTokens(userData);
    TokenHelper.setTokenCookies(res, tokens);
    
    // Create success response
    return ResponseHelper.success(
      res,
      'Registration successful. Please check your email for a verification code.',
      {
        user: UserHelper.sanitizeUser(userData),
        shop: {
          shopId,
          name: shopName,
          verified: false
        },
        accessToken: tokens.accessToken
      }
    );
  } catch (error) {
    logError('Registration error', 'AuthController', error);
    return next(error);
  }
};

/**
 * Create a new employee user by an admin
 * POST /api/auth/create-employee
 * Requires authentication and admin authorization
 */
const createEmployee = async (req, res, next) => {
  try {
    const { 
      fullName, 
      email, 
      phone, 
      role = 'employee',
      password
    } = req.validatedData || req.body;
    
    // Only admin and superAdmin can create employee accounts
    if (!['admin', 'superAdmin'].includes(req.user.role)) {
      return next(new AppError(
        'You do not have permission to create employee accounts',
        403,
        'permission_denied'
      ));
    }
    
    // For admin users, ensure they can only create employees for their own shop
    if (req.user.role === 'admin') {
      // Ensure the employee will be assigned to the admin's shop
      const shopId = req.user.shopId;
      
      if (!shopId) {
        return next(new AppError(
          'You are not associated with any shop',
          400,
          'no_shop_associated'
        ));
      }
      
      // Validate role - admins can only create employees
      if (role !== 'employee') {
        return next(new AppError(
          'You can only create employee accounts',
          403,
          'invalid_role'
        ));
      }
      
      // Generate verification code (for email verification)
      const verificationCode = generateVerificationCode(6);
      
      try {
        // Create the employee user
        const userData = await UserService.createUser({
          fullName,
          email,
          phone,
          password,
          role: 'employee',
          shopId,
          registeredBy: req.user.userId,
          verificationCode,
          createdBy: req.user.userId
        });
        
        // Send verification email
        try {
          await EmailService.sendEmployeeWelcomeEmail(userData, verificationCode, {
            invitedBy: req.user.fullName,
            shopName: req.user.shopName || 'your shop'
          });
          
          logSuccess(`Employee welcome email sent to ${userData.email}`, 'AuthController');
        } catch (emailError) {
          logError(`Failed to send employee welcome email to ${userData.email}`, 'AuthController', emailError);
          // Don't fail registration if email fails
        }
        
        // Log the employee creation
        await LogHelper.createUserLog('employee_created', {
          actorId: req.user.userId,
          targetId: userData.userId,
          actorRole: req.user.role,
          shopId
        });
        
        // Return success response
        return ResponseHelper.success(
          res,
          'Employee account created successfully',
          UserHelper.sanitizeUser(userData)
        );
      } catch (error) {
        // Handle specific database errors
        if (error.name === 'MongoServerError' && error.code === 11000) {
          // Duplicate key error
          const field = Object.keys(error.keyValue)[0];
          const errorMessage = field === 'email' 
            ? 'Email already exists'
            : `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
          
          return next(new AppError(
            errorMessage,
            409,
            'duplicate_key'
          ));
        }
        
        throw error;
      }
    } else if (req.user.role === 'superAdmin') {
      // SuperAdmin can create both admin and employee accounts for any shop
      const { shopId } = req.body;
      
      // Validate role - superAdmins can create admins or employees
      if (!['admin', 'employee'].includes(role)) {
        return next(new AppError(
          'Invalid role specified',
          400,
          'invalid_role'
        ));
      }
      
      // For admin role, a shop must be specified
      if (role === 'admin' && !shopId) {
        return next(new AppError(
          'Shop ID is required when creating an admin account',
          400,
          'shop_id_required'
        ));
      }
      
      // Generate verification code (for email verification)
      const verificationCode = generateVerificationCode(6);
      
      try {
        // Create the user
        const userData = await UserService.createUser({
          fullName,
          email,
          phone,
          password,
          role,
          shopId: shopId || null,
          registeredBy: req.user.userId,
          verificationCode,
          createdBy: req.user.userId
        });
        
        // Send verification email
        try {
          if (role === 'admin') {
            await EmailService.sendAdminWelcomeEmail(userData, verificationCode, {
              invitedBy: req.user.fullName
            });
          } else {
            await EmailService.sendEmployeeWelcomeEmail(userData, verificationCode, {
              invitedBy: req.user.fullName,
              shopName: 'your shop'
            });
          }
          
          logSuccess(`Welcome email sent to ${userData.email}`, 'AuthController');
        } catch (emailError) {
          logError(`Failed to send welcome email to ${userData.email}`, 'AuthController', emailError);
          // Don't fail registration if email fails
        }
        
        // Log the user creation
        await LogHelper.createUserLog(`${role}_created`, {
          actorId: req.user.userId,
          targetId: userData.userId,
          actorRole: req.user.role,
          shopId: shopId || null
        });
        
        // Return success response
        return ResponseHelper.success(
          res,
          `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`,
          UserHelper.sanitizeUser(userData)
        );
      } catch (error) {
        // Handle specific database errors
        if (error.name === 'MongoServerError' && error.code === 11000) {
          // Duplicate key error
          const field = Object.keys(error.keyValue)[0];
          const errorMessage = field === 'email' 
            ? 'Email already exists'
            : `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
          
          return next(new AppError(
            errorMessage,
            409,
            'duplicate_key'
          ));
        }
        
        throw error;
      }
    }
  } catch (error) {
    logError('Create employee error', 'AuthController', error);
    return next(error);
  }
};

module.exports = {
  register,
  createEmployee
};
