# DeynCare User Management System Documentation

## Table of Contents
- [System Overview](#system-overview)
- [Architecture Components](#architecture-components)
  - [Backend Architecture](#backend-architecture)
  - [Frontend Architecture](#frontend-architecture)
- [Key Features](#key-features)
  - [User Management](#user-management)
  - [Authentication System](#authentication-system)
- [Technical Implementation](#technical-implementation)
  - [Database Schema](#database-schema)
  - [API Endpoints](#api-endpoints)
  - [State Management](#state-management)
  - [Component Architecture](#component-architecture)
- [Recent Improvements](#recent-improvements)
- [Usage Examples](#usage-examples)
- [Security Considerations](#security-considerations)
- [Maintenance and Monitoring](#maintenance-and-monitoring)
- [Future Enhancements](#future-enhancements)
- [Troubleshooting](#troubleshooting)

## System Overview

The DeynCare User Management System provides a comprehensive solution for managing user accounts across the platform. The system supports full CRUD operations, role-based access control, shop association, and robust authentication.

This documentation serves as a technical reference for developers working with the user management system, providing insights into architecture, implementation details, and best practices.

## Architecture Components

### Backend Architecture

#### Controllers
- **UserController**: Handles API endpoints for user management operations
  - User creation, reading, updating, deletion
  - Status management with reason tracking
  - Role and permission handling
  
- **AuthController**: Manages authentication, including token refresh functionality
  - Login and registration
  - Token management (access and refresh tokens)
  - Password reset functionality

#### Services
- **UserService**: Core business logic for user operations
  - User data manipulation and validation
  - Shop name population for user data
  - User lifecycle management
  
- **ShopService**: Integration with shop-related operations
  - Shop data retrieval for user associations
  - Shop verification and validation
  
- **AuthService**: Authentication and authorization operations
  - Token generation and validation
  - Role-based permission checks
  - Login attempt tracking

#### Models
- **User**: Core user data model with role, shop associations, and status
  - Fields: userId, firstName, lastName, email, role, shopId, status
  - Methods: validatePassword, generateAuthToken, sanitizeForResponse
  
- **Shop**: Shop data model with relationship to users
  - Fields: shopId, shopName, ownerName, status
  - Methods: getActiveShops, getShopWithDetails

#### Middleware
- **AuthMiddleware**: Token validation and role-based authorization
  - verifyToken: Validates JWT tokens
  - authorize: Role-based endpoint protection
  - authenticate: General authentication checking
  
- **ErrorHandler**: Centralized error handling
  - Custom error types and messages
  - Consistent error response format
  - Logging and reporting

### Frontend Architecture

#### Context Providers
- **UsersContext**: Centralized state management for user data and operations
  - State: users, loading, error
  - Methods: fetchUsers, createUser, updateUser, deleteUser, changeUserStatus
  
- **AuthContext**: Authentication state management with redirect protection
  - State: user, isAuthenticated, loading, error
  - Methods: login, logout, checkAuth, refreshToken

#### Components
- **UserFormDialog**: Add/edit users with validation
  - Form validation using Zod schema
  - Role-specific field rendering
  - Shop selection integration
  
- **ChangeStatusDialog**: Manage user status changes
  - Status options: active, inactive, suspended
  - Reason capturing and validation
  - Confirmation workflow
  
- **UserDetailsDialog**: Display comprehensive user information
  - Profile data presentation
  - Shop information display
  - Last login and activity tracking
  
- **DeleteUserDialog**: Confirm and process user deletion
  - Reason capturing
  - Final confirmation
  - Success/failure handling

#### Services
- **UserService**: API communication layer for user operations
  - Specialized methods for each user operation
  - Response transformation and error handling
  - Date and time formatting utilities
  
- **ApiService**: Base HTTP client with token management
  - Request/response interceptors
  - Token refresh functionality
  - Error standardization

## Key Features

### User Management

#### User Creation
- Role assignment (Employee, Admin, SuperAdmin)
- Shop association with intelligent shop selection
- Secure password handling with validation
- Welcome email options with templated content
- Duplicate prevention and error handling

#### User Listing and Filtering
- Pagination with customizable page size
- Multi-criteria search and filtering
- Role and status filtering
- Real-time data updates without page reload
- Responsive table with column sorting

#### User Details and Editing
- Complete user profile information display
- Shop details with proper name display
- Last login tracking with relative time formatting
- Edit capabilities with comprehensive validation
- Field-level permission control based on role

#### User Status Management
- Activation/Deactivation/Suspension workflows
- Reason tracking and comprehensive logging
- Email notifications for status changes
- Historical status change tracking
- Role-based permission controls

#### User Deletion
- Confirmation workflow with reason documentation
- Proper cleanup of related data (cascade or preserve)
- Activity logging and audit trail
- Restore capabilities (soft delete)
- Permission checks and validations

### Authentication System

#### Token Management
- JWT-based authentication with asymmetric keys
- Access token + Refresh token pattern
- Secure token storage in localStorage
- Automatic token refresh with expiry tracking
- Token invalidation on logout or security concern

#### Login Protection
- Redirect loop prevention with timestamp tracking
- Session tracking across browser tabs
- Rate limiting protection with exponential backoff
- Brute force prevention
- Device fingerprinting

#### Authorization
- Role-based access control (RBAC)
- Shop-specific permissions
- API endpoint protection with middleware
- UI component conditional rendering
- Permission inheritance and override

## Technical Implementation

### Database Schema

#### User Collection
```
{
  userId: String (unique, required),
  firstName: String (required),
  lastName: String (required),
  email: String (unique, required),
  password: String (hashed, required),
  role: String (enum: ['employee', 'admin', 'superAdmin'], required),
  shopId: String (reference to Shop),
  status: String (enum: ['active', 'inactive', 'suspended'], default: 'active'),
  verified: Boolean (default: false),
  lastLoginAt: Date,
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date (null if not deleted),
  preferences: {
    language: String,
    notifications: {
      email: Boolean,
      sms: Boolean,
      app: Boolean
    }
  },
  verification: {
    code: String,
    expiresAt: Date
  }
}
```

#### Shop Collection
```
{
  shopId: String (unique, required),
  shopName: String (required),
  ownerName: String (required),
  email: String (required),
  phone: String (required),
  address: String (required),
  status: String (enum: ['active', 'pending', 'suspended'], default: 'pending'),
  verified: Boolean (default: false),
  subscription: {
    planType: String,
    startDate: Date,
    endDate: Date,
    status: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

### API Endpoints

#### User Management
- `GET /api/users` - List all users (with filtering and pagination)
- `GET /api/users/:userId` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:userId` - Update user
- `PATCH /api/users/:userId/status` - Change user status
- `DELETE /api/users/:userId` - Delete user

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### State Management

#### Frontend State Flow
1. Context providers establish global state
2. Components interact with contexts through hooks
3. Service methods handle API communication
4. State updates trigger UI re-renders
5. Error handling propagates through the chain

#### Backend State Flow
1. API endpoints receive client requests
2. Controllers validate request data
3. Services execute business logic
4. Models interact with the database
5. Response data flows back through the chain

### Component Architecture

#### User Management Workflow
1. UsersPage renders the main user interface
2. DataTable displays user information with pagination
3. Action buttons trigger modal dialogs
4. Form components handle user input and validation
5. Context functions execute the actual operations
6. Toast notifications provide feedback

## Recent Improvements

### Enhanced Shop Information Display
- Shop names now properly displayed in user management interface
- Direct shop information retrieval and caching
- Fallback mechanisms for missing shop data
- Improved visual design for shop information
- Clear shop-role relationship indicators

### Robust Authentication
- Advanced token refresh with loop prevention
- Optimized navigation using React Router
- Intelligent redirect prevention
- Storage event listeners for cross-tab synchronization
- Enhanced error recovery mechanisms

### Full CRUD Implementation
- Complete end-to-end user management
- Centralized state management
- Real-time UI updates without page reloads
- Enhanced error handling and validation
- Comprehensive activity logging

### Performance Optimizations
- Reduced unnecessary API requests
- Authentication state awareness
- Intelligent data fetching and caching
- Debounced search operations
- Optimized rendering

## Usage Examples

### Creating a User

```jsx
// React component example
import { useUsers } from '@/contexts/users-context';

function CreateUserExample() {
  const { createUser } = useUsers();
  
  const handleCreateUser = async () => {
    try {
      await createUser({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        role: 'employee',
        shopId: 'SHOP001',
        password: 'securePassword123',
        sendWelcomeEmail: true
      });
      
      // Success handling
    } catch (error) {
      // Error handling
    }
  };
  
  return (
    <button onClick={handleCreateUser}>Create User</button>
  );
}
```

### Changing User Status

```jsx
// React component example
import { useUsers } from '@/contexts/users-context';

function ChangeStatusExample({ userId }) {
  const { changeUserStatus } = useUsers();
  
  const handleSuspendUser = async () => {
    try {
      await changeUserStatus(userId, 'suspended', 'Violated platform rules');
      
      // Success handling
    } catch (error) {
      // Error handling
    }
  };
  
  return (
    <button onClick={handleSuspendUser}>Suspend User</button>
  );
}
```

### Fetching Users with Filters

```jsx
// React component example
import { useUsers } from '@/contexts/users-context';
import { useState, useEffect } from 'react';

function UserListExample() {
  const { fetchUsers } = useUsers();
  const [filters, setFilters] = useState({
    status: 'active',
    role: 'admin',
    search: ''
  });
  
  useEffect(() => {
    const loadUsers = async () => {
      try {
        await fetchUsers(filters, 1, 10);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    
    loadUsers();
  }, [filters, fetchUsers]);
  
  // Component rendering
}
```

## Security Considerations

### Authentication
- Tokens are properly secured in localStorage
- Token refreshing follows security best practices
- Proper cleanup of expired/invalid tokens
- CSRF protection for sensitive operations
- Brute force prevention with rate limiting

### Authorization
- Strict role-based access control
- Shop-specific permissions
- Proper validation of ownership
- Least privilege principle application
- Complete permission checks on both client and server

### Data Protection
- Password hashing with strong algorithms (bcrypt)
- Proper API endpoint protection
- User data sanitization
- Input validation on all endpoints
- Protection against common web vulnerabilities (XSS, CSRF)

## Maintenance and Monitoring

### Logging
- Comprehensive activity logging
- Error reporting and tracking
- Authentication event monitoring
- Performance metrics collection
- Security incident logging

### Error Handling
- Centralized error processing
- User-friendly error messages
- Robust recovery mechanisms
- Standardized error formats
- Detailed internal error information

### Performance Monitoring
- API request tracking
- Authentication flow monitoring
- Rate limit detection and handling
- Database query performance
- Frontend rendering optimization

## Future Enhancements

### Advanced User Management
- Bulk operations (create, update, delete)
- Enhanced reporting and analytics
- Activity history and audit trails
- Custom role creation
- Team and department groupings

### Authentication Improvements
- Multi-factor authentication
- JWT cookie-based authentication
- Enhanced session management
- Social authentication integration
- Biometric authentication support

### Integration Enhancements
- Better shop integration
- Role-based UI customization
- Enhanced notification system
- API access management
- Third-party integration capabilities

## Troubleshooting

### Authentication Issues
- **Symptom**: Redirect loops between dashboard and login page
- **Cause**: Token refresh failing with improper error handling
- **Solution**: Implemented redirect loop prevention with timeout tracking

### Shop Name Display Issues
- **Symptom**: Shop IDs shown instead of names in the UI
- **Cause**: Missing shop name population in backend services
- **Solution**: Enhanced the UserService to populate shop details

### Performance Problems
- **Symptom**: Slow loading of user list with many records
- **Cause**: Inefficient API requests and lack of pagination
- **Solution**: Implemented proper pagination, filtering, and caching

### Error Recovery
- **Symptom**: Application crashes on certain API errors
- **Cause**: Insufficient error handling in frontend components
- **Solution**: Added comprehensive error handling and fallback UI states
