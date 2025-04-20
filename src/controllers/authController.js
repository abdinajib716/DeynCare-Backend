const mongoose = require('mongoose');
const AuthService = require('../services/authService');
const UserService = require('../services/userService');
const ShopService = require('../services/shopService');
const EmailService = require('../services/emailService');
const SettingsService = require('../services/settingsService');

// Import utility modules using the new directory structure
const { 
  // Core utilities
  AppError, 
  ErrorResponse,
  
  // Generator utilities
  generateVerificationCode, 
  calculateExpiry,
  generateSecurePassword,
  
  // Helper utilities
  TokenHelper,
  ResponseHelper,
  UserHelper,
  ShopHelper,
  SubscriptionHelper,
  LogHelper,
  DebugHelper,
  
  // Logger utilities
  logInfo,
  logSuccess,
  logWarning,
  logError
} = require('../utils');

/**
 * Authentication controller for handling all auth-related operations
 */
const AuthController = {
  /**
   * Register a new user with shop
   * POST /api/auth/register
   */
  register: async (req, res, next) => {
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
        paymentDetails
      } = req.validatedData || req.body; // Use validated data if available

      // Check if the selected payment method is enabled
      const { Setting } = require('../models');
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
      
      try {
        // Process shop logo file if uploaded
        if (req.file) {
          const FileUploadService = require('../services/fileUploadService');
          shopLogoData = await FileUploadService.saveShopLogo(req.file);
          logInfo(`Shop logo uploaded during registration: ${shopLogoData.fileId}`, 'AuthController');
        }
        
        // 1. If shop details provided, create a new shop
        if (shopName && shopAddress) {
          // Validate payment method before shop creation
          const validPaymentMethods = ['Cash', 'EVC Plus', 'Bank Transfer', 'Mobile Money', 'Check', 'Card', 'Other', 'offline'];
          
          // Check if payment method is in allowed list
          if (!validPaymentMethods.includes(paymentMethod)) {
            logWarning(`Invalid payment method provided: ${paymentMethod}, defaulting to 'offline'`, 'AuthController');
            paymentMethod = 'offline';
          }
          
          // Map specific payment methods to core categories (online/offline)
          const onlinePaymentMethods = ['EVC Plus', 'Mobile Money', 'Card'];
          const paymentCategory = onlinePaymentMethods.includes(paymentMethod) ? 'online' : 'offline';
          
          // Create the shop using ShopService
          const shop = await ShopService.createShop({
            shopName,
            ownerName: fullName,
            email,
            phone,
            address: shopAddress,
            logoUrl: shopLogoData, // Pass the complete file metadata
            status: 'pending',
            verified: registeredBy === 'superAdmin', // Auto-verify if created by super admin
            subscription: {
              planType,
              startDate: new Date(),
              paymentMethod: paymentCategory, // Use the mapped category
              initialPaid,
              paymentDetails
            },
            registeredBy,
            session
          }, {
            actorId: 'system',
            actorRole: 'system'
          });
          
          // Set shopId for the user
          shopId = shop.shopId;
          
          // Update file record with actual shop ID if logo was uploaded
          if (shopLogoData) {
            const { File } = require('../models');
            await File.findOneAndUpdate(
              { fileId: shopLogoData.fileId },
              { shopId: shopId },
              { session }
            );
          }
          
          // Log payment method for subscription tracking
          logInfo(`Shop registered with payment method: ${paymentCategory}, initialPaid: ${initialPaid}`, 'AuthController');
        }

        // 2. Create the user using UserService
        userData = await UserService.createUser({
          fullName,
          email,
          phone,
          password,
          role: shopId ? 'admin' : 'employee', // Admin if they created a shop
          shopId, 
          status: registeredBy === 'superAdmin' ? 'active' : 'inactive', // Changed from 'pending' to 'inactive'
          verified: registeredBy === 'superAdmin', // Auto-verify if created by super admin
          emailVerified: registeredBy === 'superAdmin',
          verificationCode: registeredBy === 'superAdmin' ? null : verificationCode,
          verificationCodeExpires: registeredBy === 'superAdmin' ? null : calculateExpiry(24), // 24 hours
          session
        }, {
          createdBySuperAdmin: registeredBy === 'superAdmin',
          createdBy: registeredBy,
          actorId: 'system',
          actorRole: 'system'
        });
        
        // Commit the transaction
        await session.commitTransaction();
        logSuccess(`New user registered: ${userData.userId} (${userData.email})`, 'AuthController');
        
        // Create audit log for registration using LogHelper
        await LogHelper.createAuthLog('register_user', {
          actorId: 'system',
          actorRole: 'system',
          targetId: userData.userId,
          shopId: shopId,
          details: { registeredBy, shopCreated: !!shopId }
        });
      } catch (error) {
        // Abort transaction on error
        await session.abortTransaction();
        logError('Registration transaction failed', 'AuthController', error);
        throw error; // Re-throw to be caught by outer try/catch
      } finally {
        // Always end the session
        session.endSession();
      }

      // 3. Send verification email if not created by super admin
      if (registeredBy !== 'superAdmin') {
        await EmailService.sendVerificationEmail({ email, fullName }, verificationCode);
      }
      
      // 4. Send welcome email if created by super admin
      if (registeredBy === 'superAdmin' && shopId) {
        const shop = await ShopService.getShopById(shopId);
        await EmailService.sendWelcomeEmail(userData, shop);
      }

      // Return success response (excluding sensitive data)
      return res.status(201).json({
        success: true,
        message: registeredBy === 'superAdmin'
          ? 'Shop and admin user created successfully!'
          : 'Registration successful! Please check your email for verification code.',
        data: {
          userId: userData.userId,
          email: userData.email,
          fullName: userData.fullName,
          status: userData.status,
          role: userData.role,
          shopId: shopId
        }
      });
    } catch (error) {
      logError('Registration failed', 'AuthController', error);
      return next(error);
    }
  },

  /**
   * Create a new employee user by an admin
   * POST /api/auth/create-employee
   * Requires authentication and admin authorization
   */
  createEmployee: async (req, res, next) => {
    try {
      const { 
        fullName, 
        email, 
        phone, 
        password,
        generatePassword = true,
        permissions = [],
        position,
        note
      } = req.validatedData || req.body;

      // Current authenticated user (must be an admin)
      const { user } = req;
      
      // Get the shop ID from the admin user
      const shopId = user.shopId;
      
      if (!shopId) {
        return next(new AppError('Shop association required to create employees', 400, 'shop_required'));
      }
      
      // Generate a secure password if needed
      const finalPassword = generatePassword ? generateSecurePassword(10) : password;
      
      // Start a database transaction
      const session = await mongoose.startSession();
      session.startTransaction();
      
      let employeeData;
      
      try {
        // Get shop information
        const shop = await ShopService.getShopById(shopId);
        
        if (!shop) {
          throw new AppError('Shop not found', 404, 'shop_not_found');
        }
        
        // Create the employee user
        employeeData = await UserService.createUser({
          fullName,
          email,
          phone,
          password: finalPassword,
          role: 'employee',
          shopId,
          // Auto-verify since created by admin
          status: 'active',
          verified: true,
          emailVerified: true,
          // Store employee specific data
          permissions,
          position,
          session
        }, {
          createdBy: user.userId,
          actorId: user.userId,
          actorRole: user.role,
          note
        });
        
        // Commit the transaction
        await session.commitTransaction();
        logSuccess(`New employee created: ${employeeData.userId} by admin ${user.userId}`, 'AuthController');
        
        // Create audit log
        await LogHelper.createAuthLog('create_employee', {
          actorId: user.userId,
          actorRole: user.role,
          targetId: employeeData.userId,
          shopId,
          details: { permissions, position, note }
        });
      } catch (error) {
        // Abort transaction on error
        await session.abortTransaction();
        logError('Employee creation failed', 'AuthController', error);
        throw error;
      } finally {
        // Always end the session
        session.endSession();
      }
      
      // Send welcome email with credentials if password was generated
      if (generatePassword) {
        await EmailService.sendEmployeeWelcomeEmail({
          email,
          fullName,
          password: finalPassword,
          createdBy: user.fullName,
          shopName: shop ? shop.shopName : 'Your Shop',
          position
        });
      }
      
      // Return success response (excluding sensitive data)
      return res.status(201).json({
        success: true,
        message: 'Employee created successfully!',
        data: {
          userId: employeeData.userId,
          email: employeeData.email,
          fullName: employeeData.fullName,
          role: 'employee',
          shopId,
          permissions,
          position,
          passwordGenerated: generatePassword
        }
      });
    } catch (error) {
      logError('Employee creation failed', 'AuthController', error);
      return next(error);
    }
  },

  /**
   * Verify email with verification code
   * POST /api/auth/verify-email
   */
  verifyEmail: async (req, res, next) => {
    try {

      // Correctly extract verificationCode from the request
      const { email, verificationCode } = req.validatedData || req.body;

      // Use AuthService to verify email, passing verificationCode
      const user = await AuthService.verifyEmail(email, verificationCode);
      
      // Log verification in audit log using LogHelper
      await LogHelper.createAuthLog('verify_email', {
        actorId: user.userId,
        targetId: user.userId,
        actorRole: user.role,
        shopId: user.shopId || null
      });

      // If user is shop admin, send welcome email
      if (user.role === 'admin' && user.shopId) {
        // Use ShopHelper to get shop
        const shop = await ShopHelper.findActiveShop(user.shopId);
        await EmailService.sendWelcomeEmail(user, shop);
      }

      // Use ResponseHelper for consistent response
      return ResponseHelper.success(
        res, 
        'Email verified successfully. You can now log in.'
      );
    } catch (error) {
      logError('Email verification error', 'AuthController', error);
      return next(error);
    }
  },

  /**
   * Resend verification code
   * POST /api/auth/resend-verification
   */
  resendVerification: async (req, res, next) => {
    try {
      const { email } = req.validatedData || req.body;

      // Use AuthService to resend verification
      const result = await AuthService.resendVerification(email);
      logSuccess(`Verification code resend process completed for: ${email}`, 'AuthController');
      
      return res.status(200).json(result);
    } catch (error) {
      logError('Resend verification error', 'AuthController', error);
      return next(error);
    }
  },

  /**
   * User login
   * POST /api/auth/login
   */
  login: async (req, res, next) => {
    try {
      const { email, password, deviceName } = req.validatedData || req.body;

      // Get device name from request headers if not provided in body
      const deviceInfo = deviceName || req.headers['user-agent'] || 'Unknown Device';
      
      try {
        // Use AuthService for login
        const result = await AuthService.login(email, password, deviceInfo);
        
        // Create audit log for successful login using LogHelper
        await LogHelper.createAuthLog('user_login', {
          actorId: result.user.userId,
          targetId: result.user.userId,
          actorRole: result.user.role,
          shopId: result.user.shopId || null
        });
        
        // Set cookies using TokenHelper
        TokenHelper.setTokenCookies(res, {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken
        });

        return res.status(200).json({
          success: true,
          message: 'Login successful',
          data: {
            user: result.user,
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken
          }
        });
      } catch (authError) {
        // Handle specific authentication errors with appropriate status codes
        if (authError.statusCode) {
          return res.status(authError.statusCode).json(
            ErrorResponse.create(authError.message, authError.statusCode, authError.errorCode)
          );
        }
        throw authError; // Re-throw unexpected errors
      }
    } catch (error) {
      logError('Login error', 'AuthController', error);
      return next(error);
    }
  },

  /**
   * Refresh access token using refresh token
   * POST /api/auth/refresh-token
   */
  refreshToken: async (req, res, next) => {
    try {
      // Get refresh token from request using TokenHelper
      const refreshToken = TokenHelper.getRefreshTokenFromRequest(req);
      
      // Use AuthService to refresh token
      try {
        const result = await AuthService.refreshToken(refreshToken);
        
        // Set access token cookie using TokenHelper
        TokenHelper.setAccessTokenCookie(res, result.accessToken);
        
        return ResponseHelper.success(res, 'Token refreshed successfully', {
          accessToken: result.accessToken,
          expiresIn: 15 * 60 // 15 minutes in seconds
        });
      } catch (authError) {
        // Handle specific errors
        if (authError.statusCode) {
          return ResponseHelper.error(
            res,
            authError.message,
            authError.statusCode,
            authError.errorCode || 'token_error'
          );
        }
        throw authError;
      }
    } catch (error) {
      logError('Refresh token error', 'AuthController', error);
      return next(error);
    }
  },

  /**
   * User logout
   * POST /api/auth/logout
   */
  logout: async (req, res, next) => {
    try {
      // Get refresh token from request using TokenHelper
      const refreshToken = TokenHelper.getRefreshTokenFromRequest(req);
      
      try {
        // Use AuthService to logout
        const result = await AuthService.logout(refreshToken);
        
        // Clear token cookies using TokenHelper
        TokenHelper.clearTokenCookies(res);

        return ResponseHelper.success(res, 'Logged out successfully');
      } catch (authError) {
        // If token is invalid, still clear cookies and return success
        if (authError.errorCode === 'missing_token' || authError.errorCode === 'invalid_token') {
          // Clear token cookies using TokenHelper
          TokenHelper.clearTokenCookies(res);
          
          return ResponseHelper.success(res, 'Logged out successfully');
        }
        throw authError;
      }
    } catch (error) {
      logError('Logout error', 'AuthController', error);
      return next(error);
    }
  },

  /**
   * Logout from all devices
   * POST /api/auth/logout-all
   * Requires authentication
   */
  logoutAll: async (req, res, next) => {
    try {
      const { userId } = req.user;
      
      // Use AuthService to logout from all devices
      const result = await AuthService.logoutAll(userId);
      
      // Create audit log using LogHelper
      await LogHelper.createAuthLog('logout_all_devices', {
        actorId: userId,
        targetId: userId,
        actorRole: req.user.role,
        shopId: req.user.shopId || null
      });
      
      // Clear cookies using TokenHelper
      TokenHelper.clearTokenCookies(res);

      return ResponseHelper.success(res, 'Logged out from all devices successfully');
    } catch (error) {
      logError('Logout from all devices error', 'AuthController', error);
      return next(error);
    }
  },

  /**
   * Forgot password
   * POST /api/auth/forgot-password
   */
  forgotPassword: async (req, res, next) => {
    try {
      const { email } = req.validatedData || req.body;

      // Delegate to AuthService
      const result = await AuthService.forgotPassword(email);
      
      // Use LogHelper for audit log
      await LogHelper.createSecurityLog('password_reset_request', {
        targetEmail: email,
        actorId: 'system',
        actorRole: 'system'
      });
      
      // Log success for monitoring
      logSuccess(`Password reset process initiated for: ${email}`, 'AuthController');
      
      return ResponseHelper.success(
        res, 
        'If your email is registered, you will receive password reset instructions.'
      );
    } catch (error) {
      logError('Forgot password error', 'AuthController', error);
      return next(error);
    }
  },
  
  /**
   * Reset password
   * POST /api/auth/reset-password
   */
  resetPassword: async (req, res, next) => {
    try {
      // Get token from body, query, or validated data
      const token = req.validatedData?.token || req.body.token || req.query.token;
      const newPassword = req.validatedData?.newPassword || req.body.newPassword;
      
      if (!token || !newPassword) {
        return ResponseHelper.error(
          res, 
          'Token and new password are required', 
          400, 
          'missing_parameters'
        );
      }
      
      // Debug token in development mode only
      if (process.env.NODE_ENV === 'development') {
        await DebugHelper.debugResetToken(token);
      }
      
      try {
        // Delegate to AuthService
        const result = await AuthService.resetPassword(token, newPassword);
        
        // Create audit log for successful password reset using LogHelper
        // Note: The service should return the user info after a successful reset
        if (result && result.userId) {
          await LogHelper.createSecurityLog('password_reset_complete', {
            actorId: 'system',
            actorRole: 'system',
            targetId: result.userId,
            shopId: result.shopId || null,
            details: { method: 'reset_token' }
          });
        }
        
        return ResponseHelper.success(
          res,
          'Password has been reset successfully. Please log in with your new password.'
        );
      } catch (authError) {
        // Handle specific authentication errors
        if (authError.statusCode) {
          return ResponseHelper.error(
            res,
            authError.message,
            authError.statusCode,
            authError.errorCode || 'reset_password_error'
          );
        }
        throw authError;
      }
    } catch (error) {
      logError('Reset password error', 'AuthController', error);
      return next(error);
    }
  },

  /**
   * Change password (authenticated)
   * POST /api/auth/change-password
   * Requires authentication
   */
  changePassword: async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.validatedData || req.body;
      const { userId } = req.user;

      try {
        // Delegate to AuthService
        const result = await AuthService.changePassword(userId, currentPassword, newPassword);
        
        // Create audit log for successful password change using LogHelper
        await LogHelper.createSecurityLog('change_password', {
          actorId: userId,
          targetId: userId,
          actorRole: req.user.role,
          shopId: req.user.shopId || null,
          details: { method: 'authenticated' }
        });
        
        // Clear authentication cookies
        TokenHelper.clearTokenCookies(res);
        
        return ResponseHelper.success(
          res,
          'Password has been changed successfully. Please log in again with your new password.'
        );
      } catch (authError) {
        // Handle specific authentication errors
        if (authError.statusCode) {
          return ResponseHelper.error(
            res,
            authError.message,
            authError.statusCode,
            authError.errorCode || 'change_password_error'
          );
        }
        throw authError;
      }
    } catch (error) {
      logError('Change password error', 'AuthController', error);
      return next(error);
    }
  },

  /**
   * Get current user profile
   * GET /api/auth/me
   * Requires authentication
   */
  getProfile: async (req, res, next) => {
    try {
      const { userId } = req.user;
      
      try {
        // Delegate to AuthService - this will fetch the full user data from database
        const userProfile = await AuthService.getProfile(userId);
        
        // Log profile access for audit purposes using LogHelper
        await LogHelper.createAuthLog('view_profile', {
          actorId: userId,
          targetId: userId,
          actorRole: req.user.role,
          shopId: req.user.shopId || null
        });
        
        return ResponseHelper.success(res, 'Profile retrieved successfully', userProfile);
      } catch (authError) {
        // Handle specific authentication errors
        if (authError.statusCode) {
          return ResponseHelper.error(
            res,
            authError.message,
            authError.statusCode,
            authError.errorCode || 'profile_fetch_error'
          );
        }
        throw authError;
      }
    } catch (error) {
      logError('Get profile error', 'AuthController', error);
      return next(error);
    }
  }
};

module.exports = AuthController;
