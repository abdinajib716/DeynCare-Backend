# DeynCare Authentication API Testing Guide

This document provides a comprehensive guide for testing the DeynCare authentication endpoints using Insomnia REST client.

## Base URL

```
http://localhost:3000/api/auth
```

## Authentication Endpoints

### 1. Register a New User
**Endpoint:** `POST /api/auth/register`  
**Use Case:** Register a new user with optional shop information

**Payload:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "securePassword123",
  
  // Shop data (optional - only when creating a shop)
  "shopName": "John's Shop",
  "shopLogo": "https://example.com/logo.png",
  "shopAddress": "123 Main St, City, Country",
  
  // Subscription data (optional)
  "planType": "monthly",
  "registeredBy": "self",
  "paymentMethod": "offline",
  "initialPaid": false,
  
  // Payment details (optional)
  "paymentDetails": {
    "amount": 50,
    "currency": "USD",
    "receipt": "receipt123"
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Registration successful! Please verify your email.",
  "data": {
    "userId": "USR12345",
    "email": "john@example.com"
  }
}
```

---

### 2. Verify Email
**Endpoint:** `POST /api/auth/verify-email`  
**Use Case:** Verify a user's email using the verification code sent during registration

**Payload:**
```json
{
  "email": "john@example.com",
  "verificationCode": "123456"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Email verified successfully!",
  "data": {
    "email": "john@example.com",
    "verified": true
  }
}
```

---

### 3. Resend Verification Code
**Endpoint:** `POST /api/auth/resend-verification`  
**Use Case:** Resend the email verification code when it expires or is lost

**Payload:**
```json
{
  "email": "john@example.com"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Verification code sent to your email"
}
```

---

### 4. User Login
**Endpoint:** `POST /api/auth/login`  
**Use Case:** Authenticate a user and receive access & refresh tokens

**Payload:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "userId": "USR12345",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "shopId": "SHP12345"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Note:** Save both tokens for future authenticated requests. The `accessToken` should be included in the `Authorization` header as `Bearer {accessToken}`.

---

### 5. Refresh Access Token
**Endpoint:** `POST /api/auth/refresh-token`  
**Use Case:** Get a new access token using the refresh token when the access token expires

**Payload:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 6. User Logout
**Endpoint:** `POST /api/auth/logout`  
**Use Case:** Log out from the current device

**Payload:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 7. Logout from All Devices
**Endpoint:** `POST /api/auth/logout-all`  
**Use Case:** Log out from all devices where the user is logged in  
**Authorization Required:** Yes (Bearer Token)

**Payload:**
```json
{} // No payload required
```

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Logged out from all devices successfully"
}
```

---

### 8. Forgot Password
**Endpoint:** `POST /api/auth/forgot-password`  
**Use Case:** Request a password reset when a user forgets their password

**Payload:**
```json
{
  "email": "john@example.com"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "If your email is registered, you will receive password reset instructions."
}
```

---

### 9. Reset Password
**Endpoint:** `POST /api/auth/reset-password`  
**Use Case:** Reset password using the token received in the email

**Method 1: Direct API Call**

**Payload:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword123"
}
```

**Method 2: From Reset Link (Recommended)**

Users will receive a reset link in their email that looks like:
```
http://localhost:3000/reset-password?token=reset-token-from-email
```

Then your frontend should call the API with:
```json
{
  "newPassword": "newSecurePassword123"
}
```
The API automatically extracts the token from the query parameters.

**Expected Response:**
```json
{
  "success": true,
  "message": "Password has been reset successfully. Please log in with your new password."
}
```

**Error Response (Invalid Token):**
```json
{
  "success": false,
  "error": {
    "message": "Invalid or expired reset token",
    "code": "invalid_token",
    "status": 400
  }
}
```

---

### 10. Change Password (Authenticated)
**Endpoint:** `POST /api/auth/change-password`  
**Use Case:** Change password when the user is logged in  
**Authorization Required:** Yes (Bearer Token)

**Payload:**
```json
{
  "currentPassword": "securePassword123",
  "newPassword": "newSecurePassword123",
  "logoutOtherDevices": true // Optional
}
```

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### 11. Get User Profile
**Endpoint:** `GET /api/auth/me`  
**Use Case:** Get the current user's profile details  
**Authorization Required:** Yes (Bearer Token)

**Payload:** None

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "userId": "USR12345",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "role": "admin",
    "shopId": "SHP12345",
    "status": "active",
    "verified": true
  }
}
```

## Testing Workflow

For a complete testing flow, follow these steps:

1. Register a new user (`/register`)
2. Verify the email (`/verify-email`)
3. Login to get tokens (`/login`)
4. Access the user profile (`/me`) using the access token
5. Test password reset flow (`/forgot-password` followed by `/reset-password`)
6. Change password (`/change-password`)
7. Refresh token (`/refresh-token`) when the access token expires
8. Logout (`/logout`) or logout from all devices (`/logout-all`)

## Error Handling

All endpoints will return appropriate HTTP status codes and error messages:

```json
{
  "success": false,
  "error": {
    "code": "error_code",
    "message": "Error message explaining what went wrong",
    "status": 400
  }
}
```

Common error codes:
- `invalid_request`: Missing or invalid parameters
- `authentication_failed`: Invalid credentials
- `invalid_token`: Expired or invalid token
- `not_authorized`: Insufficient permissions
- `conflict_error`: Resource already exists (e.g., email already registered)
