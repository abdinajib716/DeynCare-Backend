/**
 * Subscription CRON Tasks
 * Entry point for all subscription-related scheduled tasks
 * Can be executed directly by Node or called from external schedulers
 * 
 * Usage: node src/cron/subscriptionTasks.js [taskName]
 * If taskName is provided, only that specific task will run
 * Otherwise, all subscription tasks will run in sequence
 * 
 * Available tasks:
 * - trialReminders
 * - expiryReminders
 * - autoRenewals
 * - deactivateExpired
 * - all (default)
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const SubscriptionService = require('../services/subscriptionService');
const EmailService = require('../services/emailService');
const ShopService = require('../services/shopService');
const { logInfo, logSuccess, logError } = require('../utils');

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectToDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logSuccess('Connected to MongoDB', 'SubscriptionCron');
  } catch (error) {
    logError('Failed to connect to MongoDB', 'SubscriptionCron', error);
    process.exit(1);
  }
};

/**
 * Process trial ending reminders
 */
const processTrialReminders = async () => {
  try {
    logInfo('Running trial reminder task', 'SubscriptionCron');
    
    // Get trials ending in the next 2 days
    const endingTrials = await SubscriptionService.getTrialsEndingSoon(2);
    
    if (endingTrials.length === 0) {
      logInfo('No trials ending soon', 'SubscriptionCron');
      return;
    }
    
    logInfo(`Found ${endingTrials.length} trials ending soon`, 'SubscriptionCron');
    
    // Process each trial
    for (const trial of endingTrials) {
      try {
        // Get shop information
        const shop = await ShopService.getShopById(trial.shopId);
        
        if (!shop) {
          logError(`Shop not found for trial: ${trial._id}`, 'SubscriptionCron');
          continue;
        }
        
        // Calculate days remaining
        const daysLeft = Math.ceil((new Date(trial.endDate) - new Date()) / (1000 * 60 * 60 * 24));
        
        // Send reminder email
        await EmailService.sendTrialEndingReminderEmail({
          email: shop.email,
          shopName: shop.name,
          trialEndsAt: trial.endDate,
          daysLeft,
          features: trial.features || {}
        });
        
        // Mark reminder as sent to prevent duplicate emails
        trial.reminderSent = true;
        await trial.save();
        
        logSuccess(`Sent trial ending reminder for shop: ${shop.name}`, 'SubscriptionCron');
      } catch (error) {
        logError(`Failed to process trial reminder for: ${trial._id}`, 'SubscriptionCron', error);
      }
    }
    
    logSuccess('Trial reminder task completed', 'SubscriptionCron');
  } catch (error) {
    logError('Trial reminder task failed', 'SubscriptionCron', error);
  }
};

/**
 * Process subscription expiry reminders
 */
const processExpiryReminders = async () => {
  try {
    logInfo('Running subscription expiry reminder task', 'SubscriptionCron');
    
    // Get subscriptions expiring in the next 5 days
    const expiringSubscriptions = await SubscriptionService.getExpiringSubscriptions(5);
    
    if (expiringSubscriptions.length === 0) {
      logInfo('No subscriptions expiring soon', 'SubscriptionCron');
      return;
    }
    
    logInfo(`Found ${expiringSubscriptions.length} subscriptions expiring soon`, 'SubscriptionCron');
    
    // Process each expiring subscription
    for (const subscription of expiringSubscriptions) {
      try {
        // Get shop information
        const shop = await ShopService.getShopById(subscription.shopId);
        
        if (!shop) {
          logError(`Shop not found for subscription: ${subscription._id}`, 'SubscriptionCron');
          continue;
        }
        
        // Calculate days remaining
        const daysLeft = Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24));
        
        // Send reminder email
        await EmailService.sendSubscriptionExpiryReminderEmail({
          email: shop.email,
          shopName: shop.name,
          endDate: subscription.endDate,
          daysLeft,
          planType: subscription.planType,
          autoRenew: subscription.autoRenew
        });
        
        // Mark reminder as sent to prevent duplicate emails
        subscription.reminderSent = true;
        await subscription.save();
        
        logSuccess(`Sent expiry reminder for shop: ${shop.name}`, 'SubscriptionCron');
      } catch (error) {
        logError(`Failed to process expiry reminder for: ${subscription._id}`, 'SubscriptionCron', error);
      }
    }
    
    logSuccess('Subscription expiry reminder task completed', 'SubscriptionCron');
  } catch (error) {
    logError('Subscription expiry reminder task failed', 'SubscriptionCron', error);
  }
};

/**
 * Process subscription auto-renewals
 */
const processAutoRenewals = async () => {
  try {
    logInfo('Running subscription renewal task', 'SubscriptionCron');
    
    // Get subscriptions ready for renewal (expiring in the next 3 days with auto-renew enabled)
    const renewalSubscriptions = await SubscriptionService.getSubscriptionsForRenewal(3);
    
    if (renewalSubscriptions.length === 0) {
      logInfo('No subscriptions ready for renewal', 'SubscriptionCron');
      return;
    }
    
    logInfo(`Found ${renewalSubscriptions.length} subscriptions for renewal`, 'SubscriptionCron');
    
    // Process each renewal
    for (const subscription of renewalSubscriptions) {
      try {
        // Get shop information
        const shop = await ShopService.getShopById(subscription.shopId);
        
        if (!shop) {
          logError(`Shop not found for subscription: ${subscription._id}`, 'SubscriptionCron');
          continue;
        }
        
        // Get pricing information
        const price = subscription.planType === 'yearly' ? 96 : 10; // Default values
        
        // Record automatic payment (placeholder for actual payment processing)
        const renewedSubscription = await SubscriptionService.renewSubscription(
          subscription._id,
          {
            paymentMethod: subscription.paymentMethod || 'credit_card',
            transactionId: `auto_renewal_${Date.now()}`
          },
          {
            actorId: 'system',
            actorRole: 'system'
          }
        );
        
        // Send renewal confirmation email
        await EmailService.sendSubscriptionRenewalEmail({
          email: shop.email,
          shopName: shop.name,
          endDate: renewedSubscription.endDate,
          planType: renewedSubscription.planType,
          price,
          currency: 'USD',
          paymentMethod: subscription.paymentMethod || 'Credit Card'
        });
        
        logSuccess(`Renewed subscription for shop: ${shop.name}`, 'SubscriptionCron');
      } catch (error) {
        logError(`Failed to process renewal for: ${subscription._id}`, 'SubscriptionCron', error);
      }
    }
    
    logSuccess('Subscription renewal task completed', 'SubscriptionCron');
  } catch (error) {
    logError('Subscription renewal task failed', 'SubscriptionCron', error);
  }
};

/**
 * Process expired subscription deactivation
 */
const processExpiredDeactivation = async () => {
  try {
    logInfo('Running subscription deactivation task', 'SubscriptionCron');
    
    // Get expired subscriptions that are still active
    const expiredSubscriptions = await SubscriptionService.getExpiredActiveSubscriptions();
    
    if (expiredSubscriptions.length === 0) {
      logInfo('No expired active subscriptions found', 'SubscriptionCron');
      return;
    }
    
    logInfo(`Found ${expiredSubscriptions.length} expired subscriptions to deactivate`, 'SubscriptionCron');
    
    // Process each expired subscription
    for (const subscription of expiredSubscriptions) {
      try {
        // Get shop information
        const shop = await ShopService.getShopById(subscription.shopId);
        
        if (!shop) {
          logError(`Shop not found for subscription: ${subscription._id}`, 'SubscriptionCron');
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
        
        logSuccess(`Deactivated expired subscription for shop: ${shop.name} (ID: ${subscription._id})`, 'SubscriptionCron');
      } catch (error) {
        logError(`Failed to deactivate expired subscription: ${subscription._id}`, 'SubscriptionCron', error);
      }
    }
    
    logSuccess('Subscription deactivation task completed', 'SubscriptionCron');
  } catch (error) {
    logError('Subscription deactivation task failed', 'SubscriptionCron', error);
  }
};

/**
 * Run all subscription tasks in sequence
 */
const runAllTasks = async () => {
  try {
    // Run tasks in a logical sequence
    await processTrialReminders();
    await processExpiryReminders();
    await processAutoRenewals();
    await processExpiredDeactivation();
    
    logSuccess('All subscription tasks completed successfully', 'SubscriptionCron');
  } catch (error) {
    logError('Failed to run all subscription tasks', 'SubscriptionCron', error);
  }
};

/**
 * Main execution function
 */
const main = async () => {
  try {
    await connectToDB();
    
    // Check command line arguments
    const taskName = process.argv[2] || 'all';
    
    switch (taskName) {
      case 'trialReminders':
        await processTrialReminders();
        break;
      case 'expiryReminders':
        await processExpiryReminders();
        break;
      case 'autoRenewals':
        await processAutoRenewals();
        break;
      case 'deactivateExpired':
        await processExpiredDeactivation();
        break;
      case 'all':
        await runAllTasks();
        break;
      default:
        logError(`Unknown task: ${taskName}`, 'SubscriptionCron');
        console.log('Available tasks: trialReminders, expiryReminders, autoRenewals, deactivateExpired, all');
    }
    
    // Close MongoDB connection
    await mongoose.connection.close();
    logInfo('MongoDB connection closed', 'SubscriptionCron');
    
    process.exit(0);
  } catch (error) {
    logError('Fatal error in subscription CRON tasks', 'SubscriptionCron', error);
    process.exit(1);
  }
};

// Execute if this script is run directly
if (require.main === module) {
  main();
}

module.exports = {
  processTrialReminders,
  processExpiryReminders,
  processAutoRenewals,
  processExpiredDeactivation,
  runAllTasks
};
