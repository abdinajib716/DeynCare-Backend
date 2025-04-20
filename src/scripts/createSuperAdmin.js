/**
 * Script to create a super-admin user on initial system setup
 * Run with: node src/scripts/createSuperAdmin.js
 * 
 * Will check environment variables for super-admin credentials:
 * - SUPER_ADMIN_EMAIL
 * - SUPER_ADMIN_PASSWORD
 * - SUPER_ADMIN_NAME (optional, defaults to "System Administrator")
 * - SUPER_ADMIN_PHONE (optional)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { 
  logInfo, 
  logSuccess, 
  logError, 
  logWarning 
} = require('../utils/logger');
const { idGenerator } = require('../utils');

// Connect to the database
const connectDB = async () => {
  try {
    const mongoOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: true,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: 10
    };

    await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
    logSuccess('Connected to MongoDB for super-admin creation', 'CreateSuperAdmin');
    return true;
  } catch (error) {
    logError(`MongoDB connection failed: ${error.message}`, 'CreateSuperAdmin', error);
    return false;
  }
};

// Load User model dynamically to avoid circular dependencies
const getUserModel = async () => {
  try {
    // This approach avoids mongoose schema redefinition errors
    if (mongoose.models.User) {
      return mongoose.models.User;
    } else {
      const User = require('../models/user.model');
      return User;
    }
  } catch (error) {
    logError('Failed to load User model', 'CreateSuperAdmin', error);
    throw error;
  }
};

// Create super-admin user
const createSuperAdmin = async () => {
  try {
    // Check required environment variables
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;
    
    if (!email || !password) {
      logError('Missing required environment variables: SUPER_ADMIN_EMAIL and/or SUPER_ADMIN_PASSWORD', 'CreateSuperAdmin');
      return false;
    }

    // Get optional environment variables
    const fullName = process.env.SUPER_ADMIN_NAME || 'System Administrator';
    const phone = process.env.SUPER_ADMIN_PHONE || '';
    
    // Get User model
    const User = await getUserModel();
    
    // Check if super-admin already exists
    const existingSuperAdmin = await User.findOne({ 
      role: 'superAdmin',
      isDeleted: false
    });
    
    if (existingSuperAdmin) {
      logInfo(`Super-admin already exists: ${existingSuperAdmin.email}`, 'CreateSuperAdmin');
      return true;
    }
    
    // Also check if the specified email already exists in any role
    const existingUser = await User.findOne({ email, isDeleted: false });
    if (existingUser) {
      logWarning(`User with email ${email} already exists with role: ${existingUser.role}`, 'CreateSuperAdmin');
      
      // Option: upgrade the user to superAdmin if needed
      if (existingUser.role !== 'superAdmin') {
        existingUser.role = 'superAdmin';
        await existingUser.save();
        logSuccess(`Upgraded existing user ${email} to superAdmin role`, 'CreateSuperAdmin');
      }
      
      return true;
    }
    
    // Create the super-admin user
    const userId = await idGenerator.generateUserId(User);
    
    // Hash password manually (outside of the model hook)
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const superAdmin = new User({
      userId,
      fullName,
      email,
      phone,
      password: hashedPassword, // Already hashed
      role: 'superAdmin',
      status: 'active',
      verified: true,
      emailVerified: true,
      verifiedAt: new Date()
    });
    
    await superAdmin.save();
    logSuccess(`Super-admin created successfully: ${email}`, 'CreateSuperAdmin');
    return true;
  } catch (error) {
    logError(`Failed to create super-admin: ${error.message}`, 'CreateSuperAdmin', error);
    return false;
  }
};

// Function to run the script and then disconnect
const run = async () => {
  console.log('\n🚀 DeynCare Super-Admin Setup');
  console.log('=============================\n');
  
  const connected = await connectDB();
  if (!connected) {
    console.error('❌ Database connection failed. Aborting super-admin creation.\n');
    process.exit(1);
  }
  
  try {
    const result = await createSuperAdmin();
    
    if (result) {
      console.log('\n✅ Super-admin setup completed successfully!\n');
    } else {
      console.log('\n⚠️ Super-admin setup encountered issues. Check logs for details.\n');
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    logInfo('Disconnected from MongoDB', 'CreateSuperAdmin');
    process.exit(0);
  }
};

// Run the script immediately if called directly
if (require.main === module) {
  run();
}

// Export for potential programmatic use
module.exports = { createSuperAdmin };
