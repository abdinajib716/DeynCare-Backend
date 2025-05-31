const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const session = require('express-session');
const crypto = require('crypto');
const { logInfo, logError, logDatabase, logSuccess, AppError, ErrorResponse } = require('./utils');
const { applyRateLimiters } = require('./middleware/rateLimiters');
const { generateCsrfToken, validateCsrfToken, clearCsrfToken, requireCsrf } = require('./middleware/csrfMiddleware');
const SchedulerService = require('./services/schedulerService');

const authRoutes = require('./routes/authRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const discountRoutes = require('./routes/discountRoutes');
const userRoutes = require('./routes/userRoutes');
const reportRoutes = require('./routes/reportRoutes');
const shopRoutes = require('./routes/shopRoutes');
// Import other routes as they are created

dotenv.config();

const app = express();

/**
 * Security configuration
 * Enhanced security with CSP headers, CSRF protection, and secure cookies
 */

// Function to generate a CSP nonce for each request
app.use((req, res, next) => {
  try {
    // Generate random nonce for CSP headers
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  } catch (error) {
    // Fallback if crypto fails for any reason
    res.locals.cspNonce = Math.random().toString(36).substring(2, 15);
    console.log('Using fallback nonce generation');
  }
  next();
});

// Enhanced Helmet configuration with CSP headers
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      // Use nonce-based CSP for scripts instead of unsafe-inline
      scriptSrc: [
        "'self'", 
        (req, res) => `'nonce-${res.locals.cspNonce}'`,
        // Only use unsafe-eval in development
        ...(process.env.NODE_ENV === 'development' ? ["'unsafe-eval'"] : [])
      ],
      connectSrc: [
        "'self'", 
        process.env.FRONTEND_URL || '*',
        // Add API endpoints if needed
        ...(process.env.API_ENDPOINTS ? process.env.API_ENDPOINTS.split(',') : [])
      ],
      imgSrc: ["'self'", 'data:', 'blob:'],
      styleSrc: ["'self'", "'unsafe-inline'"], // Styles often need inline
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      // Add frame-ancestors to prevent clickjacking
      frameAncestors: ["'none'"],
      // Add form-action for forms
      formAction: ["'self'"],
      // Add upgrade-insecure-requests
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      // Add report-uri for CSP violations reporting
      'report-uri': process.env.CSP_REPORT_URI ? [process.env.CSP_REPORT_URI] : null
    },
    reportOnly: process.env.CSP_REPORT_ONLY === 'true'
  },
  // Other security headers
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // Add HSTS in production
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  } : false
}));

// Configure CORS
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    // Check against allowed origins
    const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',');
    if (allowedOrigins.indexOf('*') !== -1 || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With']
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Configure secure cookies with enhanced security
app.use(cookieParser(process.env.COOKIE_SECRET || 'deyncare-secret-key'));

// Centralized cookie security configuration
const secureCookieConfig = {
  // Always use secure cookies if SECURE_COOKIES is true, otherwise only in production
  secure: process.env.SECURE_COOKIES === 'true' || process.env.NODE_ENV === 'production',
  httpOnly: true, // Prevent JavaScript access
  sameSite: 'strict', // CSRF protection
  maxAge: parseInt(process.env.COOKIE_MAX_AGE) || 24 * 60 * 60 * 1000, // Default 24 hours
  domain: process.env.COOKIE_DOMAIN || undefined,
  path: '/',
  signed: true
};

// Session configuration with enhanced security
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'deyncare-session-secret',
  name: 'deyncare.sid', // Custom name instead of default connect.sid
  resave: false,
  saveUninitialized: false,
  cookie: secureCookieConfig
};

// Try to add Redis store for session in production if configured
if (process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
  try {
    // Try to load Redis modules
    const RedisStore = require('connect-redis').default;
    const { createClient } = require('redis');
    
    // Create Redis client and store
    const redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.connect().catch(console.error);
    sessionConfig.store = new RedisStore({ client: redisClient });
    
    console.log('Redis session store initialized');
  } catch (error) {
    console.log('Redis session store not available, using memory store:', error.message);
    // Continue without Redis - will use default memory store
  }
}

app.use(session(sessionConfig));

// Helper middleware to set secure cookie defaults
app.use((req, res, next) => {
  // Override res.cookie to always use secure defaults
  const originalCookie = res.cookie;
  res.cookie = function(name, value, options = {}) {
    const secureOptions = { ...secureCookieConfig, ...options };
    return originalCookie.call(this, name, value, secureOptions);
  };
  next();
});

app.use(compression());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Apply rate limiters
applyRateLimiters(app);

// Configure CSRF protection

// Skip CSRF for login/logout but generate token after successful login
app.use('/api/auth/login', (req, res, next) => {
  // This route doesn't need CSRF validation but will generate a token after successful login
  if (req.method === 'POST') {
    // Skip CSRF validation for login
    next();
  } else {
    validateCsrfToken(req, res, next);
  }
});

// Clear CSRF token on logout
app.use('/api/auth/logout', (req, res, next) => {
  if (req.method === 'POST') {
    // Let the request proceed and clear token after
    const originalEnd = res.end;
    res.end = function(...args) {
      clearCsrfToken(req, res, () => {});
      return originalEnd.apply(this, args);
    };
  }
  next();
});

// Generate CSRF token for all API routes
app.use('/api', generateCsrfToken);

// Apply CSRF validation to all mutating API operations except login
app.use('/api', (req, res, next) => {
  // Skip validation for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip for specific routes that handle their own CSRF
  if (req.path.startsWith('/auth/login')) {
    return next();
  }
  
  // Apply CSRF protection to all other routes
  validateCsrfToken(req, res, next);
});

// Explicitly protect sensitive routes with CSRF
app.use('/api/auth/change-password', requireCsrf);
app.use('/api/auth/reset-password', requireCsrf);
app.use('/api/users', requireCsrf);
app.use('/api/shops', requireCsrf);

app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/shops', shopRoutes);
console.log('Report routes registered successfully');
console.log('Shop routes registered successfully');
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
      settings: '/api/settings',
      shops: '/api/shops'
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