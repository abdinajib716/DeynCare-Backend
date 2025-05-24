const { Shop } = require('../../models');
const { AppError } = require('../../utils');

/**
 * Get all shops with pagination and filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
const getShops = async (req, res, next) => {
  try {
    // Extract query parameters
    const {
      page = 1,
      limit = 20,
      status,
      verified,
      subscriptionStatus,
      search
    } = req.query;
    
    // Parse pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Build query
    const query = {};
    
    // Add status filter if provided
    if (status && ['active', 'pending', 'suspended', 'deleted'].includes(status)) {
      query.status = status;
    }
    
    // Add verification filter if provided
    if (verified !== undefined) {
      query.verified = verified === 'true';
    }
    
    // Add search filter if provided
    if (search) {
      query.$or = [
        { shopName: { $regex: search, $options: 'i' } },
        { ownerName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add subscription status filter if provided
    if (subscriptionStatus) {
      // Map subscription status to appropriate query
      switch (subscriptionStatus) {
        case 'active':
          query['subscription.endDate'] = { $gt: new Date() };
          break;
        case 'trial':
          query['subscription.planType'] = 'trial';
          break;
        case 'expired':
          query['subscription.endDate'] = { $lt: new Date() };
          break;
      }
    }
    
    // Execute count query for pagination
    const total = await Shop.countDocuments(query);
    
    // Execute find query with pagination
    const shops = await Shop.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    // Calculate pagination metadata
    const pages = Math.ceil(total / limitNum);
    
    // Sanitize shop data for response
    const sanitizedShops = shops.map(shop => ({
      shopId: shop.shopId,
      shopName: shop.shopName,
      ownerName: shop.ownerName,
      email: shop.email,
      phone: shop.phone,
      address: shop.address,
      logoUrl: shop.logoUrl,
      status: shop.status,
      verified: shop.verified,
      subscription: {
        planType: shop.subscription?.planType,
        startDate: shop.subscription?.startDate,
        endDate: shop.subscription?.endDate,
        status: shop.subscription?.status || 
          (shop.subscription?.endDate > new Date() ? 'active' : 'expired')
      },
      createdAt: shop.createdAt
    }));
    
    // Return success response with pagination
    res.status(200).json({
      success: true,
      message: 'Shops retrieved successfully',
      data: {
        shops: sanitizedShops,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getShops;
