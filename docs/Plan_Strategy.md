# DeynCare Subscription Plan Strategy

**Document Date:** May 3, 2025  
**Version:** 1.0

## Executive Summary

This document outlines DeynCare's current subscription model and proposes a new tiered plan strategy to better serve our customers and optimize revenue. The proposed changes will transform our single-plan approach into a feature-differentiated multi-tier system that caters to businesses of various sizes and needs.

---

## Current Subscription Model

### Overview

DeynCare currently employs a simple, duration-based subscription model where all customers receive the same features with different billing cycles.

### Plan Structure

| Aspect | Details |
|--------|---------|
| **Plan Name** | Standard (single plan for all users) |
| **Plan Types** | Trial, Monthly, Yearly |
| **Features** | All features included in all plans |
| **Resource Limits** | Same for all plans (1000 products, 10 employees, 500MB storage, etc.) |

### Current Pricing

| Plan Type | Price | Features |
|-----------|-------|----------|
| Trial | Free | All features for limited time |
| Monthly | $10/month | All features |
| Yearly | $8/month ($96/year) | All features (20% savings) |

### Payment Methods

* Cash (Offline payment)
* EVC Plus (Mobile money)
* Free (for trials)

### Current Implementation

```javascript
// From subscription.model.js
plan: {
  name: {
    type: String,
    enum: ['standard'],
    default: 'standard',
    required: true
  },
  type: {
    type: String,
    enum: ['trial', 'monthly', 'yearly'],
    required: true
  },
  features: {
    debtTracking: { type: Boolean, default: true },
    customerPayments: { type: Boolean, default: true },
    smsReminders: { type: Boolean, default: true },
    smartRiskScore: { type: Boolean, default: true },
    productSalesSystem: { type: Boolean, default: true },
    businessDashboard: { type: Boolean, default: true },
    exportReports: { type: Boolean, default: true },
    customerProfiles: { type: Boolean, default: true },
    posAndReceipt: { type: Boolean, default: true },
    fullTrialAccess: { 
      type: Boolean, 
      default: function() {
        return this.plan.type === 'trial';
      }
    },
    offlineSupport: { type: Boolean, default: true }
  },
  limits: {
    maxProducts: { type: Number, default: 1000 },
    maxEmployees: { type: Number, default: 10 },
    maxStorageMB: { type: Number, default: 500 },
    maxCustomers: { type: Number, default: 1000 },
    maxDailyTransactions: { type: Number, default: 500 }
  }
}
```

### Current Strengths

* **Simplicity:** Easy for customers to understand
* **Implementation:** Straightforward to code and maintain
* **Operations:** Simple billing and customer support

### Current Limitations

* **Revenue Ceiling:** No upsell opportunities beyond yearly billing
* **Market Coverage:** May be too expensive for small businesses and underpriced for larger ones
* **Feature Evolution:** Difficult to monetize new premium features
* **Customer Segmentation:** Cannot target specific business types or sizes

---

## Proposed Tiered Plan Strategy

### Overview

The proposed strategy introduces three distinct subscription tiers with feature differentiation, scalable resource limits, and appropriate pricing for each target segment.

### Plan Structure

#### Basic Plan
Entry-level plan for small businesses or those just starting with digital solutions.

#### Standard Plan
Mid-tier plan for growing businesses with more robust needs.

#### Premium Plan
Comprehensive solution for established businesses requiring advanced features.

### Feature Distribution

| Feature | Basic | Standard | Premium |
|---------|-------|----------|---------|
| **Debt Tracking** | Basic | Advanced | Comprehensive |
| **Customer Management** | Limited | Full | Advanced |
| **POS System** | Basic | Full | Advanced |
| **SMS Reminders** | ❌ | ✅ | ✅ |
| **Smart Risk Score** | ❌ | ❌ | ✅ |
| **Business Dashboard** | Basic | Full | Advanced |
| **Export Reports** | ❌ | ✅ | ✅ |
| **Customer Profiles** | Basic | Enhanced | Advanced |
| **Receipt Generation** | Basic | Full | Customizable |
| **Offline Support** | ❌ | ❌ | ✅ |

### Resource Limits

| Resource | Basic | Standard | Premium |
|----------|-------|----------|---------|
| **Products** | 200 | 500 | Unlimited |
| **Employees** | 3 | 5 | 10+ |
| **Storage** | 100MB | 250MB | 1GB |
| **Customers** | 200 | 500 | Unlimited |
| **Daily Transactions** | 100 | 250 | Unlimited |

### Proposed Pricing

| Plan | Monthly Price | Yearly Price | Savings |
|------|--------------|-------------|---------|
| **Basic** | $10/month | $96/year | 20% |
| **Standard** | $25/month | $240/year | 20% |
| **Premium** | $50/month | $480/year | 20% |

### Payment Methods
* Cash (Offline payment)
* EVC Plus (Mobile money)
* Free (for trials)

---

## Implementation Requirements

### Database Changes

#### 1. Create New Plan Model

```javascript
const planSchema = new mongoose.Schema({
  planId: {
    type: String,
    required: true,
    unique: true,
    default: () => generateId('plan')
  },
  name: {
    type: String,
    required: true,
    enum: ['basic', 'standard', 'premium']
  },
  displayName: {
    type: String,
    required: true
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true
  },
  features: {
    debtTracking: {
      enabled: { type: Boolean, default: true },
      level: { type: String, enum: ['basic', 'advanced', 'comprehensive'] }
    },
    customerPayments: {
      enabled: { type: Boolean, default: true },
      level: { type: String, enum: ['basic', 'full', 'advanced'] }
    },
    smsReminders: { type: Boolean },
    smartRiskScore: { type: Boolean },
    productSalesSystem: {
      enabled: { type: Boolean, default: true },
      level: { type: String, enum: ['basic', 'full', 'advanced'] }
    },
    businessDashboard: {
      enabled: { type: Boolean, default: true },
      level: { type: String, enum: ['basic', 'full', 'advanced'] }
    },
    exportReports: { type: Boolean },
    customerProfiles: {
      enabled: { type: Boolean, default: true },
      level: { type: String, enum: ['basic', 'enhanced', 'advanced'] }
    },
    posAndReceipt: {
      enabled: { type: Boolean, default: true },
      level: { type: String, enum: ['basic', 'full', 'customizable'] }
    },
    offlineSupport: { type: Boolean }
  },
  limits: {
    maxProducts: Number,
    maxEmployees: Number,
    maxStorageMB: Number,
    maxCustomers: Number,
    maxDailyTransactions: Number
  },
  pricing: {
    monthly: {
      amount: Number,
      currency: { type: String, default: 'USD' }
    },
    yearly: {
      amount: Number,
      currency: { type: String, default: 'USD' }
    }
  },
  trialDays: {
    type: Number,
    default: 14
  },
  metadata: {
    isDefault: Boolean,
    sortOrder: Number,
    highlighted: Boolean,
    recommendedFor: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
});
```

#### 2. Update Subscription Model

```javascript
// Add to existing subscription model
planId: {
  type: String,
  ref: 'Plan',
  required: true
},
// Keep existing fields for backward compatibility
```

### Service Layer Changes

#### 1. Plan Management Service

Create a new service to handle plan CRUD operations:

```javascript
// planService.js
const PlanService = {
  createPlan: async (planData) => { /* ... */ },
  getPlanById: async (planId) => { /* ... */ },
  getActivePlans: async () => { /* ... */ },
  updatePlan: async (planId, updateData) => { /* ... */ },
  deactivatePlan: async (planId) => { /* ... */ }
};
```

#### 2. Feature Authorization Service

Add methods to check feature availability:

```javascript
// featureService.js
const FeatureService = {
  canAccessFeature: async (shopId, featureName) => {
    // Get active subscription
    const subscription = await SubscriptionService.getActiveSubscription(shopId);
    if (!subscription) return false;
    
    // Get plan details
    const plan = await PlanService.getPlanById(subscription.planId);
    if (!plan) return false;
    
    // Check if feature is enabled in plan
    return plan.features[featureName] === true || 
           (typeof plan.features[featureName] === 'object' && 
            plan.features[featureName].enabled === true);
  },
  
  getFeatureLevel: async (shopId, featureName) => {
    // Similar to above, but returns the feature level
    // ...
  }
};
```

### API Endpoints

Create new endpoints for plan management:

1. GET `/api/plans` - List available plans
2. GET `/api/plans/:planId` - Get plan details
3. POST `/api/plans` - Create new plan (admin only)
4. PUT `/api/plans/:planId` - Update plan (admin only)
5. DELETE `/api/plans/:planId` - Deactivate plan (admin only)

### Frontend Changes

1. **Plan Selection UI**: Create a comparison table for plans
2. **Feature-gated UI**: Add conditional rendering based on plan features
3. **Admin Dashboard**: Create plan management interface
4. **Upgrade Prompts**: Add contextual upgrade suggestions when accessing premium features

---

## Migration Strategy

### Data Migration

1. **Create default plans** in the database
2. **Map current subscriptions** to appropriate new plans:
   - All existing subscriptions initially mapped to Standard plan
   - Maintain pricing for existing customers (grandfather clause)

```javascript
// Migration script
async function migrateSubscriptions() {
  // Create plans if they don't exist
  const basicPlan = await ensurePlanExists('basic');
  const standardPlan = await ensurePlanExists('standard');
  const premiumPlan = await ensurePlanExists('premium');
  
  // Update all existing subscriptions
  const subscriptions = await Subscription.find({});
  
  for (const subscription of subscriptions) {
    // Default to standard plan
    subscription.planId = standardPlan.planId;
    
    // Mark as legacy pricing if applicable
    subscription.legacyPricing = true;
    
    await subscription.save();
  }
  
  console.log(`Migrated ${subscriptions.length} subscriptions`);
}
```

### Customer Communication

1. **Announcement emails** explaining the new plan structure
2. **Documentation updates** for the new features and limitations
3. **In-app notifications** about the changes
4. **Transition period** of at least 30 days

---

## Comparative Analysis

| Aspect | Current Model | Proposed Model |
|--------|--------------|----------------|
| **Revenue Potential** | Limited by single price point | Multiple price points, higher ARPU potential |
| **Market Coverage** | One-size-fits-all | Segmented to address different market needs |
| **Feature Monetization** | All features included | Premium features as upsell opportunities |
| **Pricing Flexibility** | Duration-based only | Feature-based + duration-based |
| **Implementation Complexity** | Simple | Moderate |
| **Operational Overhead** | Low | Moderate |
| **Customer Support** | Straightforward | May require feature explanation |
| **Evolution Path** | Limited | Highly adaptable |

---

## Benefits of New Strategy

### Business Benefits

1. **Increased Revenue**: Higher price points for premium features
2. **Market Expansion**: Entry-level option for small businesses
3. **Improved Retention**: Clear upgrade path as customers grow
4. **Competitive Positioning**: Better ability to compete on different segments

### Technical Benefits

1. **Feature Flexibility**: Easier to introduce premium features
2. **Experimentation**: Can A/B test different feature combinations
3. **Scalability**: Plan structure can grow with the product
4. **Data Insights**: Better understanding of feature usage and value

---

## Potential Challenges

1. **Customer Perception**: Existing customers may view as a price increase
2. **Implementation Effort**: Requires significant code changes
3. **Feature Gating**: Requires careful UI handling of unavailable features
4. **Support Complexity**: More complex subscription scenarios to support

---

## Recommended Next Steps

1. **Define Plans**: Finalize feature distribution and pricing
2. **Technical Implementation**: Create Plan model and service layer
3. **Admin Dashboard**: Build plan management interface
4. **Migration Strategy**: Develop and test migration scripts
5. **Customer Communication**: Prepare announcement materials
6. **Launch Timeline**: Set launch date and transition period

---

## Conclusion

The proposed tiered subscription model represents a strategic shift from a simple, one-size-fits-all approach to a more sophisticated, market-segmented strategy. This change will enable DeynCare to better serve businesses of various sizes and needs while optimizing revenue through appropriate feature differentiation and pricing.

The implementation requires moderate technical effort but offers significant long-term benefits in terms of revenue potential, market coverage, and product evolution flexibility.

---

*Document prepared by DeynCare Team*
