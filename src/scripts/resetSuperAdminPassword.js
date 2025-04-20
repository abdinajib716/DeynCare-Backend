require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const { logInfo, logSuccess, logError } = require('../utils');

async function resetSuperAdminPassword() {
  console.log('\n\n🔑 DeynCare Super-Admin Password Reset\n=============================\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    logSuccess('CONNECTED TO MONGODB FOR PASSWORD RESET', 'ResetSuperAdminPassword');

    // Find super admin user
    const superAdmin = await User.findOne({ 
      email: process.env.ADMIN_EMAIL.toLowerCase(),
      role: 'superAdmin'
    });

    if (!superAdmin) {
      logError(`SUPER ADMIN USER NOT FOUND: ${process.env.ADMIN_EMAIL}`, 'ResetSuperAdminPassword');
      console.log('❌ Super-admin not found with the specified email!');
      return;
    }

    // Hash the password from .env
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);

    // Update the password
    superAdmin.password = hashedPassword;  // Set the hashed password directly
    await superAdmin.save();

    logSuccess(`SUPER-ADMIN PASSWORD RESET SUCCESSFULLY: ${superAdmin.email}`, 'ResetSuperAdminPassword');
    console.log('\n✅ Super-admin password reset completed successfully!');
    console.log(`The password for ${superAdmin.email} has been reset to match your .env file.`);
    
  } catch (error) {
    logError('ERROR RESETTING SUPER-ADMIN PASSWORD', 'ResetSuperAdminPassword', error);
    console.log('\n❌ Error resetting super-admin password:', error.message);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    logInfo('DISCONNECTED FROM MONGODB', 'ResetSuperAdminPassword');
  }
}

// Run the function
resetSuperAdminPassword();
