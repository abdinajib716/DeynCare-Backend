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
