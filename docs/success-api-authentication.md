# DeynCare Authentication API - 100% Tested and Working

This document provides comprehensive documentation of fully tested and confirmed working authentication-related API endpoints in the DeynCare backend system. Each endpoint has been 100% verified and includes details on request format, validation rules, response format, and architectural flow.

## Table of Contents

1. [Authentication Flow Diagram](#authentication-flow-diagram)
2. [API Endpoints](#api-endpoints)
   - [User Registration](#user-registration)
   - [Email Verification](#email-verification)
   - [Login](#login)
   - [Token Refresh](#token-refresh)
   - [Logout](#logout)
   - [Logout All Devices](#logout-all-devices)
   - [Forgot Password](#forgot-password)
   - [Reset Password](#reset-password)
   - [Change Password](#change-password)
   - [Get User Profile](#get-user-profile)
3. [Authentication Middleware](#authentication-middleware)
4. [Error Handling](#error-handling)
5. [Security Features](#security-features)

## Authentication Flow Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    Client   │──────▶│ Controllers │──────▶│  Services   │
└─────────────┘       └─────────────┘       └─────────────┘
       ▲                     ▲                     ▲
       │                     │                     │
       │                     │                     │
       │                     ▼                     ▼
       │               ┌─────────────┐       ┌─────────────┐
       └───────────────│ Middleware  │       │   Models    │
                       └─────────────┘       └─────────────┘
                              ▲                     ▲
                              │                     │
                              ▼                     │
                       ┌─────────────┐             │
                       │ Validation  │─────────────┘
                       └─────────────┘
```

- **Client**: Front-end application making API requests
- **Middleware**: Handles request preprocessing, validation, and authentication
- **Controllers**: Process incoming requests and prepare responses
- **Services**: Contains business logic and model interactions
- **Validation**: Ensures data meets requirements before processing
- **Models**: Data schema and database interactions

## API Endpoints

### User Registration
**Endpoint:** `POST /api/auth/register`  
**Category:** User Management  
**Use Case:** Register a new user and optionally create a shop

**Request Payload:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+252612345678",
  "password": "SecurePass123!",
  "shopName": "John's Shop",
  "shopAddress": "123 Main St, Mogadishu",
  "planType": "trial",
  "registeredBy": "self",
  "paymentMethod": "offline",
  "initialPaid": false,
  "paymentDetails": {
    "amount": 0,
    "reference": "",
    "notes": ""
  }
}
```

**Validation Rules:**
- `fullName`: 3-100 characters, required
- `email`: Valid email format, required
- `phone`: International format (+252xxxxxxxx), required
- `password`: Min 8 chars with at least one uppercase, lowercase, and special character, required
- `shopName` & `shopAddress`: Must be provided together if creating a shop
- `planType`: One of ['trial', 'monthly', 'yearly'], defaults to 'trial'
- `paymentDetails`: Required if initialPaid is true

**Response (Success):**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "userId": "usr_123456789",
    "email": "john@example.com",
    "verificationSent": true,
    "shopCreated": true,
    "shopId": "shp_987654321"
  }
}
```

**Architecture Flow:**
1. Request data validated by `authSchemas.register`
2. `AuthController.register` processes request
3. `AuthService` creates user account
4. If shop details provided, `ShopService` creates the shop
5. `EmailService` sends verification email
6. Response returned to client

### Email Verification
**Endpoint:** `POST /api/auth/verify-email`  
**Category:** User Management  
**Use Case:** Verify user's email address with confirmation code

**Request Payload:**
```json
{
  "email": "john@example.com",
  "verificationCode": "123456"
}
```

**Validation Rules:**
- `email`: Valid email format, required
- `verificationCode`: 6 characters, required

**Response (Success):**
```json
{
  "success": true,
  "message": "Email verified successfully.",
  "data": {
    "userId": "usr_123456789",
    "email": "john@example.com",
    "verified": true,
    "shopVerified": true
  }
}
```

**Architecture Flow:**
1. Request validated by `authSchemas.verifyEmail`
2. `AuthController.verifyEmail` processes request
3. `AuthService.verifyEmail` validates code and updates user record
4. If user is shop owner (`role="admin"`), shop is also verified
5. Response returned to client

### Login
**Endpoint:** `POST /api/auth/login`  
**Category:** Authentication  
**Use Case:** User authentication to obtain access and refresh tokens

**Request Payload:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "rememberMe": true
}
```

**Validation Rules:**
- `email`: Valid email format, required
- `password`: Required
- `rememberMe`: Boolean, defaults to false

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "userId": "usr_123456789",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "shopId": "shp_987654321",
      "verified": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    },
    "shop": {
      "shopId": "shp_987654321",
      "shopName": "John's Shop",
      "subscription": {
        "planType": "trial",
        "status": "active",
        "trialEndsAt": "2023-05-01T00:00:00.000Z"
      }
    }
  }
}
```

**Architecture Flow:**
1. Request validated by `authSchemas.login`
2. `AuthController.login` processes request
3. `AuthService.login` verifies credentials
4. `TokenService` generates access and refresh tokens
5. Session created and tokens returned to client

### Token Refresh
**Endpoint:** `POST /api/auth/refresh-token`  
**Category:** Authentication  
**Use Case:** Obtain new access token using refresh token

**Request Payload:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Validation Rules:**
- `refreshToken`: JWT format, required

**Response (Success):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

**Architecture Flow:**
1. Request validated
2. `AuthController.refreshToken` processes request
3. `AuthService.refreshToken` verifies refresh token validity
4. New access token generated and returned to client

### Logout
**Endpoint:** `POST /api/auth/logout`  
**Category:** Authentication  
**Use Case:** Invalidate current user session

**Request Payload:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Validation Rules:**
- `refreshToken`: JWT format, required

**Response (Success):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Architecture Flow:**
1. Request validated
2. `AuthController.logout` processes request
3. `AuthService.logout` invalidates the refresh token
4. Session removed and success response returned

### Logout All Devices
**Endpoint:** `POST /api/auth/logout-all`  
**Category:** Authentication  
**Use Case:** Invalidate all active sessions for the current user

**Request Payload:**
```json
{}
```

**Validation Rules:**
- Requires valid access token in Authorization header

**Response (Success):**
```json
{
  "success": true,
  "message": "Logged out from all devices successfully",
  "data": {
    "sessionsTerminated": 3
  }
}
```

**Architecture Flow:**
1. `AuthController.logoutAll` extracts user ID from token
2. `AuthService.logoutAll` invalidates all refresh tokens for the user
3. All sessions removed and success response returned

### Forgot Password
**Endpoint:** `POST /api/auth/forgot-password`  
**Category:** User Management  
**Use Case:** Request password reset link

**Request Payload:**
```json
{
  "email": "john@example.com"
}
```

**Validation Rules:**
- `email`: Valid email format, required

**Response (Success):**
```json
{
  "success": true,
  "message": "If your email is registered, you will receive password reset instructions."
}
```

**Architecture Flow:**
1. Request validated by `authSchemas.forgotPassword`
2. `AuthController.forgotPassword` processes request
3. `AuthService.forgotPassword` generates reset token
4. `EmailService` sends password reset email
5. Standard response returned (same for all cases for security)

### Reset Password
**Endpoint:** `POST /api/auth/reset-password`  
**Category:** User Management  
**Use Case:** Reset password using token from email

**Request Payload:**
```json
{
  "token": "d7364c8a5e0b4a1f9c3d2b6a8e7f5c2d1b3a9e8f7c6d5b4a3c2e1f0",
  "newPassword": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}
```

**Validation Rules:**
- `token`: String, required
- `newPassword`: Min 8 chars with at least one uppercase, lowercase, and special character, required
- `confirmPassword`: Must match newPassword, required
- **Security Check**: newPassword cannot match existing password

**Response (Success):**
```json
{
  "success": true,
  "message": "Password has been reset successfully. Please log in with your new password.",
  "userId": "usr_123456789",
  "email": "john@example.com"
}
```

**Architecture Flow:**
1. Request validated by `authSchemas.resetPassword`
2. `AuthController.resetPassword` processes request
3. `AuthService.resetPassword` verifies token and updates password
4. `EmailService` sends password change notification
5. All existing sessions invalidated for security
6. Success response returned

### Change Password
**Endpoint:** `POST /api/auth/change-password`  
**Category:** User Management  
**Use Case:** Change password for authenticated user

**Request Payload:**
```json
{
  "currentPassword": "SecurePass123!",
  "newPassword": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!",
  "logoutOtherDevices": true
}
```

**Validation Rules:**
- `currentPassword`: String, required
- `newPassword`: Min 8 chars with at least one uppercase, lowercase, and special character, required
- `confirmPassword`: Must match newPassword, required
- `logoutOtherDevices`: Boolean, defaults to false
- **Security Check**: newPassword cannot match currentPassword

**Response (Success):**
```json
{
  "success": true,
  "message": "Password has been changed successfully. Please log in with your new password."
}
```

**Architecture Flow:**
1. Request validated by `authSchemas.changePassword`
2. `AuthController.changePassword` processes request
3. `AuthService.changePassword` verifies current password and updates to new password
4. `EmailService` sends password change notification
5. If logoutOtherDevices is true, all other sessions are invalidated
6. Success response returned

### Get User Profile
**Endpoint:** `GET /api/auth/me`  
**Category:** User Management  
**Use Case:** Retrieve current user's profile information

**Request Payload:**
None (Uses Authorization header with access token)

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "user": {
      "userId": "usr_123456789",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+252612345678",
      "role": "admin",
      "verified": true,
      "createdAt": "2023-04-01T12:00:00.000Z"
    },
    "shop": {
      "shopId": "shp_987654321",
      "shopName": "John's Shop",
      "shopAddress": "123 Main St, Mogadishu",
      "verified": true,
      "subscription": {
        "planType": "trial",
        "status": "active",
        "trialEndsAt": "2023-05-01T00:00:00.000Z"
      }
    }
  }
}
```

**Architecture Flow:**
1. User ID extracted from access token
2. `AuthController.getProfile` processes request
3. `AuthService.getProfile` retrieves user data and associated shop if applicable
4. User profile returned in response



## Authentication Middleware

The system uses JWT-based authentication with two token types:
- **Access Token**: Short-lived (1 hour) token for API access
- **Refresh Token**: Long-lived token for obtaining new access tokens

Middleware functions:
- `authenticate`: Verifies the JWT access token
- `authorizeRoles`: Ensures user has required role(s)
- `validateRequest`: Validates request data against schemas

## Error Handling

The authentication system provides detailed error messages with appropriate HTTP status codes:

| Error Code | Description | HTTP Status |
|------------|-------------|------------|
| invalid_credentials | Email or password incorrect | 401 |
| account_not_verified | User account not verified | 403 |
| invalid_token | Invalid or expired token | 401 |
| same_password | New password matches current password | 400 |
| email_in_use | Email already registered | 409 |
| shop_name_taken | Shop name already in use | 409 |

## Security Features

1. **Password Security**
   - Passwords stored using bcrypt hashing
   - Password complexity requirements enforced
   - Prevention of password reuse during reset/change
   - Multi-device session management

2. **Email Verification**
   - Mandatory email verification for new accounts
   - Shop verification linked to owner email verification
   - Secure verification codes (6 characters)

3. **Session Management**
   - Token-based authentication
   - Refresh token rotation
   - Ability to terminate all sessions
   - Session device tracking

4. **Notifications**
   - Password change notifications
   - Reset password emails
   - Security event logging
   - Login attempt monitoring

5. **Data Protection**
   - Input validation and sanitization
   - Rate limiting (configurable)
   - XSS and CSRF protection
   - Secure HTTP-only cookies option
