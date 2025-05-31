# DeynCare System Architecture Documentation

## 1. Introduction

DeynCare is a comprehensive multi-tenant financial management platform designed to address two primary business needs:
- **70% Focus**: Debt repayment risk analysis and management
- **30% Focus**: Point-of-sale (POS) functionality

The application serves businesses in Somalia and the broader East African region, with built-in support for both English and Somali languages. This document provides a detailed architectural overview of the complete DeynCare system, including all four major components and their interactions.

## 2. System Architecture Overview

DeynCare follows a modern, distributed architecture consisting of four primary layers:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Client Applications                             │
│                                                                         │
│  ┌─────────────────────────────┐         ┌──────────────────────────┐   │
│  │                             │         │                          │   │
│  │     Web Application         │         │     Mobile Application    │   │
│  │     (Next.js + TailwindCSS) │         │     (Flutter)            │   │
│  │     [SuperAdmin Only]       │         │     [Admin/Employee]     │   │
│  │                             │         │                          │   │
│  └──────────────┬──────────────┘         └───────────────┬──────────┘   │
└──────────────────┼────────────────────────────────────────┼──────────────┘
                   │                                        │                 
                   │ HTTP/HTTPS                             │ HTTP/HTTPS      
                   │                                        │                 
┌──────────────────▼────────────────────────────────────────▼──────────────┐
│                                                                          │
│                         Backend API Service                              │
│                      (Express.js + MongoDB)                              │
│                                                                          │
└────────────┬──────────────────────────────────────────────┬──────────────┘
             │                                              │
             │ HTTP/HTTPS                                   │ External  API
             │                                              │
┌────────────▼─────────────────┐            ┌───────────────▼──────────────┐
│                              │            │                              │
│      Payment Services        │            │   ML Risk Analysis Service   │
│      (External APIs)         │            │   (FastAPI + Scikit-learn)   │
│                              │            │                              │
└──────────────────────────────┘            └──────────────────────────────┘
```

### 2.1 Major Components

1. **Web Frontend** (`deyncare-frontend`)
   - Next.js application for SuperAdmin users only
   - Cross-tenant management and system administration

2. **Mobile Application** (`Deyncare-mobile`)
   - Flutter application for Admin and Employee users
   - Tenant-specific operations and day-to-day business

3. **Backend API Service** (`deyncare-backend`)
   - Express.js application with MongoDB database
   - Core business logic and multi-tenant data management

4. **ML Risk Analysis Service** (`fastapi_Deyncare_ML`)
   - FastAPI application with scikit-learn models
   - Debt repayment risk analysis and prediction

## 3. Role-Based Access Control

DeynCare implements strict role-based access with platform-specific restrictions:

| Role | Web Application | Mobile Application | Permissions |
|------|----------------|-------------------|-------------|
| SuperAdmin | ✅ Full Access | ❌ No Access | System-wide administration, cross-tenant management |
| Admin | ⚠️ Limited (Password Reset Only) | ✅ Full Access | Tenant-specific administration, user management |
| Employee | ❌ No Access | ✅ Full Access | Day-to-day operations, customer interactions |

## 4. Detailed Architecture

### 4.1 Backend API Service (`deyncare-backend`)

#### Technology Stack
- **Runtime**: Node.js with Express.js
- **Database**: MongoDB (Atlas)
- **Authentication**: JWT with refresh tokens
- **Storage**: Cloud storage for files/images
- **Caching**: Redis (for high-traffic tenants)

#### Key Components
- **API Gateway**: Rate limiting, request validation, CORS
- **Authentication Layer**: JWT validation, role verification
- **Service Layer**: Business logic implementation
- **Data Access Layer**: Mongoose ODM for MongoDB
- **Multi-tenant Logic**: Shop-based data isolation

#### Directory Structure
```
deyncare-backend/
├── src/
│   ├── config/           # Application configuration
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Custom middleware
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API route definitions
│   ├── services/         # Business logic
│   │   ├── auth/         # Authentication services
│   │   ├── shop/         # Shop management services
│   │   ├── user/         # User management services
│   │   ├── payment/      # Payment processing services
│   │   ├── report/       # Reporting services
│   │   └── subscription/ # Subscription services
│   └── utils/            # Helper functions
├── docs/                 # Documentation
└── server.js             # Application entry point
```

#### Key Database Models
- **User**: Authentication and authorization
- **Shop**: Multi-tenant container entity
- **Customer**: End-users of each shop
- **Debt**: Debt records for risk analysis
- **Payment**: Financial transactions
- **Subscription**: Tenant subscription details

#### API Endpoints
- `/api/auth/*`: Authentication operations
- `/api/users/*`: User management
- `/api/shops/*`: Shop management
- `/api/customers/*`: Customer management
- `/api/debts/*`: Debt management
- `/api/payments/*`: Payment processing
- `/api/reports/*`: Reporting and analytics
- `/api/subscriptions/*`: Subscription management

### 4.2 Web Frontend (`deyncare-frontend`)

#### Technology Stack
- **Framework**: Next.js (React)
- **UI Components**: ShadCN UI + Radix UI
- **State Management**: React Context API
- **Styling**: TailwindCSS
- **Data Fetching**: Custom API bridge

#### Key Features
- SuperAdmin dashboard for system-wide management
- Multi-tenant oversight and management
- Cross-tenant reporting and analytics
- Subscription and billing management
- System configuration and settings

#### Directory Structure
```
deyncare-frontend/
├── app/                   # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── dashboard/         # Dashboard routes
│   └── unauthorized/      # Access denied routes
├── components/            # UI components
│   ├── auth/              # Authentication components
│   ├── dashboard/         # Dashboard components
│   ├── layout/            # Layout components
│   └── ui/                # Base UI components
├── contexts/              # State management
│   ├── auth/              # Authentication context
│   ├── shop/              # Shop management context
│   └── user/              # User management context
├── lib/                   # Utilities
│   ├── api/               # API integration
│   └── services/          # Service modules
└── public/                # Static assets
```

#### Authentication Flow
1. SuperAdmin login via email/password
2. JWT tokens stored securely
3. Role validation to ensure SuperAdmin access only
4. Automatic token refresh for session maintenance

### 4.3 Mobile Application (`Deyncare-mobile`)

#### Technology Stack
- **Framework**: Flutter
- **Architecture**: Clean Architecture with BLoC pattern
- **State Management**: BLoC/Cubit
- **Local Storage**: Secure storage for tokens
- **Networking**: Dio for API requests

#### Key Features
- Role-specific interfaces (Admin vs. Employee)
- Shop-specific data access
- Offline capability with data synchronization
- Payment processing
- Customer debt management
- Risk assessment visualization

#### Directory Structure
```
deyncare_app/
├── lib/
│   ├── core/              # Core utilities
│   │   ├── config/        # Application configuration
│   │   ├── constants/     # Application constants
│   │   ├── errors/        # Error handling
│   │   └── routes/        # Navigation routes
│   ├── data/              # Data layer
│   │   ├── datasources/   # Remote and local data sources
│   │   └── repositories/  # Repository implementations
│   ├── domain/            # Business logic
│   │   ├── models/        # Domain entities
│   │   ├── repositories/  # Repository interfaces
│   │   └── usecases/      # Business logic use cases
│   └── presentation/      # UI layer
│       ├── blocs/         # State management
│       ├── screens/       # Application screens
│       └── widgets/       # Reusable widgets
└── main.dart              # Application entry point
```

#### Key Models
- **User**: Authenticated user (Admin or Employee)
- **Shop**: Tenant details
- **Customer**: Shop's customers
- **Debt**: Debt records for analysis
- **Payment**: Transaction records
- **Risk**: Risk assessment results

### 4.4 ML Risk Analysis Service (`fastapi_Deyncare_ML`)

#### Technology Stack
- **Framework**: FastAPI
- **ML Libraries**: Scikit-learn, Pandas, NumPy
- **Deployment**: Docker containerization
- **Hosting**: Railway platform

#### Key Features
- Debt repayment risk prediction
- Custom risk scoring algorithm (FairRisk)
- Single customer and bulk analysis
- Bilingual API documentation (English/Somali)
- Model versioning and retraining capability

#### Risk Analysis Algorithm
```python
def compute_risk_score(debt_paid_ratio, payment_delay, outstanding_debt, debt_amount):
    """Compute risk score based on financial behavior."""
    return round((1 - debt_paid_ratio) + (payment_delay / 10) + (outstanding_debt / debt_amount), 3)
```

#### Directory Structure
```
fastapi_Deyncare_ML/
├── api/
│   ├── models/            # ML models
│   │   ├── logistic_regression_deyncare.pkl  # Trained model
│   │   └── scaler.pkl     # Feature scaler
│   ├── docs.md            # API documentation
│   └── index.py           # FastAPI application
├── static/                # Static files
├── Dockerfile             # Docker configuration
└── requirements.txt       # Python dependencies
```

#### API Endpoints
- `/predict/single/`: Analyze single customer risk
- `/upload_csv/`: Batch risk analysis
- `/sample_data.csv`: Sample data template

## 5. Integration Flows

### 5.1 User Registration and Shop Creation

```
┌────────┐          ┌────────────┐          ┌────────────┐          ┌─────────┐          ┌──────────┐
│ Client │          │ Auth       │          │ User       │          │ Email   │          │ Shop     │
│        │          │ Controller │          │ Service    │          │ Service │          │ Service  │
└───┬────┘          └─────┬──────┘          └─────┬──────┘          └────┬────┘          └────┬─────┘
    │                     │                       │                      │                     │
    │  1. Register Request │                       │                      │                     │
    │ (email, password,    │                       │                      │                     │
    │  shop details)       │                       │                      │                     │
    │────────────────────>│                       │                      │                     │
    │                     │                       │                      │                     │
    │                     │  2. Validate Input    │                      │                     │
    │                     │───────────────────────│                      │                     │
    │                     │                       │                      │                     │
    │                     │                       │  3. Check Email      │                     │
    │                     │                       │  Availability        │                     │
    │                     │                       │──────────────────────│                     │
    │                     │                       │                      │                     │
    │                     │                       │  4. Create User      │                     │
    │                     │                       │  (verified=false)    │                     │
    │                     │                       │──────────────────────│                     │
    │                     │                       │                      │                     │
    │                     │                       │                      │  5. Create Shop     │
    │                     │                       │                      │  (status=pending)   │
    │                     │                       │                      │────────────────────>│
    │                     │                       │                      │                     │
    │                     │                       │                      │  6. Generate        │
    │                     │                       │                      │  Verification Code  │
    │                     │                       │                      │<────────────────────│
    │                     │                       │                      │                     │
    │                     │                       │  7. Send Verification│                     │
    │                     │                       │  Email               │                     │
    │                     │                       │──────────────────────│                     │
    │                     │                       │                      │                     │
    │  8. Success Response │                       │                      │                     │
    │  (pending verification)                     │                      │                     │
    │<────────────────────│                       │                      │                     │
    │                     │                       │                      │                     │
```

### 5.2 Debt Risk Analysis Flow

```
┌────────┐        ┌────────────┐        ┌────────────┐        ┌─────────────┐        ┌──────────┐
│ Client │        │ Report     │        │ Debt       │        │ Report      │        │ Email    │
│        │        │ Controller │        │ Service    │        │ Service     │        │ Service  │
└───┬────┘        └─────┬──────┘        └─────┬──────┘        └──────┬──────┘        └────┬─────┘
    │                   │                     │                      │                     │
    │ 1. Request Risk   │                     │                      │                     │
    │ Analysis          │                     │                      │                     │
    │──────────────────>│                     │                      │                     │
    │                   │                     │                      │                     │
    │                   │ 2. Validate Request │                      │                     │
    │                   │ Parameters          │                      │                     │
    │                   │────────────────────>│                      │                     │
    │                   │                     │                      │                     │
    │                   │                     │ 3. Retrieve Customer │                     │
    │                   │                     │ Debt History         │                     │
    │                   │                     │─────────────────────>│                     │
    │                   │                     │                      │                     │
    │                   │                     │                      │ 4. Calculate Risk   │
    │                   │                     │                      │ Score               │
    │                   │                     │                      │───────────────────┐ │
    │                   │                     │                      │                  │ │
    │                   │                     │                      │<──────────────────┘ │
    │                   │                     │                      │                     │
    │                   │                     │                      │ 5. Generate Report  │
    │                   │                     │                      │ Document            │
    │                   │                     │                      │───────────────────┐ │
    │                   │                     │                      │                  │ │
    │                   │                     │                      │<──────────────────┘ │
    │                   │                     │                      │                     │
    │                   │                     │                      │ 6. Send Report      │
    │                   │                     │                      │ Notification        │
    │                   │                     │                      │────────────────────>│
    │                   │                     │                      │                     │
    │ 7. Risk Analysis  │                     │                      │                     │
    │ Response          │                     │                      │                     │
    │<──────────────────│                     │                      │                     │
    │                   │                     │                      │                     │
```

## 6. Multi-Tenant Data Model

DeynCare implements a multi-tenant architecture with Shop-based isolation:

```
┌──────────────┐     ┌───────────────┐     ┌───────────────┐
│ User         │     │ Shop          │     │ Subscription  │
├──────────────┤     ├───────────────┤     ├───────────────┤
│ userId       │     │ shopId        │     │ subscriptionId│
│ shopId       │◄────┤ name          │     │ shopId        │
│ email        │     │ status        │     │ planId        │
│ password     │     │ ...           │     │ ...           │
│ role         │     │               │     │               │
│ ...          │     │               │     │               │
└──────┬───────┘     └───────┬───────┘     └───────────────┘
       │                     │
       │                     │
       ▼                     ▼
┌──────────────┐     ┌───────────────┐     ┌───────────────┐
│ Session      │     │ Customer      │     │ Report        │
├──────────────┤     ├───────────────┤     ├───────────────┤
│ sessionId    │     │ customerId    │     │ reportId      │
│ userId       │     │ shopId        │◄────┤ shopId        │
│ ...          │     │ ...           │     │ type          │
└──────────────┘     └───────┬───────┘     │ ...           │
                             │             └───────────────┘
                             │
                             ▼
                    ┌───────────────┐      ┌───────────────┐
                    │ Debt          │      │ Payment       │
                    ├───────────────┤      ├───────────────┤
                    │ debtId        │      │ paymentId     │
                    │ shopId        │      │ shopId        │
                    │ customerId    │◄─────┤ contextId     │
                    │ amount        │      │ ...           │
                    │ ...           │      │               │
                    └───────────────┘      └───────────────┘
```

All entities include a `shopId` field that enforces tenant isolation. The backend automatically applies shop-based filtering to all queries based on the authenticated user's context.

## 7. Deployment Architecture

### 7.1 Development Environment
- Local development with Docker Compose
- MongoDB in container or cloud Atlas
- Local FastAPI ML service

### 7.2 Production Environment
- Backend: Docker container on cloud platform
- Frontend: Static hosting with CDN
- Mobile: App stores (Google Play/App Store)
- ML Service: Docker container on Railway

### 7.3 Infrastructure Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Content Delivery Network                      │
└───────┬─────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ Web Frontend  │     │ API Gateway   │     │ Mobile App    │
│ (Vercel)      │     │ (Nginx)       │     │ (App Stores)  │
└───────┬───────┘     └───────┬───────┘     └───────┬───────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────────┐
        │       Container Orchestration Platform       │
        │                                             │
        │  ┌─────────────┐        ┌─────────────┐    │
        │  │ Backend API │        │ ML Service  │    │
        │  │ Container   │◄──────►│ Container   │    │
        │  └──────┬──────┘        └─────────────┘    │
        │         │                                  │
        └─────────┼──────────────────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │  MongoDB Atlas      │
        │  (Cloud Database)   │
        └─────────────────────┘
```

## 8. Security Architecture

DeynCare implements multiple layers of security:

### 8.1 Authentication & Authorization
- JWT-based authentication with short-lived access tokens
- Refresh token rotation for session management
- Role-based access control for all operations
- Shop-based data isolation

### 8.2 API Security
- Rate limiting to prevent abuse
- Input validation and sanitization
- CORS configuration
- HTTP security headers

### 8.3 Data Security
- Transport-level encryption (HTTPS)
- Hashed and salted passwords
- Encrypted sensitive data fields
- Regular security audits

## 9. Monitoring and Logging

DeynCare implements comprehensive monitoring:

- **Application Performance**: Response times, error rates
- **User Activity**: Authentication events, critical operations
- **System Resources**: CPU, memory, network usage
- **Security Events**: Authentication failures, access violations

## 10. Future Roadmap

### 10.1 Near-Term (Q3 2025)
- Advanced data visualization for risk analytics
- Expanded ML model capabilities
- Enhanced offline functionality for mobile

### 10.2 Mid-Term (Q4 2025)
- Multi-language support expansion
- Advanced reporting features
- Integration with additional payment providers

### 10.3 Long-Term (2026)
- Predictive analytics for business insights
- White-label solution for enterprise customers
- Expanded regional support

## 11. Conclusion

The DeynCare system architecture provides a robust, scalable foundation for debt management and point-of-sale operations. The multi-tenant design enables efficient resource utilization while maintaining strict data isolation. The integration of machine learning for risk analysis provides significant value to businesses managing customer debt, aligning with the primary business focus (70%) on debt repayment risk analysis.

---

## Appendix A: Technology Stack Summary

| Component | Technologies |
|-----------|--------------|
| Backend | Node.js, Express.js, MongoDB, JWT |
| Web Frontend | Next.js, React, TailwindCSS, ShadCN UI |
| Mobile App | Flutter, BLoC, Dio |
| ML Service | FastAPI, Scikit-learn, Pandas |
| DevOps | Docker, Railway, GitHub Actions |

## Appendix B: Glossary

- **Tenant**: A business entity (shop) using the DeynCare platform
- **Shop**: The organizational unit that represents a tenant
- **FairRisk Algorithm**: Custom risk assessment algorithm for debt repayment
- **DebtPaidRatio**: Percentage of debt already paid by a customer
- **Risk Score**: Numerical representation of customer repayment risk
