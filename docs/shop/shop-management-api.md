# Shop Management API Documentation

This document provides comprehensive information about the Shop Management API endpoints in the DeynCare backend system. The Shop Management API allows SuperAdmin users to create, verify, monitor, and manage all shops registered in the system.

## Base URL

```
http://localhost:5000/api
```

## Authentication

All endpoints require authentication using a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## User Roles and Permissions

The system has the following user roles with different permissions for shop management:

- **SuperAdmin**: Can manage all shops in the system, including verification, suspension, and deletion
- **Admin**: Can manage their own shop details
- **Employee**: Limited access to shop management functions

## API Endpoints

### List All Shops

Retrieves a paginated list of shops with optional filtering.

```
GET /api/shops
```

**Authentication Required**: Yes  
**Authorization**: SuperAdmin

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Number of items per page (default: 20)
- `status`: Filter by status (active, pending, suspended, deleted)
- `verified`: Filter by verification status (true/false)
- `subscriptionStatus`: Filter by subscription status (active, trial, expired)
- `search`: Search by shop name, owner name, or email

**Response**:
```json
{
  "success": true,
  "message": "Shops retrieved successfully",
  "data": {
    "shops": [
      {
        "shopId": "SHOP-123456",
        "shopName": "DeynCare Shop",
        "ownerName": "Shop Owner",
        "email": "owner@example.com",
        "phone": "+252612345678",
        "address": "Mogadishu, Somalia",
        "logoUrl": "",
        "status": "active",
        "verified": true,
        "subscription": {
          "planType": "monthly",
          "startDate": "2025-05-01T00:00:00.000Z",
          "endDate": "2025-06-01T00:00:00.000Z",
          "status": "active"
        },
        "createdAt": "2025-05-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "pages": 1
    }
  }
}

### Get Shop Details

Retrieves detailed information about a specific shop.

```
GET /api/shops/:shopId
```

**Authentication Required**: Yes  
**Authorization**: SuperAdmin, Admin (if shop matches their shopId)

**Path Parameters**:
- `shopId`: ID of the shop to retrieve

**Response**:
```json
{
  "success": true,
  "message": "Shop retrieved successfully",
  "data": {
    "shopId": "SHOP-123456",
    "shopName": "DeynCare Shop",
    "ownerName": "Shop Owner",
    "email": "owner@example.com",
    "phone": "+252612345678",
    "address": "Mogadishu, Somalia",
    "logoUrl": "",
    "status": "active",
    "verified": true,
    "subscription": {
      "planType": "monthly",
      "startDate": "2025-05-01T00:00:00.000Z",
      "endDate": "2025-06-01T00:00:00.000Z",
      "status": "active",
      "initialPaid": true,
      "paymentMethod": "offline"
    },
    "features": {
      "maxProducts": 100,
      "maxEmployees": 5,
      "maxCustomers": 500,
      "enabledModules": ["sales", "inventory", "customers", "debts"],
      "storageLimit": 500
    },
    "notifications": {
      "smsEnabled": true,
      "emailEnabled": false,
      "dailySummary": true,
      "dueReminders": true,
      "highRiskAlerts": true,
      "lowStockAlerts": true,
      "newCustomerNotifications": true,
      "salesReports": true,
      "paymentConfirmations": true
    },
    "statistics": {
      "totalProducts": 0,
      "totalCustomers": 0,
      "totalSales": 0,
      "totalRevenue": 0,
      "totalDebts": 0,
      "totalDebtAmount": 0,
      "lastUpdated": "2025-05-01T00:00:00.000Z"
    },
    "createdAt": "2025-05-01T00:00:00.000Z",
    "updatedAt": "2025-05-01T00:00:00.000Z"
  }
}

### Create Shop

Creates a new shop in the system.

```
POST /api/shops
```

**Authentication Required**: Yes  
**Authorization**: SuperAdmin, Admin

**Request Body**:
```json
{
  "name": "New Shop Name",
  "ownerName": "Owner Full Name",
  "email": "owner@example.com",
  "phone": "+252612345678",
  "address": "Mogadishu, Somalia",
  "logo": "",
  "subscription": {
    "planType": "monthly",
    "paymentMethod": "offline",
    "initialPaid": false
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Shop created successfully",
  "data": {
    "shopId": "SHOP-123456",
    "shopName": "New Shop Name",
    "ownerName": "Owner Full Name",
    "email": "owner@example.com",
    "phone": "+252612345678",
    "address": "Mogadishu, Somalia",
    "logoUrl": "",
    "status": "pending",
    "verified": false,
    "subscription": {
      "planType": "monthly",
      "startDate": "2025-05-23T00:00:00.000Z",
      "endDate": "2025-06-23T00:00:00.000Z",
      "status": "pending"
    },
    "features": {
      "maxProducts": 100,
      "maxEmployees": 5,
      "maxCustomers": 500,
      "enabledModules": ["sales", "inventory", "customers", "debts"],
      "storageLimit": 500
    },
    "createdAt": "2025-05-23T00:00:00.000Z"
  }
}

### Update Shop

Updates information for an existing shop.

```
PUT /api/shops/:shopId
```

**Authentication Required**: Yes  
**Authorization**: SuperAdmin, Admin (if shop matches their shopId)

**Path Parameters**:
- `shopId`: ID of the shop to update

**Request Body**:
```json
{
  "name": "Updated Shop Name",
  "ownerName": "Updated Owner Name",
  "email": "newemail@example.com",
  "phone": "+252612345679",
  "address": "New Address, Mogadishu, Somalia",
  "location": {
    "street": "New Street",
    "city": "Mogadishu",
    "country": "Somalia"
  },
  "businessDetails": {
    "type": "retail",
    "category": "Electronics",
    "employeeCount": 5
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Shop updated successfully",
  "data": {
    "shopId": "SHOP-123456",
    "shopName": "Updated Shop Name",
    "ownerName": "Updated Owner Name",
    "email": "newemail@example.com",
    "phone": "+252612345679",
    "address": "New Address, Mogadishu, Somalia",
    "location": {
      "street": "New Street",
      "city": "Mogadishu",
      "country": "Somalia"
    },
    "businessDetails": {
      "type": "retail",
      "category": "Electronics",
      "employeeCount": 5
    },
    "status": "active",
    "verified": true,
    "updatedAt": "2025-05-23T00:00:00.000Z"
  }
}
```

### Upload Shop Logo

Updates the logo for a shop.

```
PUT /api/shops/:shopId/logo
```

**Authentication Required**: Yes  
**Authorization**: SuperAdmin, Admin (if shop matches their shopId)

**Path Parameters**:
- `shopId`: ID of the shop to update logo

**Request Body**:
```json
{
  "logo": "https://storage.deyncare.com/logos/shop-logo.png"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Shop logo uploaded successfully",
  "data": {
    "logoUrl": "https://storage.deyncare.com/logos/shop-logo.png"
  }
}
```

### Verify Shop

Approves or rejects a shop registration.

```
PUT /api/shops/:shopId/verify
```

**Authentication Required**: Yes  
**Authorization**: SuperAdmin

**Path Parameters**:
- `shopId`: ID of the shop to verify

**Request Body**:
```json
{
  "verified": true,
  "status": "active",
  "notes": "Shop documentation verified",
  "sendEmail": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Shop verified and activated successfully",
  "data": {
    "shopId": "SHOP-123456",
    "shopName": "DeynCare Shop",
    "verified": true,
    "status": "active",
    "verificationDetails": {
      "verifiedAt": "2025-05-23T00:00:00.000Z",
      "verifiedBy": "USER-ADMIN123"
    }
  }
}
```

### Change Shop Status

Suspends or reactivates a shop.

```
PUT /api/shops/:shopId/status
```

**Authentication Required**: Yes  
**Authorization**: SuperAdmin

**Path Parameters**:
- `shopId`: ID of the shop to update status

**Request Body**:
```json
{
  "status": "suspended",
  "reason": "Violation of terms of service",
  "duration": 7,
  "sendEmail": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Shop suspended successfully",
  "data": {
    "shopId": "SHOP-123456",
    "shopName": "DeynCare Shop",
    "status": "suspended",
    "statusChangeDetails": {
      "changedBy": "USER-ADMIN123",
      "changedAt": "2025-05-23T00:00:00.000Z",
      "reason": "Violation of terms of service",
      "duration": 7,
      "endDate": "2025-05-30T00:00:00.000Z"
    }
  }
}
```

### Verify Payment

Verifies a payment for a shop subscription.

```
PUT /api/shops/:shopId/payment
```

**Authentication Required**: Yes  
**Authorization**: SuperAdmin

**Path Parameters**:
- `shopId`: ID of the shop to verify payment

**Request Body**:
```json
{
  "transactionId": "TXN-123456",
  "amount": 30,
  "paymentMethod": "EVC Plus",
  "paymentDate": "2025-05-23T00:00:00.000Z",
  "notes": "Monthly subscription payment",
  "sendEmail": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "shopId": "SHOP-123456",
    "subscription": {
      "planType": "monthly",
      "status": "active",
      "startDate": "2025-05-23T00:00:00.000Z",
      "endDate": "2025-06-23T00:00:00.000Z",
      "payment": {
        "transactionId": "TXN-123456",
        "amount": 30,
        "method": "EVC Plus",
        "date": "2025-05-23T00:00:00.000Z",
        "verifiedBy": "USER-ADMIN123",
        "verifiedAt": "2025-05-23T00:00:00.000Z"
      }
    },
    "status": "active"
  }
}
```

### Delete Shop

Performs a soft delete of a shop.

```
DELETE /api/shops/:shopId
```

**Authentication Required**: Yes  
**Authorization**: SuperAdmin

**Path Parameters**:
- `shopId`: ID of the shop to delete

**Request Body**:
```json
{
  "reason": "Requested by shop owner",
  "sendEmail": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Shop deleted successfully",
  "data": {
    "shopId": "SHOP-123456",
    "isDeleted": true,
    "deletedAt": "2025-05-23T00:00:00.000Z",
    "deletedBy": "USER-ADMIN123",
    "deletionReason": "Requested by shop owner"
  }
}
```

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "message": "Error message describing what went wrong",
  "error": {
    "code": "error_code",
    "status": 400,
    "details": "Additional error details if available"
  }
}
```

Common error codes:
- `shop_not_found` (404): Shop with the specified ID does not exist
- `invalid_shop_data` (400): Invalid data provided for shop creation/update
- `shop_already_deleted` (400): Attempt to delete a shop that is already deleted
- `unauthorized` (401): Missing authentication token
- `forbidden` (403): Insufficient permissions to perform the operation
- `validation_error` (400): Request validation failed

## Pagination

List endpoints support pagination through the following query parameters:
- `page`: Page number (starts at 1)
- `limit`: Number of items per page

The response includes pagination metadata:
```json
"pagination": {
  "total": 50,  // Total number of items
  "page": 1,    // Current page
  "limit": 20,  // Items per page
  "pages": 3    // Total number of pages
}
```
