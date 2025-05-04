# Authentication

The Authentication module handles user registration, login, logout, and session management for the DeynCare application.

## Important Implementation Details

- JWT-based authentication with access and refresh tokens
- Access tokens expire after 15 minutes (configurable)
- Refresh tokens expire after 7 days (configurable)
- Email verification is required for new accounts (except when created by Super Admin)
- Rate limiting is applied to login and registration endpoints

## API Endpoints

### Register (New User & Shop)

```
POST /api/auth/register
```

**Authentication Required**: No  
**Authorization**: None

**Request Body**:
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+252612345678",
  "password": "SecurePassword123!",
  "shopName": "John's Shop",
  "shopAddress": "123 Main St, Mogadishu, Somalia",
  "shopLogo": "https://example.com/logo.png",
  "planType": "monthly", 
  "paymentMethod": "EVC Plus",
  "initialPaid": true,
  "discountCode": "WELCOME25",
  "paymentDetails": {
    "amount": 30,
    "paidWith": "EVC Plus",
    "phoneNumber": "+252612345678",
    "receiptNumber": "EVCxxx123",
    "notes": "Initial subscription payment"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Registration successful! Please check your email for verification code.",
  "data": {
    "userId": "USER-12345",
    "email": "john@example.com",
    "fullName": "John Doe",
    "role": "admin",
    "shopId": "SHOP-12345",
    "shopName": "John's Shop",
    "status": "inactive",
    "verified": false
  }
}
```

### Login

```
POST /api/auth/login
```

**Authentication Required**: No  
**Authorization**: None

**Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "SecurePassword123!",
  "rememberMe": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "userId": "USER-12345",
      "email": "admin@example.com",
      "fullName": "Admin User",
      "role": "superAdmin",
      "status": "active",
      "verified": true,
      "shopId": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Access token
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // Refresh token
  }
}
```

### Refresh Token

```
POST /api/auth/refresh-token
```

**Authentication Required**: No (but requires valid refresh token)  
**Authorization**: None

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response**:
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // New access token
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // New refresh token
  }
}
```

### Logout

```
POST /api/auth/logout
```

**Authentication Required**: Yes  
**Authorization**: Any authenticated user

**Request Body**:
```json
{
  "allDevices": false // Optional, logs out from all devices if true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Create Employee (Admin Only)

```
POST /api/auth/create-employee
```

**Authentication Required**: Yes  
**Authorization**: Admin

**Request Body**:
```json
{
  "fullName": "Employee Name",
  "email": "employee@example.com",
  "phone": "+252612345678",
  "role": "employee",
  "permissions": ["sales", "inventory"],
  "sendInvite": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Employee created successfully. Invitation email sent.",
  "data": {
    "userId": "USER-12346",
    "email": "employee@example.com",
    "fullName": "Employee Name",
    "role": "employee",
    "status": "pending",
    "shopId": "SHOP-12345"
  }
}
```

### Create Admin User (Super Admin Only)

```
POST /api/auth/create-admin
```

**Authentication Required**: Yes  
**Authorization**: Super Admin

**Request Body**:
```json
{
  "fullName": "New Admin",
  "email": "newadmin@example.com",
  "phone": "+252612345678",
  "shopId": "SHOP-12345", // Optional, for shop-specific admin
  "role": "admin",
  "permissions": ["all"],
  "sendInvite": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Admin user created successfully. Invitation email sent.",
  "data": {
    "userId": "USER-12347",
    "email": "newadmin@example.com",
    "fullName": "New Admin",
    "role": "admin",
    "status": "active",
    "verified": true,
    "shopId": "SHOP-12345"
  }
}
```

### Verify Email

```
POST /api/auth/verify-email
```

**Authentication Required**: No  
**Authorization**: None

**Request Body**:
```json
{
  "email": "user@example.com",
  "verificationCode": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Email verified successfully. You can now log in.",
  "data": {
    "verified": true,
    "status": "active"
  }
}
```

### Resend Verification Code

```
POST /api/auth/resend-verification
```

**Authentication Required**: No  
**Authorization**: None

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Verification code sent successfully. Please check your email."
}
```

### Request Password Reset

```
POST /api/auth/forgot-password
```

**Authentication Required**: No  
**Authorization**: None

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password reset email sent successfully"
}
```

### Reset Password

```
POST /api/auth/reset-password
```

**Authentication Required**: No  
**Authorization**: None

**Request Body**:
```json
{
  "email": "user@example.com",
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "NewSecurePassword123!"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password reset successfully. You can now log in with your new password."
}
```

### Change Password

```
POST /api/auth/change-password
```

**Authentication Required**: Yes  
**Authorization**: Any authenticated user

**Request Body**:
```json
{
  "currentPassword": "CurrentPassword123!",
  "newPassword": "NewSecurePassword123!"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### Get Current User Profile

```
GET /api/auth/me
```

**Authentication Required**: Yes  
**Authorization**: Any authenticated user

**Response**:
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "userId": "USER-12345",
    "email": "user@example.com",
    "fullName": "User Name",
    "phone": "+252612345678",
    "role": "admin",
    "permissions": ["all"],
    "status": "active",
    "verified": true,
    "shopId": "SHOP-12345",
    "shopName": "User's Shop",
    "createdAt": "2025-01-15T12:00:00.000Z",
    "lastLogin": "2025-04-27T08:30:00.000Z"
  }
}
```

## Frontend Implementation Guide

### Authentication Context

Here's a sample implementation of an authentication context:

```tsx
// src/providers/AuthProvider.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

// Types
type User = {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  verified: boolean;
  shopId: string | null;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: (allDevices?: boolean) => Promise<void>;
  refreshToken: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API client
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  // Check if user is logged in
  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/api/auth/me');
      setUser(data.data);
      return true;
    } catch (error) {
      setUser(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Refresh token
  const refreshToken = async () => {
    try {
      const { data } = await api.post('/api/auth/refresh-token');
      return true;
    } catch (error) {
      setUser(null);
      return false;
    }
  };
  
  // Login
  const login = async (email: string, password: string, rememberMe = false) => {
    try {
      const { data } = await api.post('/api/auth/login', {
        email,
        password,
        rememberMe
      });
      
      // Store token in localStorage or httpOnly cookie is handled by the backend
      setUser(data.data.user);
      router.push('/admin/dashboard');
    } catch (error) {
      throw error;
    }
  };
  
  // Logout
  const logout = async (allDevices = false) => {
    try {
      await api.post('/api/auth/logout', { allDevices });
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  // Setup axios interceptor for token refresh
  useEffect(() => {
    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If error is 401 and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const refreshed = await refreshToken();
            
            if (refreshed) {
              return api(originalRequest);
            } else {
              router.push('/login');
              return Promise.reject(error);
            }
          } catch (refreshError) {
            router.push('/login');
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
    
    // Check authentication on mount
    checkAuth();
    
    return () => {
      api.interceptors.response.eject(responseInterceptor);
    };
  }, []);
  
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};
```

### Login Component Example

Here's a sample login form component using Shadcn UI and React Hook Form:

```tsx
// src/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';

// Form schema
const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  rememberMe: z.boolean().optional().default(false),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });
  
  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      setError(null);
      await login(data.email, data.password, data.rememberMe);
      toast({
        title: 'Success',
        description: 'You have been logged in successfully',
        variant: 'default',
      });
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to login. Please check your credentials.');
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to login',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle className="text-2xl">Login to DeynCare</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex items-center justify-between">
                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">Remember me</FormLabel>
                    </FormItem>
                  )}
                />
                
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Register
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
```

## Authentication Flow

Here's a diagram of the authentication flow:

```
┌─────────────┐     ┌────────────┐     ┌────────────────┐
│  User Login  │────▶│  JWT Token  │────▶│ Protected Routes │
└─────────────┘     └────────────┘     └────────────────┘
        │                 │                     │
        │                 │                     │
        ▼                 ▼                     ▼
┌─────────────┐     ┌────────────┐     ┌────────────────┐
│  Token      │     │ Auto Token │     │ API Requests    │
│  Expiry     │────▶│ Refresh    │────▶│ with Auth Header │
└─────────────┘     └────────────┘     └────────────────┘
```

## Security Considerations

1. **Token Storage**: 
   - Access tokens should be stored in memory (not localStorage)
   - Refresh tokens should be stored in HTTP-only cookies

2. **Token Expiration**:
   - Access tokens: 15 minutes
   - Refresh tokens: 7 days

3. **CSRF Protection**:
   - Include CSRF tokens for authenticated requests

4. **Rate Limiting**:
   - Implement rate limiting for login and registration attempts
   - Maximum 5 attempts per minute per IP address

5. **Password Requirements**:
   - Minimum 8 characters
   - Must include uppercase, lowercase, number, and special character

## Model Schema

For reference, here's the User schema:

```javascript
{
  userId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['superAdmin', 'admin', 'employee', 'user'],
    default: 'user'
  },
  permissions: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'pending'
  },
  verified: {
    type: Boolean,
    default: false
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  verificationCode: {
    type: String
  },
  verificationCodeExpires: {
    type: Date
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  lastLogin: {
    type: Date
  },
  shopId: {
    type: String,
    default: null
  },
  createdBy: {
    type: String,
    default: 'self'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```
