require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./src/app');
const { logInfo, logDatabase, logError, logSuccess } = require('./src/utils/logger');
const { bootstrap } = require('./src/config/bootstrap');

// Server configuration
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// MongoDB Connection Options - Optimized for MongoDB Atlas
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  autoIndex: true,
  connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 15000, // Keep trying to send operations for 15 seconds
  heartbeatFrequencyMS: 10000, // Check connection health every 10 seconds
};

// Display startup message
console.log('\n🚀 Starting DeynCare Backend Server...');

// Use a simplified server if needed due to path-to-regexp issues
const useSimplifiedServer = process.env.USE_SIMPLIFIED_SERVER === 'true';

if (useSimplifiedServer) {
  // Create a simple standalone Express server
  console.log('Using simplified server due to path-to-regexp configuration issues...');
  
  const express = require('express');
  const cors = require('cors');
  const cookieParser = require('cookie-parser');
  const authRoutes = require('./src/routes/authRoutes');
  
  const simpleApp = express();
  
  // Basic middleware
  simpleApp.use(express.json());
  simpleApp.use(express.urlencoded({ extended: true }));
  simpleApp.use(cookieParser());
  simpleApp.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
  
  // Auth routes
  simpleApp.use('/api/auth', authRoutes);
  
  // Basic health check
  simpleApp.get('/api/health', (req, res) => {
    res.status(200).json({ 
      status: 'success', 
      message: 'DeynCare API is running in simplified mode',
      timestamp: new Date().toISOString()
    });
  });
  
  // Default route
  simpleApp.get('/', (req, res) => {
    res.status(200).json({
      name: 'DeynCare API (Simplified)',
      version: '1.0.0',
      description: 'Debt management and POS system API',
      endpoints: {
        auth: '/api/auth',
        health: '/api/health'
      }
    });
  });
  
  // Connect to MongoDB and start server
  mongoose.connect(MONGODB_URI, mongoOptions)
    .then(async () => {
      logSuccess('Connected to MongoDB Atlas successfully!', 'MongoDB');
      
      await bootstrap();
      
      const server = simpleApp.listen(PORT, () => {
        logSuccess(`✅ DeynCare API Server (Simplified) running on port ${PORT}`, 'Server');
        logInfo(`Environment: ${process.env.NODE_ENV || 'development'}`, 'Server');
        logInfo(`MongoDB Connection: Active`, 'Server');
      });
      
      // Handle graceful shutdown
      const gracefulShutdown = (signal) => {
        logInfo(`${signal} received. Starting graceful shutdown...`, 'Server');
        server.close(() => {
          mongoose.connection.close(false, () => {
            logInfo('Process terminated.', 'Server');
            process.exit(0);
          });
          
          setTimeout(() => {
            logError('Forcing process termination', 'Server');
            process.exit(1);
          }, 10000);
        });
      };
      
      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    })
    .catch((err) => {
      logError(`MongoDB connection failed: ${err.message}`, 'MongoDB', {
        error: err.toString(),
        stack: err.stack
      });
      process.exit(1);
    });
} else {
  // Use the full app with all features
  // Connect to MongoDB
  mongoose.connect(MONGODB_URI, mongoOptions)
    .then(async () => {
      logSuccess('Connected to MongoDB Atlas successfully!', 'MongoDB');
      
      // Run bootstrap process
      await bootstrap();
      
      // Start the server after successful database connection
      const server = app.listen(PORT, () => {
        logSuccess(`✅ DeynCare API Server running on port ${PORT}`, 'Server');
        logInfo(`Environment: ${process.env.NODE_ENV || 'development'}`, 'Server');
        logInfo(`MongoDB Connection: Active`, 'Server');
        logInfo(`Server Time: ${new Date().toLocaleString()}`, 'Server');
        
        // Display access URLs
        console.log('\n📡 API Access Points:');
        console.log(`➡️ Local:   http://localhost:${PORT}/api`);
        console.log(`➡️ Network: http://<your-ip-address>:${PORT}/api`);
        console.log(`➡️ Health:  http://localhost:${PORT}/api/health\n`);
      });
      
      // Handle graceful shutdown
      const gracefulShutdown = (signal) => {
        logInfo(`${signal} received. Starting graceful shutdown...`, 'Server');
        server.close(() => {
          logInfo('HTTP server closed.', 'Server');
          
          // Close database connection
          mongoose.connection.close(false, () => {
            logInfo('MongoDB connection closed.', 'Server');
            logInfo('Process terminated.', 'Server');
            process.exit(0);
          });
          
          // Force close after 10 seconds
          setTimeout(() => {
            logError('Forcing process termination after timeout', 'Server');
            process.exit(1);
          }, 10000);
        });
      };
      
      // Listen for termination signals
      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    })
    .catch((err) => {
      logError(`MongoDB connection failed: ${err.message}`, 'MongoDB', {
        error: err.toString(),
        stack: err.stack
      });
      
      console.error('\n❌ Database Connection Error:');
      console.error(`→ Message: ${err.message}`);
      console.error('→ Make sure your MongoDB connection string is correct in .env file');
      console.error('→ Check if MongoDB Atlas IP whitelist includes your current IP\n');
      
      process.exit(1);
    });
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logError(`Uncaught Exception: ${err.message}`, 'Process', {
    stack: err.stack
  });
  process.exit(1);
});