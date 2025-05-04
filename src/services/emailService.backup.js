const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const { logInfo, logError, logSuccess } = require('../utils/logger');
const AppError = require('../utils/core/AppError');

/**
 * Email service for sending transactional emails and template rendering
 */
class EmailService {
  constructor() {
    // Email transport settings
    this.transporter = null;
    this.initialized = false;
    this.sender = '';
    
    // Template settings
    this.templatesDir = path.join(__dirname, '../templates/emails');
    this.templates = {};
    
    // Initialize
    this.init();
    this.loadTemplates();
  }

  /**
   * Initialize the email transporter
   */
  init() {
    try {
      // Create a transporter with email settings from env
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: parseInt(process.env.EMAIL_PORT) === 465, // Secure if port is 465
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      this.sender = process.env.EMAIL_FROM || 'support@deyncare.com';
      this.initialized = true;
      logInfo('Email service initialized', 'EmailService');
    } catch (error) {
      logError('Failed to initialize email service', 'EmailService', error);
      this.initialized = false;
    }
  }

  /**
   * Send an email
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} html - Email HTML content
   * @returns {Promise<boolean>} - Success status
   */
  async sendMail(to, subject, html) {
    if (!this.initialized) {
      this.init();
      if (!this.initialized) {
        throw new AppError('Email service is not available', 500, 'service_unavailable');
      }
    }

    try {
      const mailOptions = {
        from: this.sender,
        to,
        subject,
        html
      };

      await this.transporter.sendMail(mailOptions);
      logInfo(`Email sent to ${to}`, 'EmailService');
      return true;
    } catch (error) {
      logError(`Failed to send email to ${to}`, 'EmailService', error);
      throw new AppError('Failed to send email', 500, 'email_error');
    }
  }

  /**
   * Load template files from the templates directory
   */
  loadTemplates() {
    try {
      // Check if templates directory exists
      if (!fs.existsSync(this.templatesDir)) {
        logError('Templates directory does not exist', 'EmailService');
        return;
      }

      // Find all directory structure recursively
      const count = this.scanTemplateDirectory(this.templatesDir, '');
      logInfo(`LOADED ${count} EMAIL TEMPLATES`, 'EmailService');
    } catch (error) {
      logError('Failed to load email templates', 'EmailService', error);
    }
  }

  /**
   * Recursively scan template directory to find all HTML templates
   * @param {string} dir - Current directory to scan
   * @param {string} prefix - Path prefix for template key
   */
  scanTemplateDirectory(dir, prefix) {
    const items = fs.readdirSync(dir);
    let loadedCount = 0;
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory() && item !== 'css') {
        // It's a directory (and not the CSS directory), scan recursively
        const newPrefix = prefix ? `${prefix}/${item}` : item;
        loadedCount += this.scanTemplateDirectory(itemPath, newPrefix);
      } else if (stats.isFile() && item.endsWith('.html')) {
        // It's an HTML template file
        const templateName = path.basename(item, '.html');
        const templateKey = prefix ? `${prefix}/${templateName}` : templateName;
        
        // Read the template file
        this.templates[templateKey] = fs.readFileSync(itemPath, 'utf8');
        loadedCount++;
      }
    }
    return loadedCount;
  }

  /**
   * Render a template with provided data
   * @param {string} templateKey - Template key (e.g., 'Auth/verification')
   * @param {Object} data - Data to inject into the template
   * @returns {string} - Rendered HTML content
   */
  renderTemplate(templateKey, data = {}) {
    try {
      // Check if template exists
      if (!this.templates[templateKey]) {
        logError(`Template not found: ${templateKey}`, 'EmailService');
        return this.renderFallback(data);
      }

      // Add common variables
      const templateData = {
        ...data,
        year: new Date().getFullYear(),
        appName: process.env.APP_NAME || 'DeynCare',
        baseUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
      };

      // Replace all {{variable}} occurrences with actual data
      let renderedTemplate = this.templates[templateKey];
      renderedTemplate = renderedTemplate.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return templateData[key] !== undefined ? templateData[key] : match;
      });

      return renderedTemplate;
    } catch (error) {
      logError(`Failed to render template: ${templateKey}`, 'EmailService', error);
      return this.renderFallback(data);
    }
  }

  /**
   * Simple fallback template when main template fails
   * @param {Object} data - Template data
   * @returns {string} - Basic HTML email
   */
  renderFallback(data = {}) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${data.subject || 'DeynCare Notification'}</title>
      </head>
      <body>
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h1 style="color: #2e86de;">${data.title || 'DeynCare'}</h1>
          <p>Hello ${data.fullName || 'there'},</p>
          <p>${data.message || 'This is a notification from DeynCare.'}</p>
          ${data.actionUrl ? `<p><a href="${data.actionUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2e86de; color: white; text-decoration: none; border-radius: 4px;">Click Here</a></p>` : ''}
          <p>Best regards,<br>The DeynCare Team</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">&copy; ${new Date().getFullYear()} DeynCare. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send verification code email
   * @param {string} to - Recipient email
   * @param {string} code - Verification code
   * @param {string} name - Recipient name
   * @returns {Promise<boolean>} - Success status
   */
  async sendVerificationCode(to, code, name) {
    const subject = 'Verify Your Email Address';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email Address</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
          body {
            font-family: 'Poppins', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 1px solid #eaeaea;
          }
          .header img {
            max-width: 200px;
            height: auto;
          }
          .content {
            padding: 30px 20px;
            text-align: center;
          }
          h1 {
            color: #333;
            font-size: 24px;
            margin-bottom: 15px;
          }
          p {
            margin-bottom: 20px;
            color: #555;
          }
          .code {
            font-size: 36px;
            font-weight: 700;
            letter-spacing: 8px;
            background-color: #f5f5f5;
            color: #333;
            padding: 15px;
            border-radius: 6px;
            margin: 30px 0;
            display: inline-block;
          }
          .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #888;
            border-top: 1px solid #eaeaea;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>DeynCare</h2>
          </div>
          <div class="content">
            <h1>Verify Your Email Address</h1>
            <p>Hello ${name},</p>
            <p>Thank you for creating a DeynCare account. To activate your account, please use the verification code below:</p>
            <div class="code">${code}</div>
            <p>This code will expire in 24 hours.</p>
            <p>If you didn't create this account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DeynCare. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendMail(to, subject, html);
  }

  /**
   * Send password reset email
   * @param {string} to - Recipient email
   * @param {string} token - Reset token
   * @param {string} name - Recipient name
   * @returns {Promise<boolean>} - Success status
   */
  async sendPasswordResetEmail(to, token, name) {
    // Validate required parameters
    if (!to) {
      logError('Missing recipient email for password reset', 'EmailService');
      throw new AppError('Recipient email is required', 400, 'missing_parameter');
    }

    if (!token) {
      logError('Missing token for password reset', 'EmailService');
      throw new AppError('Reset token is required', 400, 'missing_parameter');
    }

    // Ensure frontend URL is available
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const subject = 'Reset Your DeynCare Password';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your DeynCare Password</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
          body {
            font-family: 'Poppins', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 1px solid #eaeaea;
          }
          .header img {
            max-width: 200px;
            height: auto;
          }
          .content {
            padding: 30px 20px;
            text-align: center;
          }
          h1 {
            color: #333;
            font-size: 24px;
            margin-bottom: 15px;
          }
          p {
            margin-bottom: 20px;
            color: #555;
          }
          .button {
            display: inline-block;
            background-color: #4a6cf7;
            color: #ffffff !important;
            font-weight: 600;
            padding: 12px 30px;
            border-radius: 6px;
            text-decoration: none;
            margin: 20px 0;
          }
          .link {
            font-size: 14px;
            word-break: break-all;
            color: #4a6cf7;
          }
          .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #888;
            border-top: 1px solid #eaeaea;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>DeynCare</h2>
          </div>
          <div class="content">
            <h1>Reset Your Password</h1>
            <p>Hello ${name},</p>
            <p>We received a request to reset your DeynCare account password. Click the button below to set a new password:</p>
            <a href="${resetLink}" class="button">Reset Password</a>
            <p>If the button doesn't work, you can copy and paste this link in your browser:</p>
            <p><a href="${resetLink}" class="link">${resetLink}</a></p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DeynCare. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendMail(to, subject, html);
  }

  /**
   * Send a welcome email
   * @param {string} to - Recipient email
   * @param {string} name - Recipient name
   * @returns {Promise<boolean>} - Success status
   */
  async sendWelcomeEmail(to, name) {
    const subject = 'Welcome to DeynCare!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #2c3e50; text-align: center;">Welcome to DeynCare!</h2>
        <p>Hello ${name},</p>
        <p>Thank you for joining DeynCare. We're excited to have you as part of our community!</p>
        <p>With DeynCare, you can:</p>
        <ul style="color: #34495e; line-height: 1.6;">
          <li>Manage your debts and payments efficiently</li>
          <li>Track customer transactions and payment history</li>
          <li>Get insights and analytics on your business</li>
          <li>And much more!</li>
        </ul>
        <p>If you have any questions or need assistance, feel free to contact our support team.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/login" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Login to Your Account</a>
        </div>
        <p>Best regards,<br>The DeynCare Team</p>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #7f8c8d; font-size: 12px;">
          <p> DeynCare. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendMail(to, subject, html);
  }

  /**
   * Send a notification email
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} message - Notification message
   * @param {string} name - Recipient name
   * @returns {Promise<boolean>} - Success status
   */
  async sendNotificationEmail(to, subject, message, name) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #2c3e50; text-align: center;">DeynCare Notification</h2>
        <p>Hello ${name},</p>
        <p>${message}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Go to Dashboard</a>
        </div>
        <p>Best regards,<br>The DeynCare Team</p>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #7f8c8d; font-size: 12px;">
          <p> DeynCare. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendMail(to, subject, html);
  }

  /**
   * Verify SMTP connection
   * @returns {Promise<boolean>} - Connection status
   */
  async verifyConnection() {
    if (!this.initialized) {
      this.init();
    }

    try {
      await this.transporter.verify();
      logInfo('Email service connection verified successfully', 'EmailService');
      return true;
    } catch (error) {
      logError('Email service connection verification failed', 'EmailService', error);
      return false;
    }
  }
  
  /**
   * Send verification email
   * @param {Object} user - User object containing email and fullName
   * @param {string} verificationCode - Verification code
   * @returns {Promise<boolean>} - Success status
   */
  async sendVerificationEmail(user, verificationCode) {
    const to = user.email;
    const subject = 'Verify Your DeynCare Account';
    const data = {
      fullName: user.fullName,
      verificationCode: verificationCode,
      expiryTime: '24 hours'
    };
    
    const html = this.renderTemplate('Auth/verification', data);
    return this.sendMail(to, subject, html);
  }

  /**
   * Send welcome email after registration
   * @param {Object} user - User object containing email and fullName
   * @param {Object} shop - Shop object if applicable
   * @returns {Promise<boolean>} - Success status
   */
  async sendWelcomeEmail(user, shop = null) {
    const to = user.email;
    const subject = 'Welcome to DeynCare';
    const data = {
      fullName: user.fullName,
      shopName: shop ? shop.shopName : 'N/A',  // Changed from shop.name to shop.shopName
      shopId: shop ? shop.shopId : 'N/A',      // Added shopId
      planType: shop && shop.subscription ? shop.subscription.planType : 'trial',  // Added planType
      shopStatus: shop ? shop.status : 'N/A',  // Added shopStatus
      loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
      dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`,
      isShopOwner: !!shop
    };
    
    // Log for debugging in development environment
    if (process.env.NODE_ENV === 'development') {
      logInfo(`Sending welcome email with data: ${JSON.stringify(data)}`, 'EmailService');
    }
    
    const html = this.renderTemplate('welcome', data);
    return this.sendMail(to, subject, html);
  }

  /**
   * Send password reset email
   * @param {Object} user - User object containing email and fullName
   * @param {string} resetToken - Password reset token
   * @returns {Promise<boolean>} - Success status
   */
  async sendPasswordResetEmail(user, resetToken) {
    const to = user.email;
    const subject = 'Reset Your DeynCare Password';
    
    // Create reset link with token as query parameter
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
    
    const data = {
      fullName: user.fullName,
      resetToken: resetToken,
      resetLink: resetLink,
      expiryTime: '1 hour'
    };
    
    const html = this.renderTemplate('Auth/password-reset', data);
    return this.sendMail(to, subject, html);
  }

  /**
   * Send shop activation email
   * @param {Object} user - Shop owner user object
   * @param {Object} shop - Activated shop object
   * @param {Object} subscription - Subscription details
   * @returns {Promise<boolean>} - Success status
   */
  async sendShopActivationEmail(user, shop, subscription) {
    const to = user.email;
    const subject = 'Your DeynCare Shop Has Been Activated';
    const data = {
      fullName: user.fullName,
      shopName: shop.name,
      shopId: shop._id.toString(),
      planType: subscription.planType || 'standard',
      billingCycle: subscription.billingCycle || 'monthly',
      nextBillingDate: subscription.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString() : 'N/A',
      dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`
    };
    
    const html = this.renderTemplate('Shop/shop-activation', data);
    return this.sendMail(to, subject, html);
  }

  /**
   * Send trial ending reminder email
   * @param {Object} data - Email data containing email, shopName, trialEndsAt, daysLeft
   * @returns {Promise<boolean>} - Success status
   */
  async sendTrialEndingReminderEmail(data) {
    try {
      if (!this.initialized) {
        throw new AppError('Email service not initialized', 500, 'email_service_error');
      }

      const { email, shopName, trialEndsAt, daysLeft } = data;
      
      // Format date for display
      const formattedEndDate = new Date(trialEndsAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Prepare template data
      const templateData = {
        shopName,
        trialEndsAt: formattedEndDate,
        daysLeft,
        features: data.features || {},
        upgradeUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/subscription/upgrade`,
        upgradeMonthlyUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/subscription/upgrade?plan=monthly`,
        upgradeYearlyUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/subscription/upgrade?plan=yearly`,
        privacyUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/privacy`,
        termsUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/terms`,
        unsubscribeUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/unsubscribe`
      };

      // Render the template
      const html = this.renderTemplate('Subscription/trial-ending', templateData);
      
      // Send the email
      const result = await this.sendMail(
        email,
        `Your DeynCare trial ends in ${daysLeft} days - Upgrade now`,
        html
      );
      
      logSuccess(`Trial ending reminder email sent to: ${email}`, 'EmailService');
      return result;
    } catch (error) {
      logError('Failed to send trial ending reminder email', 'EmailService', error);
      throw error;
    }
  }

  /**
   * Send subscription upgrade confirmation email
   * @param {Object} data - Email data containing email, shopName, planType, endDate, price, currency
   * @returns {Promise<boolean>} - Success status
   */
  async sendSubscriptionUpgradedEmail(data) {
    try {
      if (!this.initialized) {
        throw new AppError('Email service not initialized', 500, 'email_service_error');
      }

      const { email, shopName, planType, endDate, price, currency } = data;
      
      // Format date for display
      const formattedEndDate = new Date(endDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Determine billing cycle based on plan type
      const billingCycle = planType === 'yearly' ? 'year' : 'month';
      
      // Prepare template data
      const templateData = {
        shopName,
        planType: planType.charAt(0).toUpperCase() + planType.slice(1), // Capitalize
        endDate: formattedEndDate,
        price,
        currency: currency || 'USD',
        billingCycle,
        paymentMethod: data.paymentMethod || 'Credit Card',
        dashboardUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/dashboard`,
        accountUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/account`,
        privacyUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/privacy`,
        termsUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/terms`,
        unsubscribeUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/unsubscribe`
      };

      // Render the template
      const html = this.renderTemplate('Subscription/subscription-upgraded', templateData);
      
      // Send the email
      const result = await this.sendMail(
        email,
        'Your DeynCare subscription has been upgraded',
        html
      );
      
      logSuccess(`Subscription upgraded email sent to: ${email}`, 'EmailService');
      return result;
    } catch (error) {
      logError('Failed to send subscription upgraded email', 'EmailService', error);
      throw error;
    }
  }

  /**
   * Send payment confirmation email
   * @param {Object} data - Email data containing email, shopName, amount, paymentDate, method, referenceNumber, etc.
   * @returns {Promise<boolean>} - Success status
   */
  async sendPaymentConfirmationEmail(data) {
    try {
      if (!this.initialized) {
        throw new AppError('Email service not initialized', 500, 'email_service_error');
      }

      const { 
        email, 
        shopName, 
        amount, 
        paymentDate, 
        method, 
        referenceNumber, 
        receiptNumber,
        planType,
        endDate
      } = data;
      
      // Format payment details
      const formattedPaymentDate = new Date(paymentDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const formattedEndDate = endDate ? new Date(endDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : null;
      
      // Prepare template data
      const templateData = {
        shopName,
        amount: amount.toFixed(2),
        currency: 'USD', // Default or from configuration
        paymentDate: formattedPaymentDate,
        transactionId: referenceNumber || 'N/A',
        paymentMethod: method,
        planType: planType || 'Standard',
        endDate: formattedEndDate || 'N/A',
        accountUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/billing`,
        privacyUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/privacy`,
        termsUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/terms`,
        unsubscribeUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/unsubscribe`
      };

      // Render the template
      const html = this.renderTemplate('Subscription/payment-confirmation', templateData);
      
      // Send the email
      const result = await this.sendMail(
        email,
        'Payment Confirmation - DeynCare',
        html
      );
      
      logSuccess(`Payment confirmation email sent to: ${email}`, 'EmailService');
      return result;
    } catch (error) {
      logError('Failed to send payment confirmation email', 'EmailService', error);
      throw error;
    }
  }

  /**
   * Send subscription canceled email
   * @param {Object} data - Email data containing email, shopName, endDate, immediateEffect
   * @returns {Promise<boolean>} - Success status
   */
  async sendSubscriptionCanceledEmail(data) {
    try {
      if (!this.initialized) {
        throw new AppError('Email service not initialized', 500, 'email_service_error');
      }

      const { email, shopName, endDate, immediateEffect } = data;
      
      // Format date for display
      const formattedEndDate = new Date(endDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Prepare template data
      const templateData = {
        shopName,
        endDate: formattedEndDate,
        immediateEffect: immediateEffect === true,
        planType: data.planType || 'Standard',
        feedbackUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/feedback`,
        reactivateUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/subscription/reactivate`,
        exportDataUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/account/export`,
        privacyUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/privacy`,
        termsUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/terms`,
        unsubscribeUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/unsubscribe`
      };

      // Render the template
      const html = this.renderTemplate('Subscription/subscription-canceled', templateData);
      
      // Send the email
      const result = await this.sendMail(
        email,
        'Your DeynCare subscription has been canceled',
        html
      );
      
      logSuccess(`Subscription canceled email sent to: ${email}`, 'EmailService');
      return result;
    } catch (error) {
      logError('Failed to send subscription canceled email', 'EmailService', error);
      throw error;
    }
  }

  /**
   * Send subscription renewal email
   * @param {Object} data - Email data containing email, shopName, endDate, planType, price, currency
   * @returns {Promise<boolean>} - Success status
   */
  async sendSubscriptionRenewalEmail(data) {
    try {
      if (!this.initialized) {
        throw new AppError('Email service not initialized', 500, 'email_service_error');
      }

      const { email, shopName, endDate, planType, price, currency } = data;
      
      // Format date for display
      const formattedEndDate = new Date(endDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Prepare template data
      const templateData = {
        shopName,
        endDate: formattedEndDate,
        planType: planType.charAt(0).toUpperCase() + planType.slice(1), // Capitalize
        price,
        currency: currency || 'USD',
        paymentMethod: data.paymentMethod || 'Credit Card',
        billingHistoryUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/account/billing`,
        subscriptionSettingsUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/account/subscription`,
        privacyUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/privacy`,
        termsUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/terms`,
        unsubscribeUrl: `${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/unsubscribe`
      };

      // Render the template
      const html = this.renderTemplate('Subscription/subscription-renewed', templateData);
      
      // Send the email
      const result = await this.sendMail(
        email,
        'Your DeynCare subscription has been renewed',
        html
      );
      
      logSuccess(`Subscription renewal email sent to: ${email}`, 'EmailService');
      return result;
    } catch (error) {
      logError('Failed to send subscription renewal email', 'EmailService', error);
      throw error;
    }
  }

  /**
   * Send subscription extended email
   * @param {Object} data - Email data containing email, shopName, days, endDate, reason
   * @returns {Promise<boolean>} - Success status
   */
  async sendSubscriptionExtendedEmail(data) {
    try {
      if (!this.initialized) {
        throw new AppError('Email service not initialized', 500, 'email_service_error');
      }

      const { email, shopName, days, endDate, reason } = data;
      
      // Format date for display
      const formattedEndDate = new Date(endDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // We don't have a specific template yet, so use basic HTML
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h1>Your Subscription Has Been Extended</h1>
          <p>Hello ${shopName},</p>
          <p>Good news! Your DeynCare subscription has been extended by ${days} days.</p>
          <p><strong>New Expiration Date:</strong> ${formattedEndDate}</p>
          ${reason ? `<p><strong>Reason for Extension:</strong> ${reason}</p>` : ''}
          <p>You can view your updated subscription details in your <a href="${process.env.FRONTEND_URL || 'https://app.deyncare.com'}/account/subscription">account settings</a>.</p>
          <p>Thank you for your continued support!</p>
          <p>If you have any questions, please contact our support team at support@deyncare.com.</p>
        </div>
      `;
      
      // Send the email
      const result = await this.sendMail(
        email,
        `Your DeynCare subscription has been extended by ${days} days`,
        html
      );
      
      logSuccess(`Subscription extension email sent to: ${email}`, 'EmailService');
      return result;
    } catch (error) {
      logError('Failed to send subscription extension email', 'EmailService', error);
      throw error;
    }
  }

  /**
   * Send subscription expired email
   * @param {Object} data - Email data containing email, shopName, endDate, planType, gracePeriodDays
   * @returns {Promise<boolean>} - Success status
   */
  async sendSubscriptionExpiredEmail(data) {
    try {
      if (!this.initialized) {
        throw new AppError('Email service not initialized', 500, 'email_service_error');
      }

      const { email, shopName, endDate, planType, gracePeriodDays } = data;
      
      // Format date for display
      const formattedEndDate = new Date(endDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Get base URL for links
      const baseUrl = process.env.FRONTEND_URL || 'https://app.deyncare.com';
      
      // Prepare template data
      const templateData = {
        shopName,
        endDate: formattedEndDate,
        planType: planType.charAt(0).toUpperCase() + planType.slice(1), // Capitalize
        gracePeriodDays: gracePeriodDays || 30,
        reactivateUrl: `${baseUrl}/subscription/reactivate`,
        exportDataUrl: `${baseUrl}/account/export`,
        monthlyPlanUrl: `${baseUrl}/subscription/upgrade?plan=monthly`,
        yearlyPlanUrl: `${baseUrl}/subscription/upgrade?plan=yearly`,
        privacyUrl: `${baseUrl}/privacy`,
        termsUrl: `${baseUrl}/terms`,
        unsubscribeUrl: `${baseUrl}/unsubscribe`
      };

      // Render the template
      const html = this.renderTemplate('Subscription/subscription-expired', templateData);
      
      // Send the email
      const result = await this.sendMail(
        email,
        'Your DeynCare subscription has expired',
        html
      );
      
      logSuccess(`Subscription expired email sent to: ${email}`, 'EmailService');
      return result;
    } catch (error) {
      logError('Failed to send subscription expired email', 'EmailService', error);
      throw error;
    }
  }

  /**
   * Send password changed notification email
   * @param {Object} user - User object containing email and fullName
   * @param {Object} deviceInfo - Information about the device used for the change
   * @returns {Promise<boolean>} - Success status
   */
  async sendPasswordChangedEmail(user, deviceInfo = {}) {
    try {
      if (!this.initialized) {
        throw new AppError('Email service not initialized', 500, 'email_service_error');
      }

      const { email, fullName } = user;
      
      // Format date/time for display
      const changeTime = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Get base URL for links
      const baseUrl = process.env.FRONTEND_URL || 'https://app.deyncare.com';
      
      // Prepare template data
      const templateData = {
        fullName: fullName || 'Valued Customer',
        changeTime,
        deviceInfo: deviceInfo.name || 'Unknown Device',
        location: deviceInfo.location || 'Unknown Location',
        loginUrl: `${baseUrl}/login`,
        resetUrl: `${baseUrl}/reset-password`,
        supportUrl: `${baseUrl}/support`
      };

      // Render the template
      const html = this.renderTemplate('Auth/password-changed', templateData);
      
      // Send the email
      const result = await this.sendMail(
        email,
        'Your DeynCare Password Has Been Changed',
        html
      );
      
      logSuccess(`Password changed notification email sent to: ${email}`, 'EmailService');
      return result;
    } catch (error) {
      logError('Failed to send password changed notification email', 'EmailService', error);
      throw error;
    }
  }

  /**
   * Send an email with support for templates, multiple recipients, and attachments
   * @param {Object} options - Email options
   * @param {string|Array<string>} options.to - Recipient email(s)
   * @param {string} options.subject - Email subject
   * @param {string} options.template - Template key (e.g., 'Report/report-delivery')
   * @param {Object} options.data - Data to inject into the template
   * @param {Array<Object>} options.attachments - Array of attachment objects
   * @returns {Promise<boolean>} - Success status
   */
  async sendEmail(options) {
    if (!this.initialized) {
      this.init();
      if (!this.initialized) {
        throw new AppError('Email service is not available', 500, 'service_unavailable');
      }
    }

    try {
      const { to, subject, template, data = {}, attachments = [] } = options;
      
      // Convert recipients to array if string
      const recipients = Array.isArray(to) ? to : [to];
      
      // Render HTML content from template
      const html = this.renderTemplate(template, data);
      
      // Prepare mail options
      const mailOptions = {
        from: this.sender,
        to: recipients.join(', '),
        subject,
        html
      };
      
      // Add attachments if provided
      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments;
      }

      // Send the email
      await this.transporter.sendMail(mailOptions);
      
      logSuccess(`Email sent to ${mailOptions.to}`, 'EmailService');
      return true;
    } catch (error) {
      logError(`Failed to send email: ${error.message}`, 'EmailService', error);
      throw new AppError('Failed to send email', 500, 'email_error');
    }
  }
}

  /**
   * Send an email
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} html - Email HTML content
   * @returns {Promise<boolean>} - Success status
   */
  async sendMail(to, subject, html) {
    if (!this.initialized) {
      this.init();
      if (!this.initialized) {
        throw new AppError('Email service is not available', 500, 'service_unavailable');
      }
    }

    try {
      const mailOptions = {
        from: this.sender,
        to,
        subject,
        html
      };

      await this.transporter.sendMail(mailOptions);
      logInfo(`Email sent to ${to}`, 'EmailService');
      return true;
    } catch (error) {
      logError(`Failed to send email to ${to}`, 'EmailService', error);
      throw new AppError('Failed to send email', 500, 'email_error');
    }
  }

  /**
   * Load template files from the templates directory
   */
  loadTemplates() {
    try {
      // Check if templates directory exists
      if (!fs.existsSync(this.templatesDir)) {
        logError('Templates directory does not exist', 'EmailService');
        return;
      }

      // Find all directory structure recursively
      const count = this.scanTemplateDirectory(this.templatesDir, '');
      logInfo(`LOADED ${count} EMAIL TEMPLATES`, 'EmailService');
    } catch (error) {
      logError('Failed to load email templates', 'EmailService', error);
    }
  }

  /**
   * Recursively scan template directory to find all HTML templates
   * @param {string} dir - Current directory to scan
   * @param {string} prefix - Path prefix for template key
   */
  scanTemplateDirectory(dir, prefix) {
    const items = fs.readdirSync(dir);
    let loadedCount = 0;
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory() && item !== 'css') {
        // It's a directory (and not the CSS directory), scan recursively
        const newPrefix = prefix ? `${prefix}/${item}` : item;
        loadedCount += this.scanTemplateDirectory(itemPath, newPrefix);
      } else if (stats.isFile() && item.endsWith('.html')) {
        // It's an HTML template file
        const templateName = path.basename(item, '.html');
        const templateKey = prefix ? `${prefix}/${templateName}` : templateName;
        
        // Read the template file
        this.templates[templateKey] = fs.readFileSync(itemPath, 'utf8');
        loadedCount++;
      }
    }
    return loadedCount;
  }

  /**
   * Render a template with provided data
   * @param {string} templateKey - Template key (e.g., 'Auth/verification')
   * @param {Object} data - Data to inject into the template
   * @returns {string} - Rendered HTML content
   */
  renderTemplate(templateKey, data = {}) {
    try {
      // Check if template exists
      if (!this.templates[templateKey]) {
        logError(`Template not found: ${templateKey}`, 'EmailService');
        return this.renderFallback(data);
      }

      // Add common variables
      const templateData = {
        ...data,
        year: new Date().getFullYear(),
        appName: process.env.APP_NAME || 'DeynCare',
        baseUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
      };

      // Replace all {{variable}} occurrences with actual data
      let renderedTemplate = this.templates[templateKey];
      renderedTemplate = renderedTemplate.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return templateData[key] !== undefined ? templateData[key] : match;
      });

      return renderedTemplate;
    } catch (error) {
      logError(`Failed to render template: ${templateKey}`, 'EmailService', error);
      return this.renderFallback(data);
    }
  }

  /**
   * Simple fallback template when main template fails
   * @param {Object} data - Template data
   * @returns {string} - Basic HTML email
   */
  renderFallback(data = {}) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${data.subject || 'DeynCare Notification'}</title>
      </head>
      <body>
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h1 style="color: #2e86de;">${data.title || 'DeynCare'}</h1>
          <p>Hello ${data.fullName || 'there'},</p>
          <p>${data.message || 'This is a notification from DeynCare.'}</p>
          ${data.actionUrl ? `<p><a href="${data.actionUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2e86de; color: white; text-decoration: none; border-radius: 4px;">Click Here</a></p>` : ''}
          <p>Best regards,<br>The DeynCare Team</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">&copy; ${new Date().getFullYear()} DeynCare. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send verification code email
   * @param {string} to - Recipient email
   * @param {string} code - Verification code
   * @param {string} name - Recipient name
   * @returns {Promise<boolean>} - Success status
   */
  async sendVerificationEmail(to, code, name = '') {
    try {
      const data = {
        fullName: name || to,
        verificationCode: code,
        subject: 'Email Verification'
      };
      
      // Render email template
      const html = this.renderTemplate('Auth/verification', data);
      
      // Send the email
      return await this.sendMail(to, 'Verify Your Email Address', html);
    } catch (error) {
      logError(`Failed to send verification email to ${to}`, 'EmailService', error);
      throw new AppError('Failed to send verification email', 500, 'email_error');
    }
  }

  /**
   * Send password reset email
   * @param {string} to - Recipient email
   * @param {string} resetToken - Reset token
   * @param {string} name - Recipient name
   * @returns {Promise<boolean>} - Success status
   */
  async sendPasswordResetEmail(to, resetToken, name = '') {
    try {
      // Generate reset URL
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      
      const data = {
        fullName: name || to,
        resetUrl,
        subject: 'Password Reset Request'
      };
      
      // Render email template
      const html = this.renderTemplate('Auth/password-reset', data);
      
      // Send the email
      return await this.sendMail(to, 'Reset Your Password', html);
    } catch (error) {
      logError(`Failed to send password reset email to ${to}`, 'EmailService', error);
      throw new AppError('Failed to send password reset email', 500, 'email_error');
    }
  }

  /**
   * Send welcome email after account creation
   * @param {string} to - Recipient email
   * @param {Object} data - User and shop data
   * @returns {Promise<boolean>} - Success status
   */
  async sendWelcomeEmail(to, data) {
    try {
      // Set template data
      const templateData = {
        fullName: data.fullName || to,
        shopName: data.shopName || 'Your Business',
        loginUrl: `${process.env.FRONTEND_URL}/login`,
        subject: 'Welcome to DeynCare'
      };
      
      // Render email template
      const html = this.renderTemplate('Auth/welcome', templateData);
      
      // Send the email
      return await this.sendMail(to, 'Welcome to DeynCare', html);
    } catch (error) {
      logError(`Failed to send welcome email to ${to}`, 'EmailService', error);
      throw new AppError('Failed to send welcome email', 500, 'email_error');
    }
  }

  /**
   * Send account suspension notification email
   * @param {string} to - Recipient email
   * @param {Object} data - Email data containing name, reason, and contactEmail
   * @returns {Promise<boolean>} - Success status
   */
  async sendAccountSuspensionEmail(to, data) {
    try {
      // Required data validation
      if (!data.name) {
        logError('Missing name for suspension email', 'EmailService');
        data.name = 'User';
      }

      if (!data.reason) {
        logError('Missing suspension reason for email', 'EmailService');
        data.reason = 'Policy violation';
      }
      
      // Set defaults for any missing fields
      const templateData = {
        name: data.name,
        reason: data.reason,
        contactEmail: data.contactEmail || 'support@deyncare.com',
        suspensionDate: new Date().toLocaleDateString(),
        subject: 'Your Account Has Been Suspended'
      };
      
      // Render email template
      const html = this.renderTemplate('Admin/account-suspension', templateData);
      
      // Send the email
      return await this.sendMail(to, 'Your Account Has Been Suspended', html);
    } catch (error) {
      logError(`Failed to send account suspension email to ${to}`, 'EmailService', error);
      throw new AppError('Failed to send suspension notification', 500, 'email_error');
    }
  }
}

// Export a singleton instance
module.exports = new EmailService();
