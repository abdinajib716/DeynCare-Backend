# User Management API Documentation

This document provides comprehensive information about the User Management API endpoints in the DeynCare backend system. The User Management API allows SuperAdmin and Admin users to create, retrieve, update, and delete users within the system.

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

The system has the following user roles with different permissions:

- **SuperAdmin**: Can manage all users in the system across all shops
- **Admin**: Can manage employees within their own shop
- **Employee**: Limited access to user management functions

## API Endpoints

### 1. Get All Users

Retrieves a list of all users with pagination and optional filtering.

- **Endpoint**: `/users`
- **Method**: `GET`
- **Authorization**: SuperAdmin
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Users per page (default: 10)
  - `status`: Filter by status (active, pending, suspended, inactive)
  - `role`: Filter by role (superAdmin, admin, employee)
  - `shopId`: Filter by shop ID
  - `search`: Search by name, email, or phone

#### Example Request

```http
GET /api/users?page=1&limit=10&status=active&role=admin
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Example Response

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "_id": "680931e117e19a459b5f8e46",
        "userId": "USR003",
        "fullName": "Mohamud Muhidin abdullahi",
        "email": "reach.mohamud@gmail.com",
        "phone": "+252616100220",
        "role": "admin",
        "shopId": "SHOP002",
        "shopName": "MIDNIMO",
        "status": "active",
        "isSuspended": false,
        "suspensionReason": null,
        "verified": true,
        "emailVerified": true,
        "lastLoginAt": "2025-05-04T09:49:23.226Z",
        "profilePicture": null,
        "isDeleted": false,
        "deletedAt": null,
        "loginHistory": [],
        "createdAt": "2025-04-23T18:30:57.698Z",
        "updatedAt": "2025-05-05T11:38:01.760Z",
        "verifiedAt": "2025-04-23T18:32:37.049Z"
      },
      // More users...
    ],
    "pagination": {
      "totalDocs": 25,
      "limit": 10,
      "totalPages": 3,
      "page": 1,
      "hasPrevPage": false,
      "hasNextPage": true,
      "prevPage": null,
      "nextPage": 2
    }
  }
}
```

### 2. Get User By ID

Retrieves a specific user by their user ID.

- **Endpoint**: `/users/:userId`
- **Method**: `GET`
- **Authorization**: SuperAdmin, Admin (own shop users only)
- **URL Parameters**:
  - `userId`: The ID of the user to retrieve

#### Example Request

```http
GET /api/users/USR12345
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Example Response

```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user": {
      "_id": "680931e117e19a459b5f8e46",
      "userId": "USR003",
      "fullName": "Mohamud Muhidin abdullahi",
      "email": "reach.mohamud@gmail.com",
      "phone": "+252616100220",
      "role": "admin",
      "shopId": "SHOP002",
      "shopName": "MIDNIMO",
      "status": "active",
      "isSuspended": false,
      "suspensionReason": null,
      "verified": true,
      "emailVerified": true,
      "lastLoginAt": "2025-05-04T09:49:23.226Z",
      "profilePicture": null,
      "isDeleted": false,
      "deletedAt": null,
      "loginHistory": [],
      "createdAt": "2025-04-23T18:30:57.698Z",
      "updatedAt": "2025-05-05T11:38:01.760Z",
      "verifiedAt": "2025-04-23T18:32:37.049Z"
    }
  }
}
```

### 3. Create User

Creates a new user in the system.

- **Endpoint**: `/users`
- **Method**: `POST`
- **Authorization**: SuperAdmin (any shop), Admin (own shop only, employees only)
- **Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| fullName | string | Yes | User's full name |
| email | string | Yes | User's email address (must be unique) |
| phone | string | Yes | User's phone number |
| password | string | Yes | User's password (will be hashed) |
| role | string | Yes | User's role (superAdmin, admin, employee) |
| shopId | string | Conditional | Shop ID (required for admin and employee) |
| status | string | No | Initial status (default: pending) |

#### Example Request

```http
POST /api/users
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "fullName": "Jane Smith",
  "email": "jane.smith@example.com",
  "phone": "+1987654321",
  "password": "SecurePassword123!",
  "role": "admin",
  "shopId": "SHP12345",
  "status": "active"
}
```

#### Example Response

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "_id": "682c7f5e19a459b5f8e47",
      "userId": "USR004",
      "fullName": "Jane Smith",
      "email": "jane.smith@example.com",
      "phone": "+252634567890",
      "role": "employee",
      "shopId": "SHOP002",
      "shopName": "MIDNIMO",
      "status": "active",
      "isSuspended": false,
      "suspensionReason": null,
      "verified": false,
      "emailVerified": false,
      "lastLoginAt": null,
      "profilePicture": null,
      "isDeleted": false,
      "deletedAt": null,
      "loginHistory": [],
      "createdAt": "2025-05-20T14:30:57.698Z",
      "updatedAt": "2025-05-20T14:30:57.698Z",
      "verifiedAt": null
    }
  }
}
```

### 4. Update User

Updates an existing user's information.

- **Endpoint**: `/users/:userId`
- **Method**: `PUT`
- **Authorization**: SuperAdmin (any user), Admin (own shop employees only)
- **URL Parameters**:
  - `userId`: The ID of the user to update
- **Request Body**: Any of the following fields can be updated

| Field | Type | Description |
|-------|------|-------------|
| fullName | string | User's full name |
| email | string | User's email address (must be unique) |
| phone | string | User's phone number |
| password | string | User's new password (will be hashed) |
| role | string | User's role (SuperAdmin can change, restrictions apply) |
| status | string | User's status |

#### Example Request

```http
PUT /api/users/USR67890
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "fullName": "Jane Smith-Johnson",
  "phone": "+1987654322",
  "status": "active"
}
```

#### Example Response

```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "user": {
      "_id": "682c7f5e19a459b5f8e47",
      "userId": "USR004",
      "fullName": "Jane Smith-Johnson",
      "email": "jane.smith@example.com",
      "phone": "+252634567890",
      "role": "employee",
      "shopId": "SHOP002",
      "shopName": "MIDNIMO",
      "status": "active",
      "isSuspended": false,
      "suspensionReason": null,
      "verified": false,
      "emailVerified": false,
      "lastLoginAt": null,
      "profilePicture": null,
      "isDeleted": false,
      "deletedAt": null,
      "loginHistory": [],
      "createdAt": "2025-05-20T14:30:57.698Z",
      "updatedAt": "2025-05-20T14:35:22.145Z",
      "verifiedAt": null
    }
  }
}
```

### 5. Change User Status

Changes a user's status (separate from general update).

- **Endpoint**: `/users/:userId/status`
- **Method**: `PATCH`
- **Authorization**: SuperAdmin (any user), Admin (own shop employees only)
- **URL Parameters**:
  - `userId`: The ID of the user whose status should be changed
- **Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | Yes | New status (active, suspended, inactive) |
| reason | string | Conditional | Required when suspending a user |

#### Example Request

```http
PATCH /api/users/USR67890/status
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "status": "suspended",
  "reason": "Violation of terms of service"
}
```

#### Example Response

```json
{
  "success": true,
  "message": "User status changed to suspended successfully",
  "data": {
    "user": {
      "_id": "682c7f5e19a459b5f8e47",
      "userId": "USR004",
      "fullName": "Jane Smith-Johnson",
      "email": "jane.smith@example.com",
      "phone": "+252634567890",
      "role": "employee",
      "shopId": "SHOP002",
      "shopName": "MIDNIMO",
      "status": "suspended",
      "isSuspended": true,
      "suspensionReason": "Violation of terms of service",
      "verified": false,
      "emailVerified": false,
      "lastLoginAt": null,
      "profilePicture": null,
      "isDeleted": false,
      "deletedAt": null,
      "loginHistory": [],
      "createdAt": "2025-05-20T14:30:57.698Z",
      "updatedAt": "2025-05-20T14:40:15.329Z",
      "verifiedAt": null
    }
  }
}
```

### 6. Delete User

Soft deletes a user from the system.

- **Endpoint**: `/users/:userId`
- **Method**: `DELETE`
- **Authorization**: SuperAdmin (any user except other superAdmins), Admin (own shop employees only)
- **URL Parameters**:
  - `userId`: The ID of the user to delete
- **Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reason | string | No | Reason for deletion (optional) |

#### Example Request

```http
DELETE /api/users/USR67890
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "reason": "User no longer employed"
}
```

#### Example Response

```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

## Error Responses

All API endpoints follow a standard error response format:

```json
{
  "success": false,
  "message": "Error message describing what went wrong",
  "statusCode": 400,
  "type": "error_type"
}
```

### Common Error Types

| Error Type | Status Code | Description |
|------------|-------------|-------------|
| validation_error | 400 | Invalid input data |
| duplicate_email | 409 | Email already exists |
| user_not_found | 404 | User does not exist |
| forbidden | 403 | Insufficient permissions |
| server_error | 500 | Internal server error |

## Special Considerations

### SuperAdmin Users and Shops

- SuperAdmin users can operate without a shop associated
- When creating a SuperAdmin user, the shopId is optional
- SuperAdmin users can manage all shops and users in the system

### Role-Based Access Control

- SuperAdmin: Full access to all users and actions
- Admin: Can manage employees within their own shop
- Employee: No access to user management functions

### User Status Changes

When changing a user status:
- Active → Suspended: Requires a reason
- Suspended → Active: Clears suspension flags
- Any → Inactive: User cannot log in

### Soft Delete

- User deletion is a soft delete operation
- Deleted users have `isDeleted` flag set to true
- Deleted users cannot log in
- User data is preserved for audit purposes
