/**
 * User Controller
 * 
 * This module aggregates all user-related controller functions for easier import and better organization.
 * Each operation is now in its own file for improved maintainability, testing, and readability.
 */

// Import individual controller files
const getAllUsers = require('./getAllUsers');
const getUserById = require('./getUserById');
const createUser = require('./createUser');
const updateUser = require('./updateUser');
const changeUserStatus = require('./changeUserStatus');
const deleteUser = require('./deleteUser');
const _handleError = require('./_handleError');
const _handleStatusChangeError = require('./_handleStatusChangeError');

// Export all controllers as a unified object
module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  changeUserStatus,
  deleteUser,
  _handleError,
  _handleStatusChangeError
};
