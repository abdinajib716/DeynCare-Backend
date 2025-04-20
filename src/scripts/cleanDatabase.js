const mongoose = require('mongoose');
const { promisify } = require('util');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

// Determine the project root directory
const projectRoot = path.resolve(__dirname, '../..');

// Load environment variables
require('dotenv').config({ path: path.join(projectRoot, '.env') });

// Import all models - use absolute path resolution
const modelsPath = path.join(__dirname, '../models');

// Check if models directory exists
if (!fs.existsSync(modelsPath)) {
  console.error(`❌ Models directory not found at: ${modelsPath}`);
  process.exit(1);
}

// Import all models
const models = require(modelsPath);

// Create readline interface for confirmation prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
const question = promisify(rl.question).bind(rl);

/**
 * Database cleanup utility that preserves super-admin users
 */
async function cleanDatabase() {
  try {
    // Connect to database if not already connected
    if (mongoose.connection.readyState === 0) {
      if (!process.env.MONGODB_URI) {
        console.error('❌ MONGODB_URI environment variable is not set');
        rl.close();
        process.exit(1);
      }
      
      console.log('🔄 Connecting to database...');
      try {
        await mongoose.connect(process.env.MONGODB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true
        });
        console.log('✅ Connected to database');  
      } catch (dbError) {
        console.error('❌ Database connection failed:', dbError.message);
        rl.close();
        process.exit(1);
      }
    }

    // Get all model names
    const modelNames = Object.keys(models).filter(name => 
      // Only include Mongoose models (skip index.js or non-model exports)
      models[name].modelName && models[name].collection
    );

    console.log(`\n📊 Found ${modelNames.length} models in the database\n`);

    // Count records in each model
    const modelCounts = {};
    
    for (const modelName of modelNames) {
      const Model = models[modelName];
      const count = await Model.countDocuments({});
      modelCounts[modelName] = count;
      
      console.log(`${modelName}: ${count} records`);
    }

    // Calculate total records (excluding super-admins which we'll preserve)
    const superAdminCount = await models.User.countDocuments({ role: 'superAdmin' });
    const totalRecords = Object.values(modelCounts).reduce((sum, count) => sum + count, 0) - superAdminCount;
    
    console.log(`\n🔍 Total: ${totalRecords} records (excluding ${superAdminCount} super-admin users)`);

    // Ask for confirmation
    const confirm = await question('\n⚠️ WARNING: This will delete all records except super-admin users. Continue? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled');
      rl.close();
      return;
    }

    console.log('\n🧹 Cleaning database...');

    // Process each model
    for (const modelName of modelNames) {
      const Model = models[modelName];
      
      if (modelName === 'User') {
        // For User model, preserve super-admins
        const deleteResult = await Model.deleteMany({ role: { $ne: 'superAdmin' } });
        console.log(`✅ ${modelName}: Deleted ${deleteResult.deletedCount} records (preserved super-admins)`);
      } else {
        // For all other models, delete everything
        const deleteResult = await Model.deleteMany({});
        console.log(`✅ ${modelName}: Deleted ${deleteResult.deletedCount} records`);
      }
    }

    console.log('\n🎉 Database cleanup complete! Only super-admin users remain.');
    
    // Count remaining records
    let remainingCount = 0;
    for (const modelName of modelNames) {
      const Model = models[modelName];
      const count = await Model.countDocuments({});
      remainingCount += count;
      
      if (count > 0) {
        console.log(`${modelName}: ${count} records remaining`);
      }
    }
    
    console.log(`\n📊 Total records remaining: ${remainingCount}`);
    
    rl.close();
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    rl.close();
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  cleanDatabase()
    .then(() => {
      console.log('Done');
      process.exit(0);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
} else {
  // Export for use in other scripts
  module.exports = cleanDatabase;
}
