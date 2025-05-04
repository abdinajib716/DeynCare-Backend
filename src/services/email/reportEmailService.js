const BaseEmailService = require('./baseEmailService');
const { logInfo, logError } = require('../../utils/logger');
const AppError = require('../../utils/core/AppError');

/**
 * Email service for sending report-related emails
 */
class ReportEmailService extends BaseEmailService {
  /**
   * Send report delivery email
   * @param {Object} data - Email data containing user info, report type, and report period
   * @param {Buffer|string} reportAttachment - The report file as buffer or path to file
   * @returns {Promise<boolean>} - Success status
   */
  async sendReportDeliveryEmail(data, reportAttachment) {
    try {
      const { email, fullName, reportType, period } = data;
      
      // Prepare template data
      const templateData = {
        fullName: fullName || 'User',
        reportType: reportType || 'Sales Report',
        reportPeriod: period || 'Current Month',
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/reports`
      };

      // Prepare attachment
      const attachments = [];
      if (reportAttachment) {
        const filename = `${reportType.replace(/\s+/g, '-').toLowerCase()}-${period.replace(/\s+/g, '-').toLowerCase()}.pdf`;
        
        attachments.push({
          filename,
          content: reportAttachment,
          contentType: 'application/pdf'
        });
      }

      // Send the email with attachment
      return await this.sendEmail({
        to: email,
        subject: `Your ${reportType} for ${period} is Ready`,
        template: 'Report/report-delivery',
        data: templateData,
        attachments
      });
    } catch (error) {
      logError(`Failed to send report delivery email to ${data?.email}`, 'ReportEmailService', error);
      throw new AppError('Failed to send report email', 500, 'email_error');
    }
  }
}

module.exports = new ReportEmailService();
