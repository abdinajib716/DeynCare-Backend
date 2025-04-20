# Shop Owner Registration & Setup Guide

This document provides a comprehensive guide for registering as a Shop Owner (Admin role) in the DeynCare system, based on the actual implementation in the codebase.

## Registration Flow

### 1. Register Shop Owner Account

The first step is registering an account with shop details and logo.

#### Endpoint

```
POST /api/auth/register
```

#### Request Format

This endpoint accepts `multipart/form-data` to allow file uploads along with the shop registration data.

#### Form Fields

```
fullName: "Ahmed Mohamed"
email: "ahmed@example.com"
phone: "+252612345678"
password: "SecurePassword123!"
shopName: "Ahmed's Electronics"
shopAddress: "Main Street, Hargeisa, Somalia"
planType: "trial"
paymentMethod: "EVC Plus"
initialPaid: false
```

#### File Upload

```
shopLogo: [FILE] - JPG, PNG, or WebP image (max 5MB)
```

Key validation rules:
- `fullName`: 3-100 characters
- `email`: Valid email format
- `phone`: International format (e.g., +252xxxxxxxx)
- `password`: Minimum 8 characters
- `shopName` and `shopAddress` must be provided together
- `planType`: "trial", "monthly", or "yearly" (defaults to "trial")
- `paymentMethod`: "Cash", "EVC Plus", "Bank Transfer", "Mobile Money", "Check", "Card", "Other", or "offline" (defaults to "offline")
- `shopLogo`: JPG, PNG, or WebP image file (max 5MB)

**Note:** All new registrations automatically start with a 14-day trial period.

#### Response Example

```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "userId": "user_12345",
    "email": "ahmed@example.com",
    "fullName": "Ahmed Mohamed",
    "role": "shopOwner",
    "verificationStatus": "pending"
  }
}
```

### 2. Verify Email Address

After registration, the system sends a verification code to the provided email address. This code must be submitted to verify the account.

#### Endpoint

```
POST /api/auth/verify-email
```

#### Request Payload

```json
{
  "email": "ahmed@example.com",
  "code": "123456"
}
```

#### Response Example

```json
{
  "success": true,
  "message": "Email verified successfully. You can now log in.",
  "data": {
    "userId": "user_12345",
    "email": "ahmed@example.com",
    "verified": true
  }
}
```

### 3. Log In to Your Account

Once verified, you can log in to your account.

#### Endpoint

```
POST /api/auth/login
```

#### Request Payload

```json
{
  "email": "ahmed@example.com",
  "password": "SecurePassword123!"
}
```

#### Response Example

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "userId": "user_12345",
    "fullName": "Ahmed Mohamed",
    "email": "ahmed@example.com",
    "role": "shopOwner",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## Subscription Management

### Trial Period

All new shop registrations automatically start with a 14-day trial period that includes full access to all features. No payment is required to start using the system during this period.

Once the trial expires, you'll need to activate a paid subscription to continue using the system. You can do this before or after the trial expiration.

### Converting to Paid Subscription

There are two main options for converting your trial to a paid subscription:

### Option 1: EVC Plus Payment

Pay for your subscription using EVC Plus mobile money.

#### Endpoint

```
POST /api/subscriptions/pay-evc
```

#### Request Payload

```json
{
  "subscriptionId": "sub_12345",
  "phone": "+252612345678",
  "amount": 30.00,
  "planType": "monthly"
}
```

#### Response Example

```json
{
  "success": true,
  "message": "Subscription payment processed successfully",
  "data": {
    "paymentId": "pay_6789",
    "subscriptionId": "sub_12345",
    "status": "active",
    "planType": "monthly",
    "endDate": "2025-02-15T11:30:00Z",
    "transactionId": "tx_9876"
  }
}
```

### Option 2: Offline Payment

Submit proof of an offline payment (bank transfer, cash, etc.).

#### Endpoint

```
POST /api/subscriptions/offline-payment
```

#### Request Payload (Form Data)

- `subscriptionId`: "sub_12345"
- `amount`: 30.00
- `method`: "Bank Transfer"
- `payerName`: "Ahmed Mohamed"
- `payerPhone`: "+252612345678"
- `notes`: "Bank transfer from Commercial Bank account #12345"
- `planType`: "monthly"
- `paymentProof`: [FILE_UPLOAD - JPG, PNG, or PDF, max 5MB]

#### Response Example

```json
{
  "success": true,
  "message": "Offline payment submitted successfully and pending verification",
  "data": {
    "paymentId": "pay_6789",
    "subscriptionId": "sub_12345",
    "status": "pending",
    "fileId": "file_5678"
  }
}
```

**Note**: Offline payments require verification by a Super Admin before the subscription becomes active.

## Getting Help

If you encounter any issues during the registration or subscription activation process, please contact our support team at support@deyncare.com or call +252612345678.

---

## Technical Details

### Authentication Tokens

The system uses JWT (JSON Web Tokens) for authentication:

- `accessToken`: Valid for 30 minutes, used for API requests
- `refreshToken`: Valid for 7 days, used to obtain new access tokens

Include the access token in the Authorization header of your requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Error Responses

Error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "validation_error",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Valid email address is required"
      }
    ]
  }
}
