# DeynCare Backend

DeynCare is a comprehensive debt management and POS system designed for small to medium businesses. This repository contains the backend API that powers the DeynCare application.

## Features

### Core Features
- User authentication and authorization with JWT
- Role-based access control (superAdmin, admin, employee)
- Multi-tenant architecture with shops as tenants
- Customer management
- Debt tracking and management
- Payment processing and recording
- Inventory and product management
- Sales and point-of-sale system
- Risk assessment with ML integration
- Reporting and analytics

### Subscription Management System
- Trial management with 14-day free trial
- Monthly ($10) and yearly ($8/month) subscription plans
- Comprehensive feature set for different plan levels
- Dynamic pricing management via database
- Full CRON automation for:
  - **Trial ending reminders**
  - **Subscription expiry notifications**
  - **Automatic subscription renewals**
  - **Automatic deactivation of expired subscriptions**

## Tech Stack

- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with refresh tokens
- **Email**: Nodemailer for transactional emails
- **Scheduling**: node-cron for scheduled tasks
- **Validation**: Joi for request validation
- **Security**: bcrypt, helmet, cors, rate limiting

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/deyncare-backend.git
   cd deyncare-backend
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file based on the `sample.env`
   ```bash
   cp sample.env .env
   ```

4. Configure your environment variables in the `.env` file

5. Start the development server
   ```bash
   npm run dev
   ```

## Subscription CRON Jobs

DeynCare uses a dedicated CRON job system to manage subscription-related scheduled tasks.

### Available CRON Tasks

- **Trial Ending Reminders**: Notify users before their free trial expires
- **Subscription Expiry Reminders**: Notify users before their subscription ends
- **Subscription Auto-Renewals**: Automatically process renewals for eligible subscriptions
- **Expired Subscription Deactivation**: Automatically deactivate subscriptions that have expired

### Running CRON Jobs

You can run all subscription tasks at once:
```bash
npm run cron
```

Or run individual tasks:
```bash
npm run cron:trials     # Process trial ending reminders
npm run cron:expiry     # Process subscription expiry reminders
npm run cron:renewals   # Process subscription auto-renewals
npm run cron:deactivate # Process expired subscription deactivation
```

### Production Setup

For production environments, it's recommended to set up the CRON jobs using your server's CRON system. See the [CRON documentation](./src/cron/README.md) for detailed instructions.

## API Documentation

API documentation is available at `/api-docs` when running the server.

## Project Structure

```
src/
├── controllers/       # Request handlers
├── models/           # MongoDB schemas
├── routes/           # API routes
├── middleware/       # Express middleware
├── services/         # Business logic
├── utils/            # Utility functions
├── validations/      # Request validation
├── templates/        # Email templates
├── cron/             # Scheduled tasks
└── app.js            # Express app setup
```

## License

This project is licensed under the [ISC License](LICENSE).

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
