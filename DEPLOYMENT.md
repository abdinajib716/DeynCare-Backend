# DeynCare Backend Deployment Guide

This document provides instructions for deploying the DeynCare backend application to Render using Docker.

## Environment Variables

Before deployment, you need to set up the following environment variables in the Render dashboard. **DO NOT commit sensitive values to your repository.**

### Required Environment Variables

```
# Server Configuration
NODE_ENV=production
PORT=5000
API_VERSION=v1
USE_SIMPLIFIED_SERVER=false

# MongoDB Connection (SENSITIVE - set in Render dashboard)
MONGODB_URI=your_mongodb_connection_string

# JWT Configuration (SENSITIVE - set in Render dashboard)
JWT_ACCESS_SECRET=your_secure_random_string
JWT_REFRESH_SECRET=your_secure_random_string
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# CORS Configuration
CORS_ORIGIN=https://your-frontend-domain.com

# Email Configuration (SENSITIVE - set in Render dashboard)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
EMAIL_FROM="DeynCare <your_email@gmail.com>"

# Frontend URL (for email links)
FRONTEND_URL=https://your-frontend-domain.com

# Security
PASSWORD_SALT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info

# App Details
APP_NAME=DeynCare
APP_DESCRIPTION=Debt management and POS system

# Super Admin Creation (SENSITIVE - set in Render dashboard)
# Set to 'true' only for initial deployment, then set to 'false'
CREATE_SUPER_ADMIN=false
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=secure_password
SUPER_ADMIN_NAME=Admin Name
SUPER_ADMIN_PHONE=123456789

# Subscription Configuration
DEFAULT_TRIAL_DAYS=14
DATA_RETENTION_DAYS=30

# Scheduler Configuration
# Set to 'true' on Render as we'll use the in-app scheduler
ENABLE_SCHEDULER=true

# CRON Job Timing (used by the in-app scheduler)
CRON_TRIAL_REMINDERS=0 8 * * *
CRON_EXPIRY_REMINDERS=0 9 * * *
CRON_AUTO_RENEWALS=0 10 * * *
CRON_DEACTIVATE_EXPIRED=0 11 * * *
```

## Deployment Steps

### 1. Prepare Your Repository

1. Ensure your codebase includes:
   - Dockerfile
   - docker-compose.yml
   - .dockerignore
   - render.yaml

2. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Add Docker configuration for deployment"
   git push
   ```

### 2. Set Up Render Service

1. Create a Render account at [render.com](https://render.com/)
2. Connect your GitHub repository
3. Create a new Web Service
4. Select "Docker" as the environment
5. Set up your environment variables in the Render dashboard
   - Click on "Environment" tab
   - Add all variables marked as SENSITIVE above
   - Other variables will be loaded from render.yaml
6. Set up a disk for uploads persistence
   - This is configured in render.yaml, but verify it's set up correctly

### 3. Initial Deployment Configuration

For the initial deployment only:
1. Set `CREATE_SUPER_ADMIN=true`
2. Set `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `SUPER_ADMIN_NAME`, and `SUPER_ADMIN_PHONE`
3. After the admin account is created, change `CREATE_SUPER_ADMIN` to `false`

### 4. Update Mobile App Configuration

Update your Flutter app's `env_config.dart` production environment setting:

```dart
case AppEnvironment.production:
  return 'https://your-render-service-name.onrender.com/api';
```

## Security Considerations

- Use strong, unique passwords for all sensitive values
- Store sensitive information only in the Render dashboard, never in code
- Set `CORS_ORIGIN` to restrict access to your frontend domain
- Consider enabling rate limiting for production
- Regularly rotate email passwords and access tokens

## Monitoring and Maintenance

- Check Render logs regularly for errors or performance issues
- Set up monitoring for your application (Render provides basic monitoring)
- Make regular backups of your MongoDB database
- Keep Node.js and npm packages updated

## Troubleshooting

- If deployment fails, check Render logs for details
- Verify all environment variables are set correctly
- Confirm MongoDB connection string is accessible from Render's IP addresses
- Check if uploads directory has proper permissions

For more information, consult the [Render Documentation](https://render.com/docs).
