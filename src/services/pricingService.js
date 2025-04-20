/**
 * Pricing Service
 * Handles all business logic related to pricing plans
 */
const { PricingPlan } = require('../models');
const { AppError, logInfo, logError, logSuccess } = require('../utils');

/**
 * PricingService provides methods for managing pricing plans
 */
const PricingService = {
  /**
   * Initialize pricing plans
   */
  initializePlans: async () => {
    try {
      logInfo('Initializing pricing plans...', 'PricingService');
      await PricingPlan.createDefaultPlans();
      logSuccess('Pricing plans initialized', 'PricingService');
    } catch (error) {
      logError('Failed to initialize pricing plans', 'PricingService', error);
      throw error;
    }
  },
  
  /**
   * Get all active pricing plans
   * @returns {Promise<Array>} List of active pricing plans
   */
  getAllPlans: async () => {
    try {
      const plans = await PricingPlan.findActivePlans();
      return plans;
    } catch (error) {
      logError('Failed to get pricing plans', 'PricingService', error);
      throw error;
    }
  },
  
  /**
   * Get plan by type
   * @param {string} planType - Type of plan (trial, monthly, yearly)
   * @returns {Promise<Object>} Pricing plan
   */
  getPlanByType: async (planType) => {
    try {
      const plan = await PricingPlan.findPlanByType(planType);
      
      if (!plan) {
        throw new AppError(`Plan type '${planType}' not found`, 404, 'plan_not_found');
      }
      
      return plan;
    } catch (error) {
      logError(`Failed to get plan by type: ${planType}`, 'PricingService', error);
      throw error;
    }
  },
  
  /**
   * Get plan by ID
   * @param {string} planId - ID of the plan
   * @returns {Promise<Object>} Pricing plan
   */
  getPlanById: async (planId) => {
    try {
      const plan = await PricingPlan.findOne({ 
        planId, 
        isDeleted: false 
      });
      
      if (!plan) {
        throw new AppError('Plan not found', 404, 'plan_not_found');
      }
      
      return plan;
    } catch (error) {
      logError(`Failed to get plan: ${planId}`, 'PricingService', error);
      throw error;
    }
  },
  
  /**
   * Create a new pricing plan
   * @param {Object} planData - Plan details
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Created plan
   */
  createPlan: async (planData, options = {}) => {
    try {
      // Create the plan
      const plan = new PricingPlan({
        ...planData,
        createdBy: options.actorId || 'system'
      });
      
      const savedPlan = await plan.save();
      logSuccess(`Created pricing plan: ${savedPlan.planId}`, 'PricingService');
      
      return savedPlan;
    } catch (error) {
      logError('Failed to create pricing plan', 'PricingService', error);
      throw error;
    }
  },
  
  /**
   * Update a pricing plan
   * @param {string} planId - ID of the plan to update
   * @param {Object} updateData - Data to update
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Updated plan
   */
  updatePlan: async (planId, updateData, options = {}) => {
    try {
      const plan = await PricingService.getPlanById(planId);
      
      // Update fields
      Object.keys(updateData).forEach(key => {
        if (key === 'pricing' || key === 'features' || key === 'limits' || key === 'metadata') {
          // For nested objects, update each property to maintain any unspecified ones
          Object.keys(updateData[key]).forEach(subKey => {
            plan[key][subKey] = updateData[key][subKey];
          });
        } else {
          plan[key] = updateData[key];
        }
      });
      
      const updatedPlan = await plan.save();
      logSuccess(`Updated pricing plan: ${planId}`, 'PricingService');
      
      return updatedPlan;
    } catch (error) {
      logError(`Failed to update pricing plan: ${planId}`, 'PricingService', error);
      throw error;
    }
  },
  
  /**
   * Soft delete a pricing plan
   * @param {string} planId - ID of the plan to delete
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Deleted plan
   */
  deletePlan: async (planId, options = {}) => {
    try {
      const plan = await PricingService.getPlanById(planId);
      
      // Soft delete
      plan.isActive = false;
      plan.isDeleted = true;
      
      const deletedPlan = await plan.save();
      logSuccess(`Deleted pricing plan: ${planId}`, 'PricingService');
      
      return deletedPlan;
    } catch (error) {
      logError(`Failed to delete pricing plan: ${planId}`, 'PricingService', error);
      throw error;
    }
  },
  
  /**
   * Get pricing for a specific plan type
   * @param {string} planType - Type of plan (trial, monthly, yearly)
   * @returns {Promise<Object>} Pricing information
   */
  getPricing: async (planType) => {
    try {
      const plan = await PricingService.getPlanByType(planType);
      
      return {
        basePrice: plan.pricing.basePrice,
        currency: plan.pricing.currency,
        billingCycle: plan.pricing.billingCycle,
        setupFee: plan.pricing.setupFee,
        trialDays: plan.pricing.trialDays,
        planId: plan.planId,
        planName: plan.displayName
      };
    } catch (error) {
      logError(`Failed to get pricing for plan type: ${planType}`, 'PricingService', error);
      throw error;
    }
  }
};

module.exports = PricingService;
