require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const { logInfo, logSuccess, logError } = require('../utils');

async function testLogin() {
  try {
    // Connect to MongoDB
    console.log('\n🔒 DeynCare Direct Login Test\n===========================\n');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB database');

    // Get email from .env or input
    const email = process.env.ADMIN_EMAIL.toLowerCase();
    console.log(`Testing login for: ${email}`);
    
    // Find the user
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`❌ No user found with email: ${email}`);
      return;
    }
    
    console.log('\nUser found in database:');
    console.log('- ID:', user.userId);
    console.log('- Email:', user.email);
    console.log('- Role:', user.role);
    console.log('- Status:', user.status);
    console.log('- Verified:', user.verified);
    console.log('- Password Hash:', user.password.substring(0, 15) + '...');
    
    // Test passwords
    console.log('\nTesting different passwords:');
    
    // Test the password from .env
    const envPassword = process.env.ADMIN_PASSWORD;
    const envMatch = await bcrypt.compare(envPassword, user.password);
    console.log(`1. Password from .env (${envPassword}): ${envMatch ? '✅ MATCH' : '❌ FAIL'}`);
    
    // Test with fixed passwords for debugging
    const withoutDollar = 'Hnajiib12345'; 
    const withOneDollar = 'Hnajiib12345$';
    const withTwoDollars = 'Hnajiib12345$$';
    
    console.log(`2. Without dollar sign (${withoutDollar}): ${await bcrypt.compare(withoutDollar, user.password) ? '✅ MATCH' : '❌ FAIL'}`);
    console.log(`3. With one dollar sign (${withOneDollar}): ${await bcrypt.compare(withOneDollar, user.password) ? '✅ MATCH' : '❌ FAIL'}`);
    console.log(`4. With two dollar signs (${withTwoDollars}): ${await bcrypt.compare(withTwoDollars, user.password) ? '✅ MATCH' : '❌ FAIL'}`);
    
    // Create a new hash with the password from .env for reference
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(envPassword, salt);
    console.log('\nReference info:');
    console.log('- Current hash in DB:', user.password);
    console.log('- New hash of .env password:', newHash);
    
    console.log('\n✅ Login test completed');
    
  } catch (error) {
    console.error('❌ Error during login test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the test
testLogin();
