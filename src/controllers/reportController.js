const ReportService = require('../services/reportService');
const ShopService = require('../services/shopService');

// Import utility modules
const { 
  // Core utilities
  AppError, 
  
  // Helper utilities
  ResponseHelper,
  LogHelper,
  
  // Logger utilities
  logInfo,
  logSuccess,
  logWarning,
  logError
} = require('../utils');

/**
 * Report controller for handling all report-related operations
 */
const ReportController = {
  /**
   * Generate a new report
   * POST /api/reports
   * Requires authentication
   */
  generateReport: async (req, res, next) => {
    try {
      const reportData = req.validatedData || req.body;
      const { userId, role, shopId } = req.user;
      
      // Set default values
      reportData.createdBy = userId;
      
      // If user is not superAdmin, restrict to their shop
      if (role !== 'superAdmin') {
        reportData.shopId = shopId;
      } else if (!reportData.shopId) {
        return next(new AppError('Shop ID is required for report generation', 400, 'missing_shop_id'));
      }
      
      // Verify shop exists
      try {
        const shop = await ShopService.getShopById(reportData.shopId);
        if (!shop) {
          return next(new AppError('Shop not found', 404, 'shop_not_found'));
        }
      } catch (error) {
        return next(new AppError('Failed to verify shop', 500, 'shop_verification_error'));
      }
      
      // Generate the report
      const report = await ReportService.generateReport(reportData);
      
      // Create audit log
      await LogHelper.createAdminLog('report_generated', {
        actorId: userId,
        actorRole: role,
        shopId: reportData.shopId,
        details: {
          reportId: report.reportId,
          reportType: report.type
        }
      });
      
      return ResponseHelper.success(
        res, 
        'Report generated successfully', 
        { report }, 
        201
      );
    } catch (error) {
      logError('Error generating report', 'ReportController', error);
      return next(error);
    }
  },
  
  /**
   * Get report by ID
   * GET /api/reports/:reportId
   * Requires authentication
   */
  getReportById: async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const { userId, role, shopId } = req.user;
      
      // Set authorization options
      const options = {
        role,
        shopId: role !== 'superAdmin' ? shopId : undefined
      };
      
      // Get the report
      const report = await ReportService.getReportById(reportId, options);
      
      // Create audit log
      await LogHelper.createAdminLog('report_viewed', {
        actorId: userId,
        actorRole: role,
        shopId: report.shopId,
        details: {
          reportId: report.reportId,
          reportType: report.type
        }
      });
      
      return ResponseHelper.success(
        res, 
        'Report retrieved successfully', 
        { report }
      );
    } catch (error) {
      logError(`Error retrieving report ${req.params.reportId}`, 'ReportController', error);
      return next(error);
    }
  },
  
  /**
   * Get reports by shop
   * GET /api/reports/shop/:shopId
   * Requires authentication and appropriate authorization
   */
  getReportsByShop: async (req, res, next) => {
    try {
      const { shopId } = req.params;
      const { userId, role, shopId: userShopId } = req.user;
      
      // Check authorization
      if (role !== 'superAdmin' && shopId !== userShopId) {
        return next(new AppError('You do not have permission to view reports for this shop', 403, 'forbidden'));
      }
      
      // Get the reports
      const result = await ReportService.getReportsByShop(shopId, req.query);
      
      // Create audit log
      await LogHelper.createAdminLog('shop_reports_viewed', {
        actorId: userId,
        actorRole: role,
        shopId,
        details: {
          filters: req.query
        }
      });
      
      return ResponseHelper.success(
        res, 
        'Reports retrieved successfully', 
        { 
          reports: result.items,
          pagination: result.pagination
        }
      );
    } catch (error) {
      logError(`Error retrieving reports for shop ${req.params.shopId}`, 'ReportController', error);
      return next(error);
    }
  },
  
  /**
   * Get all reports (SuperAdmin only)
   * GET /api/reports
   * Requires authentication and superAdmin authorization
   */
  getAllReports: async (req, res, next) => {
    try {
      const { userId, role } = req.user;
      
      // Only superAdmin can access this endpoint
      if (role !== 'superAdmin') {
        return next(new AppError('You do not have permission to access this resource', 403, 'forbidden'));
      }
      
      // Get all reports
      const result = await ReportService.getAllReports(req.query);
      
      // Create audit log
      await LogHelper.createAdminLog('all_reports_viewed', {
        actorId: userId,
        actorRole: role,
        details: {
          filters: req.query
        }
      });
      
      return ResponseHelper.success(
        res, 
        'Reports retrieved successfully', 
        { 
          reports: result.items,
          pagination: result.pagination
        }
      );
    } catch (error) {
      logError('Error retrieving all reports', 'ReportController', error);
      return next(error);
    }
  },
  
  /**
   * Delete a report
   * DELETE /api/reports/:reportId
   * Requires authentication and appropriate authorization
   */
  deleteReport: async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const { userId, role, shopId } = req.user;
      
      // Set authorization options
      const options = {
        role,
        shopId: role !== 'superAdmin' ? shopId : undefined
      };
      
      // Get the report first to check authorization
      const report = await ReportService.getReportById(reportId, options);
      
      // Delete the report
      await ReportService.deleteReport(reportId, options);
      
      // Create audit log
      await LogHelper.createAdminLog('report_deleted', {
        actorId: userId,
        actorRole: role,
        shopId: report.shopId,
        details: {
          reportId: report.reportId,
          reportType: report.type
        }
      });
      
      return ResponseHelper.success(
        res, 
        'Report deleted successfully'
      );
    } catch (error) {
      logError(`Error deleting report ${req.params.reportId}`, 'ReportController', error);
      return next(error);
    }
  },
  
  /**
   * Get report statistics (SuperAdmin only)
   * GET /api/reports/statistics
   * Requires authentication and superAdmin authorization
   */
  getReportStatistics: async (req, res, next) => {
    try {
      const { userId, role } = req.user;
      
      // Only superAdmin can access this endpoint
      if (role !== 'superAdmin') {
        return next(new AppError('You do not have permission to access this resource', 403, 'forbidden'));
      }
      
      // Get report statistics
      const statistics = await ReportService.getReportStatistics();
      
      // Create audit log
      await LogHelper.createAdminLog('report_statistics_viewed', {
        actorId: userId,
        actorRole: role
      });
      
      return ResponseHelper.success(
        res, 
        'Report statistics retrieved successfully', 
        { statistics }
      );
    } catch (error) {
      logError('Error retrieving report statistics', 'ReportController', error);
      return next(error);
    }
  },
  
  /**
   * Generate a system-wide report (SuperAdmin only)
   * POST /api/reports/system
   * Requires authentication and superAdmin authorization
   */
  generateSystemReport: async (req, res, next) => {
    try {
      const { userId, role } = req.user;
      
      // Only superAdmin can access this endpoint
      if (role !== 'superAdmin') {
        return next(new AppError('You do not have permission to access this resource', 403, 'forbidden'));
      }
      
      const parameters = req.validatedData || req.body;
      
      // Set created by
      parameters.createdBy = userId;
      
      // Generate the system report
      const report = await ReportService.generateSystemReport(parameters);
      
      // Create audit log
      await LogHelper.createAdminLog('system_report_generated', {
        actorId: userId,
        actorRole: role,
        details: {
          reportId: report.reportId,
          reportType: report.type
        }
      });
      
      return ResponseHelper.success(
        res, 
        'System report generated successfully', 
        { report }, 
        201
      );
    } catch (error) {
      logError('Error generating system report', 'ReportController', error);
      return next(error);
    }
  },
  
  /**
   * Email a report to specified recipients
   * POST /api/reports/:reportId/email
   * Requires authentication
   */
  emailReport: async (req, res, next) => {
    try {
      const { reportId } = req.params;
      const emailData = req.validatedData || req.body;
      const { userId, role, shopId } = req.user;
      
      // Set authorization options
      const options = {
        role,
        shopId: role !== 'superAdmin' ? shopId : undefined
      };
      
      // Verify the report exists and user has access to it
      try {
        await ReportService.getReportById(reportId, options);
      } catch (error) {
        return next(error);
      }
      
      // Send the email
      const result = await ReportService.emailReport(reportId, emailData, options);
      
      // Create audit log
      await LogHelper.createAdminLog('report_emailed', {
        actorId: userId,
        actorRole: role,
        shopId: role !== 'superAdmin' ? shopId : null,
        details: {
          reportId,
          recipients: emailData.recipients,
          subject: emailData.subject
        }
      });
      
      return ResponseHelper.success(
        res, 
        'Report emailed successfully',
        { result }
      );
    } catch (error) {
      logError(`Error emailing report ${req.params.reportId}`, 'ReportController', error);
      return next(error);
    }
  },
  
  /**
   * Schedule periodic report generation and delivery
   * POST /api/reports/schedule
   * Requires authentication and superAdmin role for system-wide reports
   */
  scheduleReportDelivery: async (req, res, next) => {
    try {
      const scheduleData = req.validatedData || req.body;
      const { userId, role, shopId } = req.user;
      
      // Set authorization options
      const options = {
        role,
        shopId: role !== 'superAdmin' ? shopId : undefined
      };
      
      // Schedule the report delivery
      const result = await ReportService.scheduleReportDelivery(scheduleData, options);
      
      // Create audit log
      await LogHelper.createAdminLog('report_delivery_scheduled', {
        actorId: userId,
        actorRole: role,
        shopId: role !== 'superAdmin' ? shopId : scheduleData.shopId,
        details: {
          scheduleId: result.schedule.id,
          frequency: scheduleData.frequency,
          reportType: scheduleData.reportType
        }
      });
      
      return ResponseHelper.success(
        res, 
        'Report delivery scheduled successfully',
        { schedule: result.schedule }
      );
    } catch (error) {
      logError('Error scheduling report delivery', 'ReportController', error);
      return next(error);
    }
  }
};

module.exports = ReportController;
