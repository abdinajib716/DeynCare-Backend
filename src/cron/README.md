# Subscription Management System CRON Jobs

This directory contains the scheduled task system for managing subscription lifecycle events in DeynCare.

## Overview

The subscription management system uses scheduled tasks to handle:

1. **Trial Ending Reminders** - Notify users before their free trial expires
2. **Subscription Expiry Reminders** - Notify users before their paid subscription expires
3. **Auto-Renewal Processing** - Automatically renew subscriptions with auto-renewal enabled
4. **Expired Subscription Deactivation** - Automatically deactivate expired subscriptions

## Usage

### Running All Tasks
```bash
node src/cron/subscriptionTasks.js
# or
node src/cron/subscriptionTasks.js all
```

### Running Individual Tasks
```bash
# Trial ending reminders only
node src/cron/subscriptionTasks.js trialReminders

# Subscription expiry reminders only
node src/cron/subscriptionTasks.js expiryReminders

# Process auto-renewals only
node src/cron/subscriptionTasks.js autoRenewals

# Deactivate expired subscriptions only
node src/cron/subscriptionTasks.js deactivateExpired
```

## Scheduling with CRON

For production environments, you should set up these tasks to run automatically using your server's CRON system.

### Example CRON Setup

Add the following to your server's crontab (edit with `crontab -e`):

```
# Run trial reminders daily at 8:00 AM
0 8 * * * cd /path/to/deyncare-backend && node src/cron/subscriptionTasks.js trialReminders

# Run expiry reminders daily at 9:00 AM
0 9 * * * cd /path/to/deyncare-backend && node src/cron/subscriptionTasks.js expiryReminders

# Run auto-renewals daily at 10:00 AM
0 10 * * * cd /path/to/deyncare-backend && node src/cron/subscriptionTasks.js autoRenewals

# Run expired subscription deactivation daily at 11:00 AM
0 11 * * * cd /path/to/deyncare-backend && node src/cron/subscriptionTasks.js deactivateExpired

# Alternative: Run all tasks at once daily at 8:00 AM
# 0 8 * * * cd /path/to/deyncare-backend && node src/cron/subscriptionTasks.js all
```

### Using the Shell Script

A shell script is provided for convenience and better logging:

1. Edit the `subscription-cron.sh` script to update the PROJECT_DIR path
2. Make the script executable:
   ```bash
   chmod +x subscription-cron.sh
   ```
3. Add it to your crontab:
   ```
   0 8 * * * /path/to/deyncare-backend/src/cron/subscription-cron.sh
   ```

## Implementation Details

- Each task function is exported and can be imported into other modules if needed
- Detailed logs are generated for each run to help with troubleshooting
- Database connections are properly opened and closed for each run
- Tasks run sequentially to avoid potential conflicts

## Error Handling

Each task has independent error handling to ensure that:
1. Errors in one task don't affect others
2. Errors with one subscription don't prevent processing of others
3. All errors are properly logged for investigation

## Configuration

Timing parameters (such as how many days before expiration to send reminders) are 
defined within each task and can be modified as needed.
