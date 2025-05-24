const ShopService = require('../../services/shopService');
const { AppError } = require('../../utils');
const { User } = require('../../models');
const ShopEmailService = require('../../services/email/shopEmailService');
const { logInfo, logError } = require('../../utils/logger');

/**
 * Verify shop payment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
const verifyPayment = async (req, res, next) => {
  try {
    const { shopId } = req.params;
    
    if (!shopId) {
      return next(new AppError('Shop ID is required', 400, 'missing_shop_id'));
    }
    
    // Validate payment data
    const { 
      transactionId, 
      amount, 
      paymentMethod, 
      paymentDate,
      notes 
    } = req.body;
    
    if (!transactionId) {
      return next(new AppError('Transaction ID is required', 400, 'missing_transaction_id'));
    }
    
    if (!amount) {
      return next(new AppError('Payment amount is required', 400, 'missing_amount'));
    }
    
    // Prepare payment data for service
    const paymentData = {
      transactionId,
      amount: parseFloat(amount),
      paymentMethod,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      notes
    };
    
    // Call service with actor information
    const result = await ShopService.verifyPayment(
      shopId, 
      paymentData, 
      req.user?.userId || 'system'
    );
    
    // Send payment confirmation email
    try {
      // Get the shop owner user
      const shopOwner = await User.findOne({ 
        role: 'admin',
        shopId: shopId,
        isOwner: true
      });
      
      if (shopOwner) {
        // Send payment confirmation email
        await ShopEmailService.sendPaymentConfirmationEmail({
          email: shopOwner.email,
          shopName: result.shopName || 'Your Shop',
          amount: paymentData.amount,
          paymentDate: paymentData.paymentDate,
          method: paymentData.paymentMethod,
          referenceNumber: paymentData.transactionId,
          planType: result.subscriptionStatus,
          endDate: result.nextPaymentDate
        });
        
        logInfo(`Payment confirmation email sent to ${shopOwner.email} for shop ${shopId}`, 'verifyPayment');
      } else {
        logError(`Could not find shop owner for shop ${shopId}`, 'verifyPayment');
      }
    } catch (emailError) {
      // Don't fail the payment verification if email sending fails
      logError(`Failed to send payment confirmation email: ${emailError.message}`, 'verifyPayment', emailError);
    }
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = verifyPayment;
