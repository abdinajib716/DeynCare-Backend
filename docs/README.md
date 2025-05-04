# DeynCare API Documentation

This documentation provides information about the DeynCare API endpoints, request/response formats, and authentication requirements. It is organized by feature to make integration with the frontend easier.

## Technology Stack

- **Backend**: Node.js, Express, MongoDB
- **Authentication**: JWT-based authentication
- **Frontend**: Next.js (App Router), Shadcn UI, TailwindCSS
- **State Management**: React Context
- **Data Fetching**: React Query, Axios

## Getting Started

### Base URL
```
Development: http://localhost:5000/api
Production: https://api.deyncare.com/api
```

### Authentication
Most endpoints require authentication using a JWT token. Include the token in the Authorization header:

```
Authorization: Bearer <your_token>
```

## Features

The API is organized around the following key features:

1. [Authentication](./features/authentication.md)
2. [User Management](./features/user-management.md)
3. [Shop Management](./features/shop-management.md)
4. [Subscription Management](./features/subscription-management.md)
5. [Discount Code Management](./features/discount-management.md)
6. [Payment Management](./features/payment-management.md)
7. [Settings Management](./features/settings-management.md)
8. [Dashboard & Analytics](./features/dashboard.md)

## Super Admin Panel Features

The Super Admin panel provides access to all the above features with extended capabilities:

1. **User Management**
   - Create admin users
   - View and manage all users
   - Reset user passwords
   
2. **Shop Management**
   - Approve or reject shop registrations
   - View all shops across the platform
   - Suspend or reactivate shops
   
3. **Subscription Management**
   - Configure subscription plans
   - View all subscriptions
   - Extend, upgrade, or cancel subscriptions
   
4. **Discount Management**
   - Create system-wide discount codes
   - View usage statistics
   - Enable/disable discount codes
   
5. **Payment Management**
   - View all payment transactions
   - Process refunds
   - Configure payment methods
   
6. **Settings Management**
   - Configure global system settings
   - Manage payment providers
   - Set up notification templates

## Error Handling

All API endpoints follow a consistent error format:

```json
{
  "success": false,
  "message": "Error message",
  "error": {
    "code": "error_code",
    "message": "Detailed error message",
    "details": [
      {
        "field": "field_name",
        "message": "Field-specific error"
      }
    ]
  }
}
```

## Response Format

All successful responses follow a consistent format:

```json
{
  "success": true,
  "message": "Success message",
  "data": {
    // Response data
  }
}
```

## Pagination

Endpoints that return lists support pagination using the following query parameters:

- `page`: Page number (default: 1)
- `limit`: Number of items per page (default: 20)

Paginated responses include pagination metadata:

```json
{
  "success": true,
  "message": "Success message",
  "data": {
    "items": [
      // List of items
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "pages": 5
    }
  }
}
```
