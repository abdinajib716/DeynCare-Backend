const { Shop } = require('../../models');
const { 
  AppError,
  SubscriptionHelper,
  LogHelper,
  logSuccess,
  logError,
  logInfo
} = require('../../utils');

/**
 * Verify shop payment
 * @param {string} shopId - Shop ID to verify payment for
 * @param {Object} paymentData - Payment data with transaction details
 * @param {string} verifiedBy - User ID who verified the payment
 * @returns {Object} Result with updated subscription info
 */
const verifyPayment = async (shopId, paymentData, verifiedBy) => {
  try {
    // Validate shop exists
    const shop = await Shop.findOne({ shopId });
    
    if (!shop) {
      throw new AppError(
        'Shop not found',
        404,
        'shop_not_found'
      );
    }
    
    // Validate payment data
    if (!paymentData || !paymentData.transactionId) {
      throw new AppError(
        'Invalid payment data',
        400,
        'invalid_payment_data'
      );
    }
    
    // Validate shop has subscription
    if (!shop.subscription) {
      throw new AppError(
        'Shop has no subscription',
        400,
        'no_subscription'
      );
    }
    
    // Extract payment information
    const {
      transactionId,
      amount,
      paymentMethod,
      paymentDate = new Date(),
      notes
    } = paymentData;
    
    // Validate payment amount matches subscription price
    const subscriptionPrice = shop.subscription.pricing.price;
    if (amount < subscriptionPrice) {
      throw new AppError(
        `Payment amount (${amount}) is less than subscription price (${subscriptionPrice})`,
        400,
        'insufficient_payment_amount'
      );
    }
    
    // Update subscription payment status
    shop.subscription.initialPaid = true;
    shop.subscription.payment = {
      ...shop.subscription.payment,
      verified: true,
      verifiedBy,
      verifiedAt: new Date(),
      lastPaymentDate: paymentDate,
      transactionId,
      method: paymentMethod || shop.subscription.payment.method,
      amount: amount,
      notes: notes
    };
    
    // If shop is pending, activate it
    if (shop.status === 'pending') {
      shop.status = 'active';
      shop.activatedAt = new Date();
    }
    
    // Calculate next payment date based on subscription type
    const startDate = shop.subscription.startDate || new Date();
    let nextPaymentDate;
    
    if (shop.subscription.planType === 'monthly') {
      nextPaymentDate = new Date(startDate);
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    } else if (shop.subscription.planType === 'yearly') {
      nextPaymentDate = new Date(startDate);
      nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
    } else {
      // For trial plans, set next payment date to trial end date
      nextPaymentDate = shop.subscription.endDate;
    }
    
    shop.subscription.payment.nextPaymentDate = nextPaymentDate;
    shop.subscription.endDate = nextPaymentDate; // Align subscription end date with next payment date
    
    // Save shop
    await shop.save();
    
    // Log payment verification
    await LogHelper.createShopLog(
      'payment_verified',
      shopId,
      {
        actorId: verifiedBy,
        actorRole: 'unknown' // Role information not available in this context
      },
      {
        transactionId,
        amount,
        paymentMethod,
        paymentDate,
        subscriptionType: shop.subscription.planType,
        statusChange: shop.status === 'active' ? 'pending → active' : null
      }
    );
    
    logSuccess(`Payment verified for shop ${shopId}: ${transactionId}`, 'ShopService');
    
    return {
      success: true,
      shopId,
      subscriptionStatus: 'active',
      shopStatus: shop.status,
      nextPaymentDate
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logError(`Error verifying payment for shop ${shopId}: ${error.message}`, 'ShopService', error);
    throw new AppError('Failed to verify payment', 500, 'payment_verification_error');
  }
};

module.exports = verifyPayment;
