const { Report } = require('../models');
const { generateId } = require('../utils/generators/idGenerator');
const EmailService = require('./emailService');
const ShopService = require('./shopService');
const fs = require('fs').promises;
const path = require('path');

// Import utility modules
const { 
  // Core utilities
  AppError, 
  
  // Helper utilities
  ResponseHelper,
  LogHelper,
  PaginationHelper,
  
  // Logger utilities
  logSuccess,
  logError,
  logWarning,
  logInfo
} = require('../utils');

/**
 * Service for report-related operations
 */
const ReportService = {
  /**
   * Generate a new report
   * @param {Object} reportData - Data for the new report
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Generated report
   */
  generateReport: async (reportData, options = {}) => {
    try {
      const { 
        shopId, 
        title, 
        type, 
        format, 
        description = '',
        parameters = {},
        createdBy,
        url = '' // In a real implementation, this would be generated
      } = reportData;

      // Validate required fields
      if (!shopId || !title || !type || !format || !createdBy) {
        throw new AppError('Missing required fields', 400, 'missing_fields');
      }

      // Generate a report ID
      const reportId = generateId('rep');
      
      // In a real implementation, you would generate the actual report file here
      // and store it in a file service (e.g., S3, Google Cloud Storage)
      // For now, we'll just create a placeholder URL
      const generatedUrl = url || `https://storage.example.com/reports/${reportId}.${format}`;

      // Create the report in the database
      const report = new Report({
        reportId,
        shopId,
        title,
        type,
        format,
        url: generatedUrl,
        description,
        parameters,
        createdBy
      });

      await report.save();

      // Log report creation
      logSuccess(`Report generated: ${reportId}`, 'ReportService');

      return report;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError('Report generation failed', 'ReportService', error);
      throw new AppError('Failed to generate report', 500, 'report_generation_error');
    }
  },

  /**
   * Get report by ID
   * @param {string} reportId - ID of the report to retrieve
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Report object
   */
  getReportById: async (reportId, options = {}) => {
    try {
      // Find report by ID
      const report = await Report.findOne({ 
        reportId, 
        isDeleted: false 
      });

      if (!report) {
        throw new AppError('Report not found', 404, 'report_not_found');
      }

      // Check authorization if specified
      if (options.shopId && report.shopId !== options.shopId && options.role !== 'superAdmin') {
        throw new AppError('You do not have permission to access this report', 403, 'forbidden');
      }

      return report;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Error retrieving report ${reportId}`, 'ReportService', error);
      throw new AppError('Failed to retrieve report', 500, 'report_fetch_error');
    }
  },

  /**
   * Get reports by shop ID
   * @param {string} shopId - Shop ID to list reports for
   * @param {Object} query - Query parameters
   * @returns {Promise<Object>} Reports with pagination
   */
  getReportsByShop: async (shopId, query = {}) => {
    try {
      // Build filter
      const filter = { 
        shopId, 
        isDeleted: false 
      };

      // Add type filter if provided
      if (query.type) {
        filter.type = query.type;
      }

      // Add format filter if provided
      if (query.format) {
        filter.format = query.format;
      }

      // Add date range filter if provided
      if (query.startDate || query.endDate) {
        filter.generatedAt = {};
        
        if (query.startDate) {
          filter.generatedAt.$gte = new Date(query.startDate);
        }
        
        if (query.endDate) {
          filter.generatedAt.$lte = new Date(query.endDate);
        }
      }

      // Get pagination options
      const options = PaginationHelper.getPaginationOptions(query);
      
      // Default sort by generation date (newest first)
      options.sort = options.sort || { generatedAt: -1 };

      // Get paginated reports
      const reports = await PaginationHelper.paginate(Report, filter, options);

      return reports;
    } catch (error) {
      logError(`Error listing reports for shop ${shopId}`, 'ReportService', error);
      throw new AppError('Failed to list reports', 500, 'report_list_error');
    }
  },

  /**
   * Get all reports (SuperAdmin only)
   * @param {Object} query - Query parameters
   * @returns {Promise<Object>} Reports with pagination
   */
  getAllReports: async (query = {}) => {
    try {
      // Build filter
      const filter = { 
        isDeleted: false 
      };

      // Add shop filter if provided
      if (query.shopId) {
        filter.shopId = query.shopId;
      }

      // Add type filter if provided
      if (query.type) {
        filter.type = query.type;
      }

      // Add format filter if provided
      if (query.format) {
        filter.format = query.format;
      }

      // Add date range filter if provided
      if (query.startDate || query.endDate) {
        filter.generatedAt = {};
        
        if (query.startDate) {
          filter.generatedAt.$gte = new Date(query.startDate);
        }
        
        if (query.endDate) {
          filter.generatedAt.$lte = new Date(query.endDate);
        }
      }

      // Add search filter if provided
      if (query.search) {
        filter.$or = [
          { title: { $regex: query.search, $options: 'i' } },
          { description: { $regex: query.search, $options: 'i' } }
        ];
      }

      // Get pagination options
      const options = PaginationHelper.getPaginationOptions(query);
      
      // Default sort by generation date (newest first)
      options.sort = options.sort || { generatedAt: -1 };

      // Get paginated reports
      const reports = await PaginationHelper.paginate(Report, filter, options);

      return reports;
    } catch (error) {
      logError('Error listing all reports', 'ReportService', error);
      throw new AppError('Failed to list reports', 500, 'report_list_error');
    }
  },

  /**
   * Delete a report
   * @param {string} reportId - ID of the report to delete
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Success result
   */
  deleteReport: async (reportId, options = {}) => {
    try {
      // Find report by ID
      const report = await Report.findOne({ reportId });

      if (!report) {
        throw new AppError('Report not found', 404, 'report_not_found');
      }

      // Check authorization if specified
      if (options.shopId && report.shopId !== options.shopId && options.role !== 'superAdmin') {
        throw new AppError('You do not have permission to delete this report', 403, 'forbidden');
      }

      // Soft delete the report
      report.isDeleted = true;
      report.deletedAt = new Date();
      await report.save();

      // In a real implementation, you might want to handle the actual file deletion
      // from your storage service (with a delay or retention policy)

      // Log report deletion
      logSuccess(`Report deleted: ${reportId}`, 'ReportService');

      return { success: true, message: 'Report deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Error deleting report ${reportId}`, 'ReportService', error);
      throw new AppError('Failed to delete report', 500, 'report_deletion_error');
    }
  },

  /**
   * Get report statistics (SuperAdmin only)
   * @returns {Promise<Object>} Report statistics
   */
  getReportStatistics: async () => {
    try {
      // Get total reports count
      const totalReports = await Report.countDocuments({ isDeleted: false });

      // Get reports by type
      const reportsByType = await Report.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]);

      // Get reports by format
      const reportsByFormat = await Report.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$format', count: { $sum: 1 } } }
      ]);

      // Get reports by shop (top 10)
      const reportsByShop = await Report.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$shopId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      // Get reports generated over time (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const reportsByDay = await Report.aggregate([
        { 
          $match: { 
            isDeleted: false,
            generatedAt: { $gte: thirtyDaysAgo }
          } 
        },
        { 
          $group: { 
            _id: { 
              $dateToString: { format: '%Y-%m-%d', date: '$generatedAt' } 
            }, 
            count: { $sum: 1 } 
          } 
        },
        { $sort: { _id: 1 } }
      ]);

      return {
        totalReports,
        reportsByType,
        reportsByFormat,
        reportsByShop,
        reportsByDay
      };
    } catch (error) {
      logError('Error getting report statistics', 'ReportService', error);
      throw new AppError('Failed to get report statistics', 500, 'report_stats_error');
    }
  },

  /**
   * Generate a system-wide report (SuperAdmin only)
   * This is a placeholder for the actual implementation
   * @param {Object} parameters - Report parameters
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Generated report
   */
  generateSystemReport: async (parameters, options = {}) => {
    try {
      const {
        title,
        type,
        format,
        description = '',
        startDate,
        endDate,
        createdBy
      } = parameters;

      // Validate required fields
      if (!title || !type || !format || !createdBy) {
        throw new AppError('Missing required fields', 400, 'missing_fields');
      }

      // Generate a report ID
      const reportId = generateId('rep');
      
      // In a real implementation, you would generate the actual system-wide report
      // by aggregating data across all shops
      // For now, we'll just create a placeholder
      const generatedUrl = `https://storage.example.com/system-reports/${reportId}.${format}`;

      // Create the report in the database
      const report = new Report({
        reportId,
        shopId: 'system', // Special identifier for system-wide reports
        title,
        type,
        format,
        url: generatedUrl,
        description,
        parameters: {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          filters: parameters.filters || {}
        },
        createdBy
      });

      await report.save();

      // Log report creation
      logSuccess(`System report generated: ${reportId}`, 'ReportService');

      return report;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError('System report generation failed', 'ReportService', error);
      throw new AppError('Failed to generate system report', 500, 'system_report_error');
    }
  },

  /**
   * Email a report to specified recipients
   * @param {string} reportId - ID of the report to email
   * @param {Object} emailData - Email configuration
   * @param {Array<string>} emailData.recipients - List of recipient email addresses
   * @param {string} emailData.subject - Email subject line
   * @param {string} emailData.message - Optional message to include
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Success result
   */
  emailReport: async (reportId, emailData, options = {}) => {
    try {
      // Get the report
      const report = await ReportService.getReportById(reportId, options);
      
      if (!report) {
        throw new AppError('Report not found', 404, 'report_not_found');
      }
      
      // Validate email recipients if user is not superAdmin
      if (options.role !== 'superAdmin' && options.shopId) {
        // For future implementation: validate that recipients are authorized
        // This might involve checking if recipients are users of the shop
        // or registered customers
      }
      
      // Get shop name if available
      let shopName = '';
      if (report.shopId !== 'system') {
        try {
          const shop = await ShopService.getShopById(report.shopId);
          shopName = shop ? shop.name : '';
        } catch (error) {
          logWarning(`Could not get shop name for shop ${report.shopId}`, 'ReportService');
        }
      }
      
      // Prepare data for email template
      const templateData = {
        reportTitle: report.title,
        reportType: report.type,
        reportFormat: report.format,
        generatedAt: new Date(report.generatedAt).toLocaleString(),
        shopName: shopName,
        message: emailData.message || '',
        dashboardUrl: process.env.FRONTEND_URL + '/dashboard/reports',
        currentYear: new Date().getFullYear()
      };
      
      // Get file content from the report URL
      // In a real implementation, this would retrieve the file from a storage service
      // For now, we'll use a placeholder approach
      let fileContent;
      try {
        // If the file is stored locally (for development)
        if (report.url.startsWith('file://')) {
          const filePath = report.url.replace('file://', '');
          fileContent = await fs.readFile(filePath);
        } else {
          // In production, this would fetch from S3, Google Cloud Storage, etc.
          // Mocked for now
          fileContent = Buffer.from('Mocked report content for ' + report.title);
          logWarning('Using mocked report content. Implement actual file retrieval in production.', 'ReportService');
        }
      } catch (error) {
        logError(`Error retrieving report file: ${error.message}`, 'ReportService');
        throw new AppError('Could not retrieve report file', 500, 'file_retrieval_error');
      }
      
      // Determine file mime type based on format
      const mimeTypes = {
        pdf: 'application/pdf',
        csv: 'text/csv',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
      
      const mimeType = mimeTypes[report.format] || 'application/octet-stream';
      
      // Send email with attachment
      await EmailService.report.sendReportDeliveryEmail({
        to: emailData.recipients,
        subject: emailData.subject || `${report.title} - DeynCare Report`,
        template: 'Report/report-delivery',
        data: templateData,
        attachments: [
          {
            filename: `${report.title}.${report.format}`,
            content: fileContent,
            contentType: mimeType
          }
        ]
      });
      
      // Log email sent
      logSuccess(`Report ${reportId} emailed to ${emailData.recipients.join(', ')}`, 'ReportService');
      
      return { success: true, message: 'Report emailed successfully' };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError(`Error emailing report ${reportId}`, 'ReportService', error);
      throw new AppError('Failed to email report', 500, 'report_email_error');
    }
  },
  
  /**
   * Schedule periodic report generation and delivery
   * This is a placeholder for the actual implementation
   * SuperAdmin only
   * @param {Object} scheduledReport - Scheduled report configuration
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Created schedule configuration
   */
  scheduleReportDelivery: async (scheduledReport, options = {}) => {
    try {
      // Validate that only superAdmin can schedule system-wide reports
      if (scheduledReport.isSystemWide && options.role !== 'superAdmin') {
        throw new AppError('Only SuperAdmin can schedule system-wide reports', 403, 'forbidden');
      }
      
      // If user is not superAdmin, restrict to their shop
      if (options.role !== 'superAdmin') {
        scheduledReport.shopId = options.shopId;
      }
      
      // In a real implementation, this would create a schedule in a job queue
      // such as Bull, Agenda, or node-schedule
      // For now, we'll just log the intent
      logInfo(`Scheduled report delivery created: ${JSON.stringify(scheduledReport)}`, 'ReportService');
      
      return {
        success: true,
        message: 'Report delivery scheduled successfully',
        schedule: {
          ...scheduledReport,
          id: generateId('sch'),
          createdAt: new Date()
        }
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logError('Error scheduling report delivery', 'ReportService', error);
      throw new AppError('Failed to schedule report delivery', 500, 'schedule_error');
    }
  }
};

module.exports = ReportService;
