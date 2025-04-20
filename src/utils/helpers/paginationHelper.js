const { logError } = require('../logger.js');

/**
 * Helper for standardizing pagination across the application
 */
const PaginationHelper = {
  /**
   * Apply pagination to any MongoDB query
   * @param {Object} model - Mongoose model to query
   * @param {Object} query - Query filter
   * @param {Object} options - Pagination options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 20)
   * @param {Object} options.sort - Sort options (default: { createdAt: -1 })
   * @param {Array} options.select - Fields to select
   * @param {Object} options.populate - Population options
   * @returns {Promise<Object>} Paginated results with metadata
   */
  async paginate(model, query = {}, options = {}) {
    try {
      // Default options
      const {
        page = 1,
        limit = 20,
        sort = { createdAt: -1 },
        select = null,
        populate = null
      } = options;

      // Convert to numbers and ensure valid values
      const pageNum = Math.max(parseInt(page, 10), 1);
      const limitNum = Math.min(Math.max(parseInt(limit, 10), 1), 100); // Max 100 items per page
      
      // Calculate skip value
      const skip = (pageNum - 1) * limitNum;

      // Build query
      let queryBuilder = model.find(query);
      
      // Apply sorting
      queryBuilder = queryBuilder.sort(sort);
      
      // Apply selection if provided
      if (select) {
        queryBuilder = queryBuilder.select(select);
      }
      
      // Apply population if provided
      if (populate) {
        if (Array.isArray(populate)) {
          populate.forEach(pop => {
            queryBuilder = queryBuilder.populate(pop);
          });
        } else {
          queryBuilder = queryBuilder.populate(populate);
        }
      }
      
      // Get total count (before pagination)
      const total = await model.countDocuments(query);
      
      // Apply pagination
      queryBuilder = queryBuilder.skip(skip).limit(limitNum);
      
      // Execute query
      const items = await queryBuilder;
      
      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limitNum);
      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;
      
      // Format response
      return {
        items,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: totalPages,
          hasNext,
          hasPrev
        }
      };
    } catch (error) {
      logError(`Pagination error: ${error.message}`, 'PaginationHelper', error);
      
      // Return empty result set on error
      return {
        items: [],
        pagination: {
          total: 0,
          page: parseInt(options.page || 1, 10),
          limit: parseInt(options.limit || 20, 10),
          pages: 0,
          hasNext: false,
          hasPrev: false,
          error: error.message
        }
      };
    }
  },
  
  /**
   * Standardize pagination parameters from request query
   * @param {Object} query - Express request query object
   * @returns {Object} Standardized pagination options
   */
  getPaginationOptions(query) {
    const options = {};
    
    // Page number
    if (query.page) {
      options.page = parseInt(query.page, 10);
    }
    
    // Items per page
    if (query.limit) {
      options.limit = parseInt(query.limit, 10);
    }
    
    // Sorting
    if (query.sortBy) {
      const sortField = query.sortBy;
      const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
      options.sort = { [sortField]: sortOrder };
    }
    
    return options;
  },
  
  /**
   * Format API response with pagination metadata
   * @param {Object} paginatedData - Data from paginate() method
   * @param {string} message - Response message
   * @returns {Object} Formatted API response
   */
  formatResponse(paginatedData, message = 'Data retrieved successfully') {
    return {
      success: true,
      message,
      data: paginatedData.items,
      pagination: paginatedData.pagination
    };
  }
};

module.exports = PaginationHelper;
