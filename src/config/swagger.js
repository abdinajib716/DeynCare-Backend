/**
 * SWAGGER DOCUMENTATION DISABLED
 * 
 * This file previously contained Swagger configuration for API documentation.
 * It has been disabled as per requirements.
 * 
 * To re-enable Swagger documentation:
 * 1. Uncomment this file
 * 2. Update app.js to import and use the swaggerSetup function
 * 3. Add Swagger annotations back to route files
 */

/*
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * Swagger configuration for DeynCare Backend API
 */

// Swagger definition
/*
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DeynCare API Documentation',
      version: '1.0.0',
      description: 'API documentation for DeynCare - Debt Management and POS System',
      contact: {
        name: 'DeynCare Support',
        email: 'support@deyncare.com'
      },
      license: {
        name: 'Private',
        url: 'http://deyncare.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'http://api.deyncare.com',
        description: 'Production server'
      }
    ],
    /*
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'Unique user identifier' },
            fullName: { type: 'string', description: 'User full name' },
            email: { type: 'string', format: 'email', description: 'User email address' },
            phone: { type: 'string', description: 'User phone number' },
            role: { type: 'string', enum: ['superAdmin', 'admin', 'employee'], description: 'User role' },
            shopId: { type: 'string', nullable: true, description: 'Shop ID if user is associated with a shop' },
            status: { type: 'string', enum: ['pending', 'active', 'suspended', 'inactive'], description: 'User account status' },
            verified: { type: 'boolean', description: 'Email verification status' }
          }
        },
        Shop: {
          type: 'object',
          properties: {
            shopId: { type: 'string', description: 'Unique shop identifier' },
            name: { type: 'string', description: 'Shop name' },
            owner: { type: 'string', description: 'User ID of shop owner' },
            location: { type: 'string', description: 'Physical location of shop' },
            status: { type: 'string', enum: ['active', 'inactive', 'suspended'], description: 'Shop status' }
          }
        },
        Customer: {
          type: 'object',
          properties: {
            customerId: { type: 'string', description: 'Unique customer identifier' },
            fullName: { type: 'string', description: 'Customer full name' },
            email: { type: 'string', format: 'email', description: 'Customer email address' },
            phone: { type: 'string', description: 'Customer phone number' },
            shopId: { type: 'string', description: 'Shop ID the customer belongs to' }
          }
        },
        Debt: {
          type: 'object',
          properties: {
            debtId: { type: 'string', description: 'Unique debt identifier' },
            customerId: { type: 'string', description: 'Customer ID' },
            shopId: { type: 'string', description: 'Shop ID' },
            amount: { type: 'number', description: 'Debt amount' },
            balance: { type: 'number', description: 'Remaining balance' },
            dueDate: { type: 'string', format: 'date-time', description: 'Due date for payment' },
            status: { type: 'string', enum: ['active', 'paid', 'overdue', 'defaulted'], description: 'Debt status' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                message: { type: 'string', description: 'Error message' },
                statusCode: { type: 'integer', description: 'HTTP status code', example: 400 },
                type: { type: 'string', description: 'Error type', example: 'validation_error' }
              }
            }
          }
        },
        TokenResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Login successful' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                accessToken: { type: 'string', description: 'JWT access token' },
                refreshToken: { type: 'string', description: 'JWT refresh token' },
                expiresAt: { type: 'string', format: 'date-time', description: 'Expiration timestamp for refresh token' }
              }
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        BadRequestError: {
          description: 'Invalid input parameters',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      },
      {
        cookieAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js'
  ]
};

// Initialize swagger-jsdoc
const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Setup swagger middleware
const swaggerSetup = (app) => {
  try {
    // Serve swagger docs
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'DeynCare API Documentation',
      swaggerOptions: {
        defaultModelsExpandDepth: -1, // Hide schemas section by default
        defaultModelExpandDepth: 1,
        defaultModelRendering: 'model', 
        displayRequestDuration: true,
        docExpansion: 'list',
        filter: true,
        showExtensions: true,
        tryItOutEnabled: true,
        requestSnippetsEnabled: true,
        persistAuthorization: true,
        requestInterceptor: (req) => {
          // Prefer form content type when available
          if (req.spec.consumes && req.spec.consumes.includes('application/x-www-form-urlencoded')) {
            req.headers['Content-Type'] = 'application/x-www-form-urlencoded';
          }
          return req;
        }
      }
    }));

    // Serve swagger.json
    app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerDocs);
    });

    console.log('📚 Swagger documentation available at /api-docs');
  } catch (error) {
    console.error('⚠️ Error setting up Swagger documentation:', error.message);
    // Continue application startup even if Swagger fails
  }
};

// Return empty functions that do nothing to avoid breaking app.js if it still references this module
const swaggerSetup = () => {};
const swaggerDocs = {};

module.exports = { swaggerSetup, swaggerDocs };