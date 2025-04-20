# Shop Owner Guide: DeynCare Complete API Documentation

This document provides a complete reference of all endpoints and functionality available to Shop Owners (Admin role) within the DeynCare platform, with detailed payloads for each operation.

## Table of Contents

1. [Account Management](#1-account-management)
   - [Registration](#11-registration)
   - [Authentication](#12-authentication)
   - [Profile Management](#13-profile-management)

2. [Shop Management](#2-shop-management)
   - [Shop Creation](#21-shop-creation)
   - [Shop Configuration](#22-shop-configuration)
   - [Staff Management](#23-staff-management)

3. [Subscription Management](#3-subscription-management)
   - [View Subscription Status](#31-view-subscription-status)
   - [Subscription Activation](#32-subscription-activation)
   - [EVC Plus Payment](#33-evc-plus-payment)
   - [Offline Payment](#34-offline-payment)
   - [Subscription Renewal](#35-subscription-renewal)

4. [Customer Management](#4-customer-management)
   - [Adding Customers](#41-adding-customers)
   - [Managing Customer Information](#42-managing-customer-information)
   - [Customer History](#43-customer-history)

5. [Debt Management](#5-debt-management)
   - [Recording Debts](#51-recording-debts)
   - [Tracking Payments](#52-tracking-payments)
   - [Debt Analytics](#53-debt-analytics)

6. [POS Operations](#6-pos-operations)
   - [Sales Recording](#61-sales-recording)
   - [Inventory Management](#62-inventory-management)
   - [Receipt Generation](#63-receipt-generation)

---

## 1. Account Management

### 1.1 Registration

The first step to setting up a DeynCare account is registering as a shop owner.

#### Endpoint

```
POST /api/auth/register
```

#### Request Payload

```json
{
  "fullName": "Ahmed Mohamed",
  "email": "ahmed@example.com",
  "password": "SecurePassword123!",
  "phone": "252612345678",
  "country": "Somalia",
  "city": "Mogadishu",
  "acceptedTerms": true
}
```

#### Response

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

### 1.2 Authentication

After registration and email verification, you can log in to your account.

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

#### Response

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

### 1.3 Profile Management

View and update your profile information.

#### Get Profile

```
GET /api/users/profile
```

#### Response

```json
{
  "success": true,
  "data": {
    "userId": "user_12345",
    "fullName": "Ahmed Mohamed",
    "email": "ahmed@example.com",
    "phone": "252612345678",
    "country": "Somalia",
    "city": "Mogadishu",
    "role": "shopOwner",
    "createdAt": "2025-01-15T10:30:00Z",
    "shops": [
      {
        "shopId": "shop_6789",
        "name": "Ahmed's Electronics",
        "role": "owner"
      }
    ]
  }
}
```

#### Update Profile

```
PATCH /api/users/profile
```

#### Request Payload

```json
{
  "fullName": "Ahmed Ali Mohamed",
  "phone": "252612345679",
  "city": "Hargeisa"
}
```

#### Response

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "userId": "user_12345",
    "fullName": "Ahmed Ali Mohamed",
    "email": "ahmed@example.com",
    "phone": "252612345679",
    "country": "Somalia",
    "city": "Hargeisa"
  }
}
```

## 2. Shop Management

### 2.1 Shop Creation

Create your shop after registering.

#### Endpoint

```
POST /api/shops
```

#### Request Payload

```json
{
  "name": "Ahmed's Electronics",
  "businessType": "electronics",
  "description": "Electronics retail shop with repair services",
  "address": {
    "street": "Main Street",
    "city": "Hargeisa",
    "district": "Central",
    "country": "Somalia"
  },
  "contactInfo": {
    "email": "shop@example.com",
    "phone": "252612345678",
    "website": "https://ahmeds-electronics.com"
  },
  "operatingHours": {
    "monday": { "open": "08:00", "close": "18:00" },
    "tuesday": { "open": "08:00", "close": "18:00" },
    "wednesday": { "open": "08:00", "close": "18:00" },
    "thursday": { "open": "08:00", "close": "18:00" },
    "friday": { "open": "08:00", "close": "13:00" },
    "saturday": { "open": "09:00", "close": "15:00" },
    "sunday": { "open": "closed", "close": "closed" }
  }
}
```

#### Response

```json
{
  "success": true,
  "message": "Shop created successfully",
  "data": {
    "shopId": "shop_6789",
    "name": "Ahmed's Electronics",
    "businessType": "electronics",
    "owner": {
      "userId": "user_12345",
      "fullName": "Ahmed Ali Mohamed"
    },
    "status": "active",
    "createdAt": "2025-01-15T11:30:00Z"
  }
}
```

### 2.2 Shop Configuration

Update shop settings and preferences.

#### Endpoint

```
PATCH /api/shops/:shopId
```

#### Request Payload

```json
{
  "name": "Ahmed's Tech Shop",
  "description": "Electronics and computer repair services",
  "settings": {
    "currency": "USD",
    "language": "en",
    "timezone": "Africa/Mogadishu",
    "receiptFooter": "Thank you for shopping with us!",
    "enableSmsNotifications": true
  }
}
```

#### Response

```json
{
  "success": true,
  "message": "Shop updated successfully",
  "data": {
    "shopId": "shop_6789",
    "name": "Ahmed's Tech Shop",
    "description": "Electronics and computer repair services",
    "settings": {
      "currency": "USD",
      "language": "en",
      "timezone": "Africa/Mogadishu",
      "receiptFooter": "Thank you for shopping with us!",
      "enableSmsNotifications": true
    }
  }
}
```

### 2.3 Staff Management

Add and manage employees for your shop.

#### Add Employee

```
POST /api/shops/:shopId/employees
```

#### Request Payload

```json
{
  "email": "employee@example.com",
  "fullName": "Farah Hassan",
  "phone": "252612345680",
  "role": "cashier",
  "permissions": [
    "manage_sales",
    "view_customers",
    "record_payments"
  ]
}
```

#### Response

```json
{
  "success": true,
  "message": "Employee invitation sent",
  "data": {
    "employeeId": "emp_1234",
    "fullName": "Farah Hassan",
    "email": "employee@example.com",
    "status": "invited",
    "role": "cashier"
  }
}
```

## 3. Subscription Management

### 3.1 View Subscription Status

Check your current subscription status.

#### Endpoint

```
GET /api/subscriptions/current
```

#### Response

```json
{
  "success": true,
  "data": {
    "subscriptionId": "sub_12345",
    "shopId": "shop_6789",
    "status": "trial",
    "plan": {
      "type": "trial",
      "features": ["basic_debt_tracking", "pos", "customer_management"]
    },
    "dates": {
      "startDate": "2025-01-15T11:30:00Z",
      "endDate": "2025-01-29T11:30:00Z",
      "trialDays": 14,
      "daysRemaining": 10
    },
    "paymentInfo": {
      "lastPayment": null,
      "nextPaymentDue": "2025-01-29T11:30:00Z"
    }
  }
}
```

### 3.2 Subscription Activation

Upgrade from trial to paid subscription.

#### Endpoint

```
POST /api/subscriptions/upgrade
```

#### Request Payload

```json
{
  "planType": "monthly",
  "paymentMethod": "EVC Plus",
  "autoRenew": true
}
```

#### Response

```json
{
  "success": true,
  "message": "Subscription upgrade initiated",
  "data": {
    "subscriptionId": "sub_12345",
    "status": "pending_payment",
    "plan": {
      "type": "monthly",
      "price": 30.00,
      "currency": "USD"
    },
    "paymentInstructions": {
      "methods": ["EVC Plus", "offline"],
      "amount": 30.00,
      "currency": "USD"
    }
  }
}
```

### 3.3 EVC Plus Payment

Pay for subscription using EVC Plus.

#### Endpoint

```
POST /api/subscriptions/pay-evc
```

#### Request Payload

```json
{
  "subscriptionId": "sub_12345",
  "phone": "252612345678",
  "amount": 30.00,
  "planType": "monthly"
}
```

#### Response

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

### 3.4 Offline Payment

Submit proof of offline payment for subscription.

#### Endpoint

```
POST /api/subscriptions/offline-payment
```

#### Request Payload (Form Data)

```
subscriptionId: sub_12345
amount: 30.00
method: Bank Transfer
payerName: Ahmed Ali Mohamed
payerPhone: 252612345679
notes: Bank transfer from Commercial Bank account #12345
planType: monthly
paymentProof: [FILE_UPLOAD]
```

#### Response

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

### 3.5 Subscription Renewal

Renew an expired subscription.

#### Endpoint

```
POST /api/subscriptions/renew
```

#### Request Payload

```json
{
  "subscriptionId": "sub_12345",
  "planType": "yearly",
  "paymentMethod": "EVC Plus"
}
```

#### Response

```json
{
  "success": true,
  "message": "Subscription renewal initiated",
  "data": {
    "subscriptionId": "sub_12345",
    "status": "pending_payment",
    "plan": {
      "type": "yearly",
      "price": 300.00,
      "currency": "USD"
    },
    "paymentInstructions": {
      "methods": ["EVC Plus", "offline"],
      "amount": 300.00,
      "currency": "USD"
    }
  }
}
```

## 4. Customer Management

### 4.1 Adding Customers

Add a new customer to your shop.

#### Endpoint

```
POST /api/shops/:shopId/customers
```

#### Request Payload

```json
{
  "name": "Mohamed Ibrahim",
  "phone": "252612345681",
  "email": "customer@example.com",
  "address": "West District, Hargeisa",
  "idType": "national_id",
  "idNumber": "SOM12345678",
  "notes": "Regular electronics buyer",
  "tags": ["wholesale", "electronics"]
}
```

#### Response

```json
{
  "success": true,
  "message": "Customer added successfully",
  "data": {
    "customerId": "cust_12345",
    "name": "Mohamed Ibrahim",
    "phone": "252612345681",
    "email": "customer@example.com",
    "createdAt": "2025-01-16T09:30:00Z",
    "riskScore": 0
  }
}
```

### 4.2 Managing Customer Information

Update customer details.

#### Endpoint

```
PATCH /api/shops/:shopId/customers/:customerId
```

#### Request Payload

```json
{
  "name": "Mohamed Ali Ibrahim",
  "phone": "252612345682",
  "address": "North District, Hargeisa",
  "notes": "Regular electronics buyer, prefers higher-end products"
}
```

#### Response

```json
{
  "success": true,
  "message": "Customer updated successfully",
  "data": {
    "customerId": "cust_12345",
    "name": "Mohamed Ali Ibrahim",
    "phone": "252612345682",
    "address": "North District, Hargeisa",
    "notes": "Regular electronics buyer, prefers higher-end products"
  }
}
```

### 4.3 Customer History

View a customer's complete history including debts, payments, and purchases.

#### Endpoint

```
GET /api/shops/:shopId/customers/:customerId/history
```

#### Response

```json
{
  "success": true,
  "data": {
    "customer": {
      "customerId": "cust_12345",
      "name": "Mohamed Ali Ibrahim"
    },
    "summary": {
      "totalPurchases": 15,
      "totalSpent": 2500.00,
      "activeDeptCount": 2,
      "totalDebtAmount": 350.00,
      "lastPaymentDate": "2025-01-10T14:20:00Z",
      "lastPurchaseDate": "2025-01-12T11:45:00Z",
      "riskScore": 15
    },
    "debts": [
      {
        "debtId": "debt_6789",
        "amount": 250.00,
        "remainingAmount": 150.00,
        "dueDate": "2025-02-15T00:00:00Z",
        "status": "active",
        "items": ["Samsung A52 Phone"]
      },
      {
        "debtId": "debt_6790",
        "amount": 200.00,
        "remainingAmount": 200.00,
        "dueDate": "2025-02-28T00:00:00Z",
        "status": "active",
        "items": ["JBL Speaker"]
      }
    ],
    "payments": [
      {
        "paymentId": "pay_7890",
        "debtId": "debt_6789",
        "amount": 100.00,
        "date": "2025-01-10T14:20:00Z",
        "method": "Cash"
      }
    ],
    "purchases": [
      {
        "orderId": "order_8901",
        "date": "2025-01-12T11:45:00Z",
        "total": 500.00,
        "items": 3,
        "paymentStatus": "paid"
      }
    ]
  }
}
```

## 5. Debt Management

### 5.1 Recording Debts

Record a new debt for a customer.

#### Endpoint

```
POST /api/shops/:shopId/debts
```

#### Request Payload

```json
{
  "customerId": "cust_12345",
  "amount": 250.00,
  "dueDate": "2025-02-15T00:00:00Z",
  "items": [
    {
      "name": "Samsung A52 Phone",
      "price": 250.00,
      "quantity": 1
    }
  ],
  "initialPayment": 0,
  "notes": "Customer will pay in two installments",
  "terms": "Payment due in 30 days"
}
```

#### Response

```json
{
  "success": true,
  "message": "Debt recorded successfully",
  "data": {
    "debtId": "debt_6789",
    "customerId": "cust_12345",
    "customerName": "Mohamed Ali Ibrahim",
    "amount": 250.00,
    "remainingAmount": 250.00,
    "dueDate": "2025-02-15T00:00:00Z",
    "status": "active",
    "createdAt": "2025-01-16T10:30:00Z"
  }
}
```

### 5.2 Tracking Payments

Record a payment for an existing debt.

#### Endpoint

```
POST /api/payments
```

#### Request Payload

```json
{
  "shopId": "shop_6789",
  "customerId": "cust_12345",
  "customerName": "Mohamed Ali Ibrahim",
  "paymentContext": "debt",
  "debtId": "debt_6789",
  "amount": 100.00,
  "method": "Cash",
  "notes": "First installment payment"
}
```

#### Response

```json
{
  "success": true,
  "message": "Payment created successfully",
  "data": {
    "paymentId": "pay_7890",
    "shopId": "shop_6789",
    "customerId": "cust_12345",
    "debtId": "debt_6789",
    "amount": 100.00,
    "method": "Cash",
    "paymentDate": "2025-01-16T10:35:00Z",
    "status": "confirmed"
  }
}
```

### 5.3 Debt Analytics

View debt analytics for your shop.

#### Endpoint

```
GET /api/shops/:shopId/analytics/debts
```

#### Query Parameters

```
startDate: 2025-01-01
endDate: 2025-01-31
```

#### Response

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalActiveDebts": 45,
      "totalDebtAmount": 12500.00,
      "totalCollected": 5000.00,
      "totalOverdue": 2000.00,
      "averageDebtAmount": 277.78,
      "averagePaybackPeriod": 23 
    },
    "trends": {
      "daily": [
        {
          "date": "2025-01-01",
          "newDebts": 3,
          "amount": 750.00,
          "payments": 400.00
        },
        // More daily data...
      ],
      "weekly": [
        {
          "week": "2025-W01",
          "newDebts": 10,
          "amount": 2500.00,
          "payments": 1000.00
        },
        // More weekly data...
      ]
    },
    "riskDistribution": {
      "low": 30,
      "medium": 10,
      "high": 5
    }
  }
}
```

## 6. POS Operations

### 6.1 Sales Recording

Record a new sale.

#### Endpoint

```
POST /api/shops/:shopId/sales
```

#### Request Payload

```json
{
  "customerId": "cust_12345",
  "items": [
    {
      "productId": "prod_5678",
      "name": "USB Cable",
      "price": 5.00,
      "quantity": 2,
      "discount": 0
    },
    {
      "productId": "prod_5679",
      "name": "Phone Case",
      "price": 15.00,
      "quantity": 1,
      "discount": 2.00
    }
  ],
  "paymentMethod": "Cash",
  "subtotal": 25.00,
  "discount": 2.00,
  "tax": 0,
  "total": 23.00,
  "notes": "Regular customer"
}
```

#### Response

```json
{
  "success": true,
  "message": "Sale recorded successfully",
  "data": {
    "saleId": "sale_3456",
    "receiptNumber": "REC-12345",
    "shopId": "shop_6789",
    "customerId": "cust_12345",
    "total": 23.00,
    "paymentStatus": "paid",
    "createdAt": "2025-01-16T11:30:00Z",
    "receiptUrl": "https://api.deyncare.com/receipts/REC-12345"
  }
}
```

### 6.2 Inventory Management

Add a new product to inventory.

#### Endpoint

```
POST /api/shops/:shopId/products
```

#### Request Payload

```json
{
  "name": "Wireless Earbuds",
  "sku": "WE-001",
  "description": "High-quality wireless earbuds with noise cancellation",
  "category": "Audio",
  "price": 45.00,
  "costPrice": 30.00,
  "quantity": 20,
  "unit": "piece",
  "barcode": "12345678901234",
  "manufacturer": "SoundTech",
  "attributes": {
    "color": "Black",
    "warranty": "1 year",
    "bluetooth": "5.0"
  },
  "lowStockThreshold": 5
}
```

#### Response

```json
{
  "success": true,
  "message": "Product added successfully",
  "data": {
    "productId": "prod_5680",
    "name": "Wireless Earbuds",
    "sku": "WE-001",
    "price": 45.00,
    "quantity": 20,
    "createdAt": "2025-01-16T11:45:00Z"
  }
}
```

### 6.3 Receipt Generation

Generate a receipt for a completed sale.

#### Endpoint

```
GET /api/shops/:shopId/sales/:saleId/receipt
```

#### Response

```json
{
  "success": true,
  "data": {
    "receiptNumber": "REC-12345",
    "shopInfo": {
      "name": "Ahmed's Tech Shop",
      "address": "Main Street, Hargeisa, Somalia",
      "phone": "252612345678",
      "email": "shop@example.com"
    },
    "saleInfo": {
      "date": "2025-01-16T11:30:00Z",
      "customer": "Mohamed Ali Ibrahim",
      "cashier": "Ahmed Ali Mohamed"
    },
    "items": [
      {
        "name": "USB Cable",
        "quantity": 2,
        "unitPrice": 5.00,
        "total": 10.00
      },
      {
        "name": "Phone Case",
        "quantity": 1,
        "unitPrice": 15.00,
        "discount": 2.00,
        "total": 13.00
      }
    ],
    "summary": {
      "subtotal": 25.00,
      "discount": 2.00,
      "tax": 0,
      "total": 23.00
    },
    "paymentMethod": "Cash",
    "footer": "Thank you for shopping with us!",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```
