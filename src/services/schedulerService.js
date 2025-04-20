/**
 * Scheduler Service
 * Handles scheduled tasks using CRON jobs
 */
const cron = require('node-cron');
const SubscriptionService = require('./subscriptionService');
const EmailService = require('./emailService');
const ShopService = require('./shopService');
const { logInfo, logSuccess, logError } = require('../utils');

/**
 * SchedulerService provides methods for setting up and managing scheduled tasks
 */
const SchedulerService = {
  /**
   * Initialize all scheduled tasks
   */
  initializeScheduledTasks: () => {
    logInfo('Initializing scheduled tasks...', 'SchedulerService');
    
    // Set up trial reminder CRON job - runs daily at 8 AM
    SchedulerService.setupTrialReminderJob();
    
    // Set up subscription expiry reminder - runs daily at 9 AM
    SchedulerService.setupSubscriptionExpiryReminderJob();
    
    // Set up subscription renewal job - runs daily at 10 AM
    SchedulerService.setupSubscriptionRenewalJob();
    
    // Set up subscription deactivation job - runs daily at 11 AM
    SchedulerService.setupSubscriptionDeactivationJob();
    
    logSuccess('All scheduled tasks initialized', 'SchedulerService');
  },
  
  /**
   * Set up CRON job for trial ending reminders
   * Runs daily at 8 AM
   */
  setupTrialReminderJob: () => {
    cron.schedule('0 8 * * *', async () => {
      try {
        logInfo('Running trial reminder job', 'SchedulerService');
        
        // Get trials ending in the next 2 days
        const endingTrials = await SubscriptionService.getTrialsEndingSoon(2);
        
        if (endingTrials.length === 0) {
          logInfo('No trials ending soon', 'SchedulerService');
          return;
        }
        
        logInfo(`Found ${endingTrials.length} trials ending soon`, 'SchedulerService');
        
        // Process each trial
        for (const trial of endingTrials) {
          try {
            // Get shop information
            const shop = await ShopService.getShopById(trial.shopId);
            
            if (!shop) {
              logError(`Shop not found for trial: ${trial.subscriptionId}`, 'SchedulerService');
              continue;
            }
            
            // Calculate days remaining
            const daysLeft = trial.daysRemaining;
            
            // Send reminder email
            await EmailService.sendTrialEndingReminderEmail({
              email: shop.email,
              shopName: shop.shopName,
              trialEndsAt: trial.dates.trialEndsAt,
              daysLeft,
              features: trial.plan.features
            });
            
            // Mark reminder as sent to prevent duplicate emails
            trial.renewalSettings.reminderSent = true;
            await trial.save();
            
            logSuccess(`Sent trial ending reminder for shop: ${shop.shopName}`, 'SchedulerService');
          } catch (error) {
            logError(`Failed to process trial reminder for: ${trial.subscriptionId}`, 'SchedulerService', error);
          }
        }
      } catch (error) {
        logError('Trial reminder job failed', 'SchedulerService', error);
      }
    });
    
    logSuccess('Trial reminder job scheduled', 'SchedulerService');
  },
  
  /**
   * Set up CRON job for subscription expiry reminders
   * Runs daily at 9 AM
   */
  setupSubscriptionExpiryReminderJob: () => {
    cron.schedule('0 9 * * *', async () => {
      try {
        logInfo('Running subscription expiry reminder job', 'SchedulerService');
        
        // Get subscriptions expiring in the next 5 days
        const expiringSubscriptions = await SubscriptionService.getExpiringSubscriptions(5);
        
        if (expiringSubscriptions.length === 0) {
          logInfo('No subscriptions expiring soon', 'SchedulerService');
          return;
        }
        
        logInfo(`Found ${expiringSubscriptions.length} subscriptions expiring soon`, 'SchedulerService');
        
        // Process each expiring subscription
        for (const subscription of expiringSubscriptions) {
          try {
            // Get shop information
            const shop = await ShopService.getShopById(subscription.shopId);
            
            if (!shop) {
              logError(`Shop not found for subscription: ${subscription.subscriptionId}`, 'SchedulerService');
              continue;
            }
            
            // Calculate days remaining
            const daysLeft = subscription.daysRemaining;
            
            // Send reminder email
            await EmailService.sendSubscriptionExpiryReminderEmail({
              email: shop.email,
              shopName: shop.shopName,
              endDate: subscription.dates.endDate,
              daysLeft,
              planType: subscription.plan.type,
              autoRenew: subscription.renewalSettings.autoRenew
            });
            
            // Mark reminder as sent to prevent duplicate emails
            subscription.renewalSettings.reminderSent = true;
            await subscription.save();
            
            logSuccess(`Sent expiry reminder for shop: ${shop.shopName}`, 'SchedulerService');
          } catch (error) {
            logError(`Failed to process expiry reminder for: ${subscription.subscriptionId}`, 'SchedulerService', error);
          }
        }
      } catch (error) {
        logError('Subscription expiry reminder job failed', 'SchedulerService', error);
      }
    });
    
    logSuccess('Subscription expiry reminder job scheduled', 'SchedulerService');
  },
  
  /**
   * Set up CRON job for subscription auto-renewal
   * Runs daily at 10 AM
   */
  setupSubscriptionRenewalJob: () => {
    cron.schedule('0 10 * * *', async () => {
      try {
        logInfo('Running subscription renewal job', 'SchedulerService');
        
        // Get subscriptions ready for renewal (expiring in the next 3 days with auto-renew enabled)
        const renewalSubscriptions = await SubscriptionService.getSubscriptionsForRenewal(3);
        
        if (renewalSubscriptions.length === 0) {
          logInfo('No subscriptions ready for renewal', 'SchedulerService');
          return;
        }
        
        logInfo(`Found ${renewalSubscriptions.length} subscriptions for renewal`, 'SchedulerService');
        
        // Process each renewal
        for (const subscription of renewalSubscriptions) {
          try {
            // Get shop information
            const shop = await ShopService.getShopById(subscription.shopId);
            
            if (!shop) {
              logError(`Shop not found for subscription: ${subscription.subscriptionId}`, 'SchedulerService');
              continue;
            }
            
            // Record payment (placeholder for actual payment processing)
            const updatedSubscription = await SubscriptionService.recordPayment(
              subscription.subscriptionId,
              {
                transactionId: `auto_renewal_${Date.now()}`,
                method: subscription.payment.method,
                amount: subscription.totalPrice,
                extend: true
              },
              {
                actorId: 'system',
                actorRole: 'system'
              }
            );
            
            // Send renewal confirmation email
            await EmailService.sendSubscriptionRenewalEmail({
              email: shop.email,
              shopName: shop.shopName,
              endDate: updatedSubscription.dates.endDate,
              planType: updatedSubscription.plan.type,
              price: updatedSubscription.totalPrice,
              currency: updatedSubscription.pricing.currency
            });
            
            logSuccess(`Auto-renewed subscription for shop: ${shop.shopName}`, 'SchedulerService');
          } catch (error) {
            logError(`Failed to auto-renew subscription: ${subscription.subscriptionId}`, 'SchedulerService', error);
            
            // Increment failed attempts
            subscription.renewalSettings.renewalAttempts += 1;
            await subscription.save();
          }
        }
      } catch (error) {
        logError('Subscription renewal job failed', 'SchedulerService', error);
      }
    });
    
    logSuccess('Subscription renewal job scheduled', 'SchedulerService');
  },
  
  /**
   * Set up CRON job to auto-deactivate expired subscriptions
   * Runs daily at 11 AM
   */
  setupSubscriptionDeactivationJob: () => {
    cron.schedule('0 11 * * *', async () => {
      try {
        logInfo('Running subscription deactivation job', 'SchedulerService');
        
        // Get expired subscriptions that are still active
        const expiredSubscriptions = await SubscriptionService.getExpiredActiveSubscriptions();
        
        if (expiredSubscriptions.length === 0) {
          logInfo('No expired active subscriptions found', 'SchedulerService');
          return;
        }
        
        logInfo(`Found ${expiredSubscriptions.length} expired subscriptions to deactivate`, 'SchedulerService');
        
        // Process each expired subscription
        for (const subscription of expiredSubscriptions) {
          try {
            // Get shop information
            const shop = await ShopService.getShopById(subscription.shopId);
            
            if (!shop) {
              logError(`Shop not found for subscription: ${subscription._id}`, 'SchedulerService');
              continue;
            }
            
            // Deactivate the subscription
            const deactivatedSubscription = await SubscriptionService.deactivateExpiredSubscription(
              subscription._id,
              {
                actorId: 'system',
                actorRole: 'system',
                reason: 'Automatic deactivation due to subscription expiration'
              }
            );
            
            // Send expiration notification email
            await EmailService.sendSubscriptionExpiredEmail({
              email: shop.email,
              shopName: shop.name,
              endDate: subscription.endDate,
              planType: subscription.planType,
              gracePeriodDays: 30 // Configurable grace period before data deletion
            });
            
            logSuccess(`Deactivated expired subscription for shop: ${shop.name} (ID: ${subscription._id})`, 'SchedulerService');
          } catch (error) {
            logError(`Failed to deactivate expired subscription: ${subscription._id}`, 'SchedulerService', error);
          }
        }
        
        logSuccess('Subscription deactivation job completed', 'SchedulerService');
      } catch (error) {
        logError('Subscription deactivation job failed', 'SchedulerService', error);
      }
    });
    
    logSuccess('Subscription deactivation job scheduled', 'SchedulerService');
  }
};

module.exports = SchedulerService;
