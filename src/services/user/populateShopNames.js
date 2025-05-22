const { logInfo, logError, logWarning } = require('../../utils');

// Import models needed for shop lookup
const { Shop } = require('../../models');

// In-memory cache for shop names with 5-minute expiration
const shopNameCache = new Map();
const shopNameCacheExpiry = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Get a shop name from cache or null if not found/expired
 * @param {string} shopId - Shop ID to lookup
 * @returns {string|null} Shop name or null if not in cache
 * @private
 */
const getCachedShopName = (shopId) => {
  const now = Date.now();
  const expiry = shopNameCacheExpiry.get(shopId);
  
  // Check if we have a valid cache entry
  if (expiry && expiry > now) {
    return shopNameCache.get(shopId);
  }
  
  // Clean up expired entry if it exists
  if (expiry) {
    shopNameCache.delete(shopId);
    shopNameCacheExpiry.delete(shopId);
  }
  
  return null;
};

/**
 * Cache a shop name with expiration
 * @param {string} shopId - Shop ID
 * @param {string} shopName - Shop name
 * @private
 */
const cacheShopName = (shopId, shopName) => {
  // Set expiry time
  const expiry = Date.now() + CACHE_TTL;
  
  // Store in cache
  shopNameCache.set(shopId, shopName);
  shopNameCacheExpiry.set(shopId, expiry);
  
  // Clean cache if it gets too large (more than 1000 entries)
  if (shopNameCache.size > 1000) {
    const oldestKey = shopNameCache.keys().next().value;
    shopNameCache.delete(oldestKey);
    shopNameCacheExpiry.delete(oldestKey);
  }
};

/**
 * Populate shop name for users with efficient caching
 * @param {Array|Object} users - User object or array of users
 * @param {Object} options - Options for population
 * @param {boolean} [options.useCache=true] - Whether to use cache
 * @returns {Promise<Array|Object>} Users with shop names populated
 */
const populateShopNames = async (users, options = {}) => {
  try {
    const { useCache = true } = options;
    
    // If there are no users, return empty array
    if (!users) return [];
    
    // Handle both single user object and arrays
    const isArray = Array.isArray(users);
    const userArray = isArray ? users : [users];
    
    // Get all unique shop IDs and separate them into cached and uncached
    const allShopIds = [...new Set(
      userArray
        .filter(user => user.shopId)
        .map(user => user.shopId)
    )];
    
    // If no shop IDs, return original users
    if (allShopIds.length === 0) {
      return isArray ? userArray : userArray[0];
    }
    
    // Split shop IDs into cached and uncached
    const shopMap = {};
    const uncachedShopIds = [];
    
    if (useCache) {
      // Try to get shop names from cache first
      for (const shopId of allShopIds) {
        const cachedName = getCachedShopName(shopId);
        if (cachedName !== null) {
          shopMap[shopId] = cachedName;
          logInfo(`Using cached shop name for ID ${shopId}: ${cachedName}`, 'UserService');
        } else {
          uncachedShopIds.push(shopId);
        }
      }
    } else {
      // Skip cache entirely
      uncachedShopIds.push(...allShopIds);
    }
    
    // Only query database for shops not in cache
    if (uncachedShopIds.length > 0) {
      // Get all shops in a single query with minimal projection
      logInfo(`Fetching ${uncachedShopIds.length} shops from database`, 'UserService');
      const shops = await Shop.find(
        { shopId: { $in: uncachedShopIds } },
        { shopId: 1, shopName: 1, _id: 0 } // Only get what we need
      ).lean(); // Get plain objects instead of Mongoose documents for better performance
      
      // Add to map and cache
      for (const shop of shops) {
        shopMap[shop.shopId] = shop.shopName;
        
        // Add to cache if caching is enabled
        if (useCache) {
          cacheShopName(shop.shopId, shop.shopName);
        }
      }
      
      // Log any missing shops
      const foundShopIds = shops.map(shop => shop.shopId);
      const missingShopIds = uncachedShopIds.filter(id => !foundShopIds.includes(id));
      
      if (missingShopIds.length > 0) {
        logWarning(`Could not find ${missingShopIds.length} shops: ${missingShopIds.join(', ')}`, 'UserService');
        // Set default name for missing shops
        for (const missingId of missingShopIds) {
          shopMap[missingId] = 'Unknown Shop';
        }
      }
    }
    
    // Create shallow copies of user objects with shop names
    const populatedUsers = userArray.map(user => {
      // Convert to plain object if it's a Mongoose document
      const userCopy = user.toObject ? user.toObject() : { ...user };
      
      // Add shop name if shop ID exists
      if (userCopy.shopId && shopMap[userCopy.shopId]) {
        userCopy.shopName = shopMap[userCopy.shopId];
      } else if (userCopy.shopId) {
        userCopy.shopName = 'Unknown Shop';
      }
      
      return userCopy;
    });
    
    // Return in the same format as input (array or single object)
    return isArray ? populatedUsers : populatedUsers[0];
  } catch (error) {
    logError(`Error populating shop names: ${error.message}`, 'UserService', error);
    // Return the original users without shop names
    return isArray ? userArray : userArray[0];
  }
};

module.exports = populateShopNames;
