# Advanced Plan Management System

This document outlines the architecture and implementation of the dynamic plan management system in DeynCare. This system transitions from hardcoded features to a fully dynamic, SuperAdmin-controlled platform for maximum flexibility.

## Core Concepts

The advanced plan management system uses a hybrid approach that combines:

1. **Dynamic Module Control**: SuperAdmin can enable/disable entire functionality modules
2. **Feature Flags**: Fine-grained control of specific features within modules
3. **Resource Limits**: Configurable limits for various resources (products, users, storage, etc.)
4. **Plan Templates**: Pre-defined plans with different feature sets and limits
5. **Shop-specific Overrides**: Custom modifications for individual shops

## System Architecture

### 1. Data Models

#### PricingPlan Model
The central model that defines what features and modules are available in each plan type:

```javascript
{
  planId: "PLAN-12345",
  name: "premium",
  type: "monthly",
  displayName: "Premium Plan",
  description: "Full-featured plan for growing businesses",
  
  // Modules available in this plan
  modules: [
    {
      name: "customers",
      enabled: true,
      limits: {
        maxCustomers: 5000
      }
    },
    {
      name: "products",
      enabled: true,
      limits: {
        maxProducts: 1000
      }
    },
    // Other modules...
  ],
  
  // Global features across modules
  features: {
    smsNotifications: true,
    emailNotifications: true,
    exportReports: true,
    riskAnalysis: true,
    customBranding: true,
    apiAccess: true
  },
  
  // Global resource limits
  limits: {
    maxStorageMB: 1000,
    maxEmployees: 15,
    maxDailyTransactions: 1000
  },
  
  pricing: {
    basePrice: 30,
    currency: "USD",
    billingCycle: "monthly"
  },
  
  isActive: true
}
```

#### Shop Model
Shops reference a plan and can have customizations:

```javascript
{
  shopId: "SHOP-12345",
  // Basic shop info...
  
  subscription: {
    planId: "PLAN-12345", // Reference to PricingPlan
    startDate: "2025-01-01T00:00:00Z",
    endDate: "2025-02-01T00:00:00Z",
    
    // Optional overrides for this specific shop
    overrides: {
      modules: {
        customers: {
          enabled: true,
          limits: {
            maxCustomers: 10000 // Special allowance for this shop
          }
        }
      },
      features: {
        smsNotifications: false // Disabled specifically for this shop
      }
    }
  }
}
```

### 2. Access Control System

The system uses middleware to enforce module and feature access:

```javascript
// Module access middleware
const checkModuleAccess = (moduleName) => async (req, res, next) => {
  // Get shop and plan details
  // Check if module is enabled
  // Add module config to request for downstream use
};

// Feature check (can be used in controllers)
const checkFeatureAccess = (featureName) => async (req, res, next) => {
  // Check if feature is enabled in plan
};

// Resource limit check
const checkResourceLimit = (resourceType) => async (req, res, next) => {
  // Check if operation would exceed resource limits
};
```

## SuperAdmin Control Panel

The SuperAdmin has full control over the plan system through:

1. **Plan Management Dashboard**
   - Create, edit, and delete plan templates
   - Control pricing and billing cycles
   - Set which modules are included in each plan
   - Configure feature flags and resource limits

2. **Module Configuration Interface**
   - Enable/disable entire modules
   - Set module-specific limits
   - Configure module dependencies

3. **Shop Subscription Management**
   - Assign plans to shops
   - Apply shop-specific overrides
   - View subscription status and history

## Implementation Guide

### Step 1: Create Dynamic Plan Infrastructure

1. Implement the enhanced PricingPlan model with modules, features, and limits
2. Create admin API endpoints for plan management
3. Develop middleware for access control
4. Update Shop model to reference plans and support overrides

### Step 2: Migrate Existing Features

1. Map hardcoded features to dynamic plan configuration
2. Update controllers to check feature access
3. Apply module access middleware to routes
4. Implement resource limit checks

### Step 3: Develop SuperAdmin Interface

1. Create plan management dashboard
2. Implement module configuration screens
3. Build shop subscription management tools
4. Develop reporting and analytics for plan usage

## Use Cases

### Basic: Standard Plan Assignment

1. SuperAdmin creates different plan tiers (Basic, Pro, Enterprise)
2. When a shop is created, it is assigned a plan
3. Shop functionality is automatically limited based on plan

### Advanced: Custom Shop Configuration

1. A shop needs special access to a premium feature
2. SuperAdmin applies a shop-specific override
3. Shop gets access to that feature while maintaining its current plan

### Promotional: Temporary Access

1. SuperAdmin wants to run a promotion offering premium features
2. Creates a time-limited custom plan or applies temporary overrides
3. Shops get temporary access to premium features

## Benefits

1. **Complete Control**: SuperAdmin has granular control over all system features
2. **Business Flexibility**: Easily create new plans or modify existing ones without code changes
3. **Custom Solutions**: Apply shop-specific overrides for special cases
4. **Incremental Revenue**: Create upsell opportunities with premium features
5. **Scalable Architecture**: Easily add new modules and features without system redesign

## Frontend Integration

The frontend application should:

1. Fetch the shop's plan configuration on login
2. Dynamically render UI components based on available modules
3. Show/hide features based on access levels
4. Display appropriate upgrade prompts for unavailable features
5. Clearly indicate resource usage and limits

## Monitoring and Analytics

The system includes:

1. **Usage Tracking**: Monitor how shops use different modules and features
2. **Limit Alerts**: Notify shops when approaching resource limits
3. **Upgrade Opportunities**: Identify shops that frequently encounter limits
4. **Plan Performance**: Analyze which plans are most popular and profitable

## Conclusion

This advanced plan management system transforms DeynCare from a fixed-feature platform to a flexible, dynamic SaaS solution with full SuperAdmin control. By implementing this system, DeynCare can offer tailored solutions to different customer segments, maximize revenue through tiered pricing, and quickly adapt to changing market needs without code changes.
