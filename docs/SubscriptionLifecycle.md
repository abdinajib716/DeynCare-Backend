# DeynCare Subscription Lifecycle Management

## Overview

This document outlines the complete subscription lifecycle management system implemented in DeynCare. The system handles the entire journey of a subscription from initial creation through trial, paid subscription, renewal, and eventual expiration or cancellation.

## Subscription States

A subscription in DeynCare can exist in the following states:

| Status | Description |
|--------|-------------|
| `trial` | Free trial period (typically 14 days) |
| `active` | Paid subscription in good standing |
| `expired` | Subscription that has reached its end date |
| `canceled` | Subscription terminated by user before end date |
| `suspended` | Temporarily deactivated (e.g., due to payment issues) |

## Full Lifecycle Stages

### 1. Trial Creation

**Implementation:**
- New shops automatically receive a trial subscription
- Trial duration is configurable via `DEFAULT_TRIAL_DAYS` (default: 14 days)
- Full feature access during trial period

**Code Example:**
```javascript
// Create trial subscription
const trialSubscription = await SubscriptionService.createSubscription({
  shopId: newShop._id,
  planType: 'trial'
}, {
  actorId: 'system',
  actorRole: 'system'
});
```

**Automated Tasks:**
- Automatic trial expiry at end date
- Trial ending reminders (typically 2 days before expiration)

### 2. Trial Ending

**Implementation:**
- System identifies trials ending within configurable period (default: 2 days)
- Sends email notifications to shop owners
- Provides upgrade options and guidance

**Code Path:**
1. CRON job: `src/cron/subscriptionTasks.js:processTrialReminders()`
2. Service: `subscriptionService.getTrialsEndingSoon()`
3. Email: `emailService.sendTrialEndingReminderEmail()`

**Usage:**
```bash
# Manual trigger
npm run cron:trials

# Automated via crontab
0 8 * * * cd /path/to/deyncare-backend && node src/cron/subscriptionTasks.js trialReminders
```

### 3. Conversion to Paid

**Implementation:**
- User selects paid plan (monthly/yearly)
- System records payment details
- Subscription status changes from `trial` to `active`
- End date recalculated based on selected plan

**API Endpoints:**
- `POST /api/subscriptions/upgrade` - Upgrade from trial
- `POST /api/subscriptions/:id/payment` - Record payment

**Email Notifications:**
- Subscription upgrade confirmation
- Payment receipt

### 4. Active Subscription Management

**Implementation:**
- Full feature access based on plan type
- Support for plan switching (monthly ↔ yearly)
- Payment recording for manual payments
- Auto-renewal settings management

**API Endpoints:**
- `GET /api/subscriptions/current` - View current subscription
- `PATCH /api/subscriptions/:id/auto-renewal` - Toggle auto-renewal
- `POST /api/subscriptions/:id/renew` - Manual renewal

### 5. Approaching Expiration

**Implementation:**
- System identifies subscriptions expiring soon (default: 5 days)
- Sends different notifications based on auto-renewal status
- Provides renewal guidance for non-auto-renewing subscriptions

**Code Path:**
1. CRON job: `src/cron/subscriptionTasks.js:processExpiryReminders()`
2. Service: `subscriptionService.getExpiringSubscriptions()`
3. Email: `emailService.sendSubscriptionExpiryReminderEmail()`

**Notification Logic:**
- For auto-renewal enabled: Notification of upcoming automatic renewal
- For auto-renewal disabled: Warning of impending expiration

### 6. Auto-Renewal Processing

**Implementation:**
- System identifies subscriptions eligible for auto-renewal
- Processes renewal payment (placeholder for payment gateway integration)
- Extends subscription end date based on plan
- Sends renewal confirmation

**Code Path:**
1. CRON job: `src/cron/subscriptionTasks.js:processAutoRenewals()`
2. Service: `subscriptionService.getSubscriptionsForRenewal()`
3. Service: `subscriptionService.renewSubscription()`
4. Email: `emailService.sendSubscriptionRenewalEmail()`

**Database Updates:**
- Updated end date
- Payment record added to history
- Status remains `active`

### 7. Cancellation

**Implementation:**
- User can cancel subscription at any time
- Option for immediate effect or end of current period
- System updates subscription status
- Sends cancellation confirmation

**API Endpoint:**
- `POST /api/subscriptions/:id/cancel`

**Cancellation Options:**
- `immediateEffect: true` - Immediate cancellation
- `immediateEffect: false` - Cancel at end of current period (default)

**Email Notification:**
- Cancellation confirmation
- Data retention information
- Reactivation instructions

### 8. Expiration Handling

**Implementation:**
- System identifies expired active subscriptions
- Changes status from `active` to `expired`
- Sets data retention period (configurable via `DATA_RETENTION_DAYS`)
- Sends expiration notification

**Code Path:**
1. CRON job: `src/cron/subscriptionTasks.js:processExpiredDeactivation()`
2. Service: `subscriptionService.getExpiredActiveSubscriptions()`
3. Service: `subscriptionService.deactivateExpiredSubscription()`
4. Email: `emailService.sendSubscriptionExpiredEmail()`

**Data Handling:**
```javascript
// Calculate data retention period
const dataRetentionDays = process.env.DATA_RETENTION_DAYS || 30;
const dataRetentionDate = new Date();
dataRetentionDate.setDate(dataRetentionDate.getDate() + parseInt(dataRetentionDays));
subscription.dataRetentionDate = dataRetentionDate;
```

### 9. Reactivation

**Implementation:**
- User can reactivate expired subscription within data retention period
- System creates new subscription with previous configuration
- Data access is restored

**API Endpoint:**
- `POST /api/subscriptions/reactivate`

**Business Rules:**
- Same shop ID maintains data continuity
- Requires new payment
- Previous configuration (plan type, features) is preserved

## Automated Schedule

| Task | Default Schedule | CRON Expression | Environment Variable |
|------|-----------------|-----------------|----------------------|
| Trial Reminders | 8:00 AM daily | `0 8 * * *` | `CRON_TRIAL_REMINDERS` |
| Expiry Reminders | 9:00 AM daily | `0 9 * * *` | `CRON_EXPIRY_REMINDERS` |
| Auto-Renewals | 10:00 AM daily | `0 10 * * *` | `CRON_AUTO_RENEWALS` |
| Expired Deactivation | 11:00 AM daily | `0 11 * * *` | `CRON_DEACTIVATE_EXPIRED` |

## Configuration Options

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `DEFAULT_TRIAL_DAYS` | `14` | Duration of free trial (days) |
| `DATA_RETENTION_DAYS` | `30` | How long data is retained after expiration (days) |
| `ENABLE_SCHEDULER` | `false` | Whether to use in-app scheduler (true) or external CRON (false) |

## Email Notifications

| Email Template | Trigger | Purpose |
|----------------|---------|---------|
| `trial-ending.html` | 2 days before trial expiry | Encourage upgrade |
| `subscription-upgraded.html` | After upgrade from trial | Confirm paid subscription |
| `payment-confirmation.html` | After payment recorded | Provide payment receipt |
| `subscription-renewed.html` | After subscription renewal | Confirm renewal and payment |
| `subscription-canceled.html` | After cancellation | Confirm cancellation and provide reactivation option |
| `subscription-expired.html` | After subscription expiry | Notify of expiry and data retention |

## Subscription History Tracking

All subscription events are logged in the `history` array with:

- Action type (created, renewed, canceled, expired, etc.)
- Date and time
- Actor (user or system)
- Additional details specific to the action

This provides a complete audit trail for subscription lifecycle events.

## Data Retention Policy

1. After subscription expires, shop data is retained for a configurable period (default: 30 days)
2. During this period, the shop owner can reactivate their subscription and regain access
3. After the retention period, data is eligible for deletion/archiving (handled separately)

## Integration Points

- **Payment Processing** - Placeholder for payment gateway integration
- **User Interface** - Frontend components for subscription management
- **Reporting** - Subscription metrics and analytics
- **Data Export** - User data export before expiration

## Testing the Lifecycle

To manually test the subscription lifecycle:

```bash
# Create a new subscription with 1-day trial
# This creates a trial that will expire tomorrow
curl -X POST http://localhost:5000/api/subscriptions -H "Content-Type: application/json" -d '{"shopId":"shop123","planType":"trial","trialDays":1}'

# Run trial reminder job (will detect tomorrow's expiry)
npm run cron:trials

# Advance system date by 2 days (in test environment)
# Then run expired deactivation job
npm run cron:deactivate
```
