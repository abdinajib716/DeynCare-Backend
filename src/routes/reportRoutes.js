const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validate, validateQuery } = require('../middleware/validationMiddleware');
const { reportSchemas } = require('../validations');

const router = express.Router();

/**
 * Report Routes
 * Base path: /api/reports
 */

// Get all reports (SuperAdmin only)
router.get(
  '/',
  authenticate,
  authorize(['superAdmin']),
  validateQuery(reportSchemas.listReportsQuery),
  reportController.getAllReports
);

// Generate a new report
router.post(
  '/',
  authenticate,
  authorize(['superAdmin', 'admin']),
  validate(reportSchemas.generateReport),
  reportController.generateReport
);

// Get report statistics (SuperAdmin only)
router.get(
  '/statistics',
  authenticate,
  authorize(['superAdmin']),
  reportController.getReportStatistics
);

// Generate a system-wide report (SuperAdmin only)
router.post(
  '/system',
  authenticate,
  authorize(['superAdmin']),
  validate(reportSchemas.generateSystemReport),
  reportController.generateSystemReport
);

// Schedule periodic report delivery
router.post(
  '/schedule',
  authenticate,
  authorize(['superAdmin', 'admin']),
  validate(reportSchemas.scheduleReportDelivery),
  reportController.scheduleReportDelivery
);

// Get reports by shop
router.get(
  '/shop/:shopId',
  authenticate,
  authorize(['superAdmin', 'admin']),
  validateQuery(reportSchemas.listReportsQuery),
  reportController.getReportsByShop
);

// Get report by ID
router.get(
  '/:reportId',
  authenticate,
  authorize(['superAdmin', 'admin']),
  reportController.getReportById
);

// Email a report
router.post(
  '/:reportId/email',
  authenticate,
  authorize(['superAdmin', 'admin']),
  validate(reportSchemas.emailReport),
  reportController.emailReport
);

// Delete a report
router.delete(
  '/:reportId',
  authenticate,
  authorize(['superAdmin', 'admin']),
  reportController.deleteReport
);

module.exports = router;
