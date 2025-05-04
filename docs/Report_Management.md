# DeynCare Report Management System

This document outlines the Report Management system implemented in DeynCare, covering both backend and frontend requirements, with a focus on SuperAdmin and Admin roles.

## Overview

The Report Management system allows users to generate, view, and manage various types of reports that provide insights into shop operations, customer debt, sales performance, and risk analysis. 

## Backend Implementation

### Data Model

The Report model (`report.model.js`) includes:

- **Core Fields**:
  - `reportId`: Unique identifier for each report
  - `shopId`: Shop associated with the report, or 'system' for system-wide reports
  - `title`: Report title
  - `type`: Report category (debt, sales, ml-risk, pos-profit)
  - `format`: Output format (pdf, csv, excel)
  - `url`: Location of the generated report file
  
- **Metadata**:
  - `description`: Additional details about the report
  - `parameters`: Report configuration (date range, filters)
  - `createdBy`: User who generated the report
  - `generatedAt`: Timestamp of report generation
  - `isDeleted`: Soft delete flag
  - `deletedAt`: Soft delete timestamp

### Service Layer

The Report Service (`reportService.js`) provides methods for:

- **Report Generation**:
  - `generateReport()`: Create a new report for a specific shop
  - `generateSystemReport()`: Create a system-wide report (SuperAdmin only)
  
- **Report Retrieval**:
  - `getReportById()`: Get a specific report by ID
  - `getReportsByShop()`: Get reports for a specific shop
  - `getAllReports()`: Get all reports across all shops (SuperAdmin only)
  
- **Report Management**:
  - `deleteReport()`: Soft delete a report
  - `getReportStatistics()`: Get system-wide report usage metrics (SuperAdmin only)

### API Endpoints

The Report Routes (`reportRoutes.js`) define these endpoints:

| Method | Endpoint                 | Description                        | Access Control     |
|--------|--------------------------|------------------------------------|--------------------|
| GET    | /api/reports             | List all reports                   | SuperAdmin         |
| POST   | /api/reports             | Generate a shop report             | SuperAdmin, Admin  |
| GET    | /api/reports/statistics  | Get report usage statistics        | SuperAdmin         |
| POST   | /api/reports/system      | Generate a system-wide report      | SuperAdmin         |
| GET    | /api/reports/shop/:shopId| Get reports for a specific shop    | SuperAdmin, Admin* |
| GET    | /api/reports/:reportId   | Get a specific report              | SuperAdmin, Admin* |
| DELETE | /api/reports/:reportId   | Delete a report                    | SuperAdmin, Admin* |

*Admin users can only access reports for their own shop.

### Validation

The Report Validation Schemas (`reportSchemas.js`) provide:

- Input validation for report generation
- Query parameter validation for report listing
- Role-based validation rules

## SuperAdmin vs Admin Access

### SuperAdmin Capabilities

SuperAdmins have unrestricted access to:
- View and manage reports for all shops
- Generate system-wide (cross-shop) reports 
- View report statistics and analytics
- Access any report regardless of shop

### Admin Capabilities

Admin access is restricted to:
- View and manage only their own shop's reports
- Generate reports only for their shop
- No access to system-wide reports or statistics

## Report Types

The system supports these report types:

1. **Debt Reports**: Track customer debts, payment trends, and outstanding balances
2. **Sales Reports**: View sales performance, top-selling products, and revenue metrics
3. **Risk Analysis Reports**: ML-based risk assessments for customer credit decisions
4. **POS Profit Reports**: Analyze profit margins, costs, and business performance

## Future Enhancements

The current implementation is a foundation for the reporting system. Future improvements could include:

### Backend Enhancements
- Scheduled report generation
- Email delivery of reports
- Advanced filtering capabilities
- Report templates
- Custom report types

### Frontend Requirements
- Report listing page with filtering
- Report generation interface
- Report viewer component
- Statistics dashboard (SuperAdmin)

## Integration Guide

To properly integrate this reporting system, the following steps are required:

1. **File Storage Integration**:
   - Implement a real file storage system for report files (AWS S3, Google Cloud Storage, etc.)
   - Update the service layer to generate and store actual report files

2. **Report Generation Logic**:
   - Implement actual data aggregation and report generation logic
   - Create templates for different report types

3. **Frontend Implementation**:
   - Build the report management UI components
   - Create forms for report generation
   - Implement report viewing/downloading functionality

## Security Considerations

The reporting system implements several security measures:

- Role-based access control (RBAC)
- Shop-based data segregation
- Audit logging of all report operations
- Soft delete with proper attribution

## Conclusion

The report management system provides a comprehensive solution for generating, viewing, and managing reports within DeynCare. The implementation follows best practices for security, data access control, and audit logging.

---

*Documentation created: May 4, 2025*
