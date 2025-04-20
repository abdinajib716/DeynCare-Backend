require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const { logInfo, logSuccess, logError } = require('../utils');

/**
 * This script fixes the password hashing inconsistency by:
 * 1. Finding the super admin user
 * 2. Setting their password directly without hash (let the model hook handle it)
 * 3. Ensuring consistent hashing parameters are used
 */
async function fixAdminPassword() {
  console.log('\n\n🔐 DeynCare Admin Password Fix\n===========================\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB database');

    // Get email and password from .env
    const email = process.env.ADMIN_EMAIL?.toLowerCase() || process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
    const password = process.env.ADMIN_PASSWORD || process.env.SUPER_ADMIN_PASSWORD;
    
    if (!email || !password) {
      console.log('❌ Missing email or password in .env file');
      return;
    }
    
    console.log(`Looking for admin user: ${email}`);
    
    // Find the user
    const user = await User.findOne({ 
      email,
      role: 'superAdmin'
    });
    
    if (!user) {
      console.log(`❌ No superAdmin found with email: ${email}`);
      return;
    }
    
    console.log(`Found superAdmin: ${user.fullName} (${user.email})`);
    
    // IMPORTANT: Set the password as plain text
    // Let the model's pre-save hook handle the consistent hashing
    user.password = password;
    await user.save();
    
    console.log(`\n✅ Password updated successfully! Try logging in with:`);
    console.log(`- Email: ${email}`);
    console.log(`- Password: ${password}`);
    
  } catch (error) {
    console.error('\n❌ Error fixing admin password:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the function
fixAdminPassword();
