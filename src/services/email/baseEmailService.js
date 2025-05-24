const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const { logInfo, logError, logSuccess } = require('../../utils/logger');
const AppError = require('../../utils/core/AppError');

/**
 * Base Email Service class for handling transactional emails and template rendering
 */
class BaseEmailService {
  constructor() {
    // Email transport settings
    this.transporter = null;
    this.initialized = false;
    this.sender = '';
    
    // Template settings
    this.templatesDir = path.join(__dirname, '../../templates/emails');
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
      // Log email configuration (without sensitive data)
      logInfo(`Initializing email service with host: ${process.env.EMAIL_HOST}, port: ${process.env.EMAIL_PORT}, user: ${process.env.EMAIL_USER}`, 'BaseEmailService');
      
      // Create a transporter with email settings from env
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: parseInt(process.env.EMAIL_PORT) === 465, // Secure if port is 465
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        // Add debug option if in development
        debug: process.env.NODE_ENV === 'development',
        logger: process.env.NODE_ENV === 'development'
      });

      this.sender = process.env.EMAIL_FROM || 'support@deyncare.com';
      this.initialized = true;
      logSuccess('Email service initialized successfully', 'BaseEmailService');
    } catch (error) {
      logError('Failed to initialize email service', 'BaseEmailService', error);
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
    // Always reinitialize the transporter to ensure fresh credentials
    this.init();
    if (!this.initialized) {
      throw new AppError('Email service is not available', 500, 'service_unavailable');
    }
    
    // Log email attempt
    logInfo(`Attempting to send email to ${to} with subject: ${subject}`, 'BaseEmailService');

    try {
      const mailOptions = {
        from: this.sender,
        to,
        subject,
        html
      };

      await this.transporter.sendMail(mailOptions);
      logInfo(`Email sent to ${to}`, 'BaseEmailService');
      return true;
    } catch (error) {
      logError(`Failed to send email to ${to}`, 'BaseEmailService', error);
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
        logError('Templates directory does not exist', 'BaseEmailService');
        return;
      }

      // Find all directory structure recursively
      const count = this.scanTemplateDirectory(this.templatesDir, '');
      logInfo(`LOADED ${count} EMAIL TEMPLATES`, 'BaseEmailService');
    } catch (error) {
      logError('Failed to load email templates', 'BaseEmailService', error);
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
      // Log the template loading attempt
      console.log(`[BaseEmailService] Attempting to render template: '${templateKey}'`);
      console.log(`[BaseEmailService] Available templates: ${Object.keys(this.templates).join(', ')}`);
      
      // Check if we need to reload templates (in case they were added or modified)
      if (Object.keys(this.templates).length === 0) {
        console.log('[BaseEmailService] No templates loaded, reloading templates...');
        this.loadTemplates();
      }
      
      // Check if template exists
      if (!this.templates[templateKey]) {
        // Try case-insensitive match as a fallback
        const lowerCaseKey = templateKey.toLowerCase();
        const availableKeys = Object.keys(this.templates);
        const matchingKey = availableKeys.find(key => key.toLowerCase() === lowerCaseKey);
        
        if (matchingKey) {
          console.log(`[BaseEmailService] Found template with case-insensitive match: '${matchingKey}'`);
          templateKey = matchingKey;
        } else {
          // Last resort: try to load it directly from the file system
          try {
            const templatePath = path.join(this.templatesDir, `${templateKey}.html`);
            console.log(`[BaseEmailService] Attempting to load template directly from: ${templatePath}`);
            
            if (fs.existsSync(templatePath)) {
              this.templates[templateKey] = fs.readFileSync(templatePath, 'utf8');
              console.log(`[BaseEmailService] Successfully loaded template directly: ${templateKey}`);
            } else {
              logError(`Template file not found: ${templatePath}`, 'BaseEmailService');
              return this.renderFallback(data);
            }
          } catch (fsError) {
            console.error(`[BaseEmailService] Failed to load template directly: ${fsError.message}`);
            logError(`Template not found: ${templateKey}`, 'BaseEmailService');
            return this.renderFallback(data);
          }
        }
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
      logError(`Failed to render template: ${templateKey}`, 'BaseEmailService', error);
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
   * Verify SMTP connection
   * @returns {Promise<boolean>} - Connection status
   */
  async verifyConnection() {
    if (!this.initialized) {
      this.init();
    }

    try {
      await this.transporter.verify();
      logInfo('Email service connection verified successfully', 'BaseEmailService');
      return true;
    } catch (error) {
      logError('Email service connection verification failed', 'BaseEmailService', error);
      return false;
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
    // Always reinitialize the transporter to ensure fresh credentials
    this.init();
    if (!this.initialized) {
      throw new AppError('Email service is not available', 500, 'service_unavailable');
    }
    
    // Log detailed email attempt
    const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;
    logInfo(`Attempting to send template email to ${to} with template: ${options.template}`, 'BaseEmailService');

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
      
      logSuccess(`Email sent to ${mailOptions.to}`, 'BaseEmailService');
      return true;
    } catch (error) {
      logError(`Failed to send email: ${error.message}`, 'BaseEmailService', error);
      throw new AppError('Failed to send email', 500, 'email_error');
    }
  }
}

module.exports = BaseEmailService;
