const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const { logInfo, logError, logDatabase, logSuccess, AppError, ErrorResponse } = require('./utils');
const { applyRateLimiters } = require('./middleware/rateLimiters');
const SchedulerService = require('./services/schedulerService');

const authRoutes = require('./routes/authRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const discountRoutes = require('./routes/discountRoutes');
const userRoutes = require('./routes/userRoutes');
const reportRoutes = require('./routes/reportRoutes');
// Import other routes as they are created

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(compression());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

applyRateLimiters(app);

app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
console.log('Report routes registered successfully');
// Add other routes as they are created

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'DeynCare API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    name: 'DeynCare API',
    version: '1.0.0',
    description: 'Debt management and POS system API',
    endpoints: {
      auth: '/api/auth',
      health: '/api/health',
      settings: '/api/settings'
    }
  });
});

app.use('*', (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404, 'not_found'));
});

app.use((err, req, res, next) => {
  logError(err.message, 'Global Error Handler', {
    url: req.originalUrl,
    method: req.method,
    statusCode: err.statusCode || 500,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  const errorResponse = ErrorResponse.fromError(err);
  res.status(errorResponse.statusCode || 500).json(errorResponse);
});

process.on('unhandledRejection', (err) => {
  logError(`Unhandled Rejection: ${err.message}`, 'Process', err);
  
  if (process.env.NODE_ENV === 'production') {
    console.log('Shutting down gracefully...');
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  logError(`Uncaught Exception: ${err.message}`, 'Process', err);
  
  console.log('Shutting down immediately due to uncaught exception');
  process.exit(1);
});

module.exports = app;