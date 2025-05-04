/**
 * Validations index file
 * Centralizes all validation exports for cleaner imports
 */

// Export schemas
const authSchemas = require('./schemas/authSchemas');
const userSchemas = require('./schemas/userSchemas');
const shopSchemas = require('./schemas/shopSchemas');
const subscriptionSchemas = require('./schemas/subscriptionSchemas');
const paymentSchemas = require('./schemas/paymentSchemas');
const discountSchemas = require('./schemas/discountSchemas');
const reportSchemas = require('./schemas/reportSchemas');

module.exports = {
  // Schemas
  authSchemas,
  userSchemas,
  shopSchemas,
  subscriptionSchemas,
  paymentSchemas,
  discountSchemas,
  reportSchemas
};
