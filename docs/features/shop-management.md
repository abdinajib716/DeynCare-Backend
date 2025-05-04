# Shop Management

The Shop Management feature allows super admins to manage, approve, and monitor all shops registered in the DeynCare system.

## Important Implementation Details

- Shops require verification before becoming active
- Super Admins can approve/reject shop registrations
- Shops can be suspended/reactivated by Super Admins
- Each shop has its own subscription plan and settings

## API Endpoints

### Get All Shops

```
GET /api/shops
```

**Authentication Required**: Yes  
**Authorization**: Super Admin

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Number of items per page (default: 20)
- `status`: Filter by status (active, pending, suspended)
- `verified`: Filter by verification status (true/false)
- `subscriptionStatus`: Filter by subscription status (active, trial, expired)
- `search`: Search by shop name or owner name

**Response**:
```json
{
  "success": true,
  "message": "Shops retrieved successfully",
  "data": {
    "shops": [
      {
        "shopId": "SHOP-12345",
        "shopName": "Example Shop",
        "ownerName": "John Doe",
        "email": "john@example.com",
        "phone": "+252612345678",
        "address": "123 Main St, Mogadishu, Somalia",
        "logoUrl": "https://example.com/logo.png",
        "status": "active",
        "verified": true,
        "subscription": {
          "planType": "monthly",
          "startDate": "2025-01-01T00:00:00.000Z",
          "endDate": "2025-02-01T00:00:00.000Z",
          "status": "active"
        },
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 20,
      "pages": 3
    }
  }
}
```

### Get Shop Details

```
GET /api/shops/:shopId
```

**Authentication Required**: Yes  
**Authorization**: Super Admin, Shop Admin (if shop matches their shopId)

**Path Parameters**:
- `shopId`: ID of the shop to retrieve

**Response**:
```json
{
  "success": true,
  "message": "Shop retrieved successfully",
  "data": {
    "shopId": "SHOP-12345",
    "shopName": "Example Shop",
    "ownerName": "John Doe",
    "email": "john@example.com",
    "phone": "+252612345678",
    "address": "123 Main St, Mogadishu, Somalia",
    "logoUrl": "https://example.com/logo.png",
    "status": "active",
    "verified": true,
    "subscription": {
      "subscriptionId": "SUB-12345",
      "planType": "monthly",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-02-01T00:00:00.000Z",
      "status": "active",
      "price": 30,
      "payment": {
        "method": "online",
        "verified": true,
        "lastPaymentDate": "2025-01-01T00:00:00.000Z",
        "nextPaymentDate": "2025-02-01T00:00:00.000Z"
      }
    },
    "statistics": {
      "totalCustomers": 25,
      "totalProducts": 150,
      "totalSales": 500,
      "totalRevenue": 15000
    },
    "settings": {
      "currency": "USD",
      "language": "en",
      "timezone": "Africa/Mogadishu"
    },
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-15T00:00:00.000Z"
  }
}
```

### Approve or Reject Shop

```
PUT /api/shops/:shopId/verify
```

**Authentication Required**: Yes  
**Authorization**: Super Admin

**Path Parameters**:
- `shopId`: ID of the shop to verify

**Request Body**:
```json
{
  "verified": true,
  "status": "active",
  "notes": "Verified shop documentation",
  "sendEmail": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Shop verified and activated successfully",
  "data": {
    "shopId": "SHOP-12345",
    "shopName": "Example Shop",
    "verified": true,
    "status": "active",
    "verifiedBy": "USER-ADMIN",
    "verifiedAt": "2025-04-27T10:30:00.000Z"
  }
}
```

### Suspend or Reactivate Shop

```
PUT /api/shops/:shopId/status
```

**Authentication Required**: Yes  
**Authorization**: Super Admin

**Path Parameters**:
- `shopId`: ID of the shop to update

**Request Body**:
```json
{
  "status": "suspended", // or "active"
  "reason": "Violation of terms of service",
  "duration": 7, // days, optional
  "sendEmail": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Shop suspended successfully",
  "data": {
    "shopId": "SHOP-12345",
    "shopName": "Example Shop",
    "status": "suspended",
    "suspendedBy": "USER-ADMIN",
    "suspendedAt": "2025-04-27T10:30:00.000Z",
    "suspensionReason": "Violation of terms of service",
    "suspensionEndDate": "2025-05-04T10:30:00.000Z"
  }
}
```

### Update Shop Details

```
PUT /api/shops/:shopId
```

**Authentication Required**: Yes  
**Authorization**: Super Admin, Shop Admin (if shop matches their shopId)

**Path Parameters**:
- `shopId`: ID of the shop to update

**Request Body** (all fields optional):
```json
{
  "shopName": "Updated Shop Name",
  "ownerName": "Updated Owner Name",
  "email": "newemail@example.com",
  "phone": "+252612345679",
  "address": "456 New St, Mogadishu, Somalia",
  "settings": {
    "currency": "USD",
    "language": "en",
    "timezone": "Africa/Mogadishu"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Shop updated successfully",
  "data": {
    "shopId": "SHOP-12345",
    "shopName": "Updated Shop Name",
    "ownerName": "Updated Owner Name",
    "email": "newemail@example.com",
    "phone": "+252612345679",
    "address": "456 New St, Mogadishu, Somalia",
    "settings": {
      "currency": "USD",
      "language": "en",
      "timezone": "Africa/Mogadishu"
    },
    "updatedAt": "2025-04-27T10:45:00.000Z"
  }
}
```

### Upload Shop Logo

```
POST /api/shops/:shopId/logo
```

**Authentication Required**: Yes  
**Authorization**: Super Admin, Shop Admin (if shop matches their shopId)

**Path Parameters**:
- `shopId`: ID of the shop to update

**Request Format**: multipart/form-data

**Form Fields**:
- `logo`: Image file (JPG, PNG, max 2MB)

**Response**:
```json
{
  "success": true,
  "message": "Shop logo uploaded successfully",
  "data": {
    "shopId": "SHOP-12345",
    "logoUrl": "https://deyncare.com/uploads/shops/SHOP-12345/logo.png",
    "updatedAt": "2025-04-27T10:50:00.000Z"
  }
}
```

### Get Shop Statistics

```
GET /api/shops/:shopId/statistics
```

**Authentication Required**: Yes  
**Authorization**: Super Admin, Shop Admin (if shop matches their shopId)

**Path Parameters**:
- `shopId`: ID of the shop to get statistics for

**Query Parameters**:
- `startDate`: Start date for statistics (YYYY-MM-DD)
- `endDate`: End date for statistics (YYYY-MM-DD)

**Response**:
```json
{
  "success": true,
  "message": "Shop statistics retrieved successfully",
  "data": {
    "shopId": "SHOP-12345",
    "shopName": "Example Shop",
    "period": {
      "start": "2025-01-01T00:00:00.000Z",
      "end": "2025-04-01T00:00:00.000Z"
    },
    "customers": {
      "total": 100,
      "new": 25,
      "active": 75
    },
    "sales": {
      "total": 500,
      "amount": 15000,
      "average": 30
    },
    "payments": {
      "total": 450,
      "amount": 13500,
      "pending": 50
    },
    "products": {
      "total": 200,
      "topSelling": [
        {
          "productId": "PROD-12345",
          "name": "Product 1",
          "quantity": 50,
          "amount": 1500
        }
      ]
    },
    "subscriptionStatus": "active",
    "subscriptionEndDate": "2025-05-01T00:00:00.000Z"
  }
}
```

## Frontend Implementation Guide

### React Query Implementation

Here's a sample implementation using React Query for fetching shop data:

```tsx
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';

// API client setup
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Get all shops
export const useShops = (page = 1, limit = 20, filters = {}) => {
  return useQuery(
    ['shops', page, limit, filters],
    async () => {
      const params = { page, limit, ...filters };
      const response = await api.get('/api/shops', { params });
      return response.data;
    },
    {
      keepPreviousData: true,
    }
  );
};

// Get shop details
export const useShopDetails = (shopId) => {
  return useQuery(
    ['shop', shopId],
    async () => {
      const response = await api.get(`/api/shops/${shopId}`);
      return response.data;
    },
    {
      enabled: !!shopId,
    }
  );
};

// Verify shop
export const useVerifyShop = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    async ({ shopId, data }) => {
      const response = await api.put(`/api/shops/${shopId}/verify`, data);
      return response.data;
    },
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(['shops']);
        queryClient.invalidateQueries(['shop', variables.shopId]);
      },
    }
  );
};

// Update shop status
export const useUpdateShopStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    async ({ shopId, data }) => {
      const response = await api.put(`/api/shops/${shopId}/status`, data);
      return response.data;
    },
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(['shops']);
        queryClient.invalidateQueries(['shop', variables.shopId]);
      },
    }
  );
};

// Get shop statistics
export const useShopStatistics = (shopId, startDate, endDate) => {
  return useQuery(
    ['shopStatistics', shopId, startDate, endDate],
    async () => {
      const params = { startDate, endDate };
      const response = await api.get(`/api/shops/${shopId}/statistics`, { params });
      return response.data;
    },
    {
      enabled: !!shopId,
    }
  );
};
```

### Shop Management Dashboard Component

Here's a sample component using Shadcn UI and TailwindCSS:

```tsx
// src/app/admin/shops/page.tsx
'use client';

import { useState } from 'react';
import { useShops, useVerifyShop, useUpdateShopStatus } from '@/hooks/useShopsApi';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { MoreHorizontal, Check, X, AlertTriangle } from 'lucide-react';

export default function ShopsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [filters, setFilters] = useState({
    status: '',
    verified: '',
    search: '',
  });
  const { toast } = useToast();
  
  const { data, isLoading, error } = useShops(page, limit, filters);
  const verifyShop = useVerifyShop();
  const updateShopStatus = useUpdateShopStatus();
  
  const handleVerify = async (shopId, verified) => {
    try {
      await verifyShop.mutateAsync({
        shopId,
        data: {
          verified,
          status: verified ? 'active' : 'inactive',
          sendEmail: true,
        },
      });
      
      toast({
        title: 'Success',
        description: `Shop ${verified ? 'approved' : 'rejected'} successfully`,
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update shop verification',
        variant: 'destructive',
      });
    }
  };
  
  const handleStatusChange = async (shopId, status) => {
    try {
      await updateShopStatus.mutateAsync({
        shopId,
        data: {
          status,
          sendEmail: true,
        },
      });
      
      toast({
        title: 'Success',
        description: `Shop ${status === 'suspended' ? 'suspended' : 'activated'} successfully`,
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update shop status',
        variant: 'destructive',
      });
    }
  };
  
  const handleSearchChange = (e) => {
    setFilters({ ...filters, search: e.target.value });
  };
  
  const handleStatusFilterChange = (value) => {
    setFilters({ ...filters, status: value });
  };
  
  const handleVerifiedFilterChange = (value) => {
    setFilters({ ...filters, verified: value });
  };
  
  if (isLoading) return <div>Loading shops...</div>;
  if (error) return <div>Error loading shops</div>;
  
  const { shops, pagination } = data.data;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Shops Management</h1>
        <Link href="/admin/shops/new">
          <Button>Add New Shop</Button>
        </Link>
      </div>
      
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search shops..."
            value={filters.search}
            onChange={handleSearchChange}
          />
        </div>
        <div className="w-40">
          <Select
            value={filters.status}
            onValueChange={handleStatusFilterChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Select
            value={filters.verified}
            onValueChange={handleVerifiedFilterChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Verified" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="true">Verified</SelectItem>
              <SelectItem value="false">Unverified</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Table>
        <TableCaption>A list of all shops in the system</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Shop Name</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Verification</TableHead>
            <TableHead>Subscription</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shops.map((shop) => (
            <TableRow key={shop.shopId}>
              <TableCell className="font-medium">
                <Link href={`/admin/shops/${shop.shopId}`} className="hover:underline">
                  {shop.shopName}
                </Link>
              </TableCell>
              <TableCell>{shop.ownerName}</TableCell>
              <TableCell>
                {shop.status === 'active' && <Badge className="bg-green-500">Active</Badge>}
                {shop.status === 'pending' && <Badge variant="outline">Pending</Badge>}
                {shop.status === 'suspended' && <Badge variant="destructive">Suspended</Badge>}
              </TableCell>
              <TableCell>
                {shop.verified ? (
                  <Badge variant="outline" className="border-green-500 text-green-500">
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-orange-500 text-orange-500">
                    Unverified
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={shop.subscription.status === 'active' ? 'default' : 'secondary'}>
                  {shop.subscription.planType}
                </Badge>
              </TableCell>
              <TableCell>{new Date(shop.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/shops/${shop.shopId}`}>
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    
                    {!shop.verified && (
                      <>
                        <DropdownMenuItem onClick={() => handleVerify(shop.shopId, true)}>
                          <Check className="mr-2 h-4 w-4 text-green-500" /> Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleVerify(shop.shopId, false)}>
                          <X className="mr-2 h-4 w-4 text-red-500" /> Reject
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {shop.status === 'active' && (
                      <DropdownMenuItem onClick={() => handleStatusChange(shop.shopId, 'suspended')}>
                        <AlertTriangle className="mr-2 h-4 w-4 text-orange-500" /> Suspend
                      </DropdownMenuItem>
                    )}
                    
                    {shop.status === 'suspended' && (
                      <DropdownMenuItem onClick={() => handleStatusChange(shop.shopId, 'active')}>
                        <Check className="mr-2 h-4 w-4 text-green-500" /> Reactivate
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1} 
            />
          </PaginationItem>
          
          {Array.from({ length: pagination.pages }, (_, i) => (
            <PaginationItem key={i + 1}>
              <PaginationLink
                isActive={page === i + 1}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => setPage(prev => Math.min(pagination.pages, prev + 1))}
              disabled={page === pagination.pages} 
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
```

## Model Schema

For reference, here's the Shop schema:

```javascript
{
  shopId: {
    type: String,
    required: true,
    unique: true
  },
  shopName: {
    type: String,
    required: true,
    trim: true
  },
  ownerName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  logoUrl: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'suspended', 'inactive'],
    default: 'pending'
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: String,
    default: null
  },
  verifiedAt: {
    type: Date
  },
  suspendedBy: {
    type: String,
    default: null
  },
  suspendedAt: {
    type: Date
  },
  suspensionReason: {
    type: String
  },
  suspensionEndDate: {
    type: Date
  },
  subscription: {
    type: Object,
    required: true
  },
  settings: {
    currency: {
      type: String,
      default: 'USD'
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  registeredBy: {
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
