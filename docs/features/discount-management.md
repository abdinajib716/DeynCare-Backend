# Discount Code Management

The Discount Code Management feature allows super admins to create, manage, and track discount codes that can be applied to subscriptions and point-of-sale transactions.

## Important Implementation Details

- Discount codes are applicable to **subscription** and **POS** contexts by default
- Discount codes are **not** applicable to debt payments by default
- Special configuration is required to enable a discount code for debt payments

## API Endpoints

### Get All Discount Codes

```
GET /api/discounts
```

**Authentication Required**: Yes  
**Authorization**: Super Admin, Admin

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Number of items per page (default: 20)
- `isActive`: Filter by active status (true/false)
- `shopId`: Filter by shop ID
- `applicableFor`: Filter by applicable context (subscription, pos, debt, all)
- `code`: Filter by code (partial match)
- `type`: Filter by type (fixed, percentage)
- `status`: Filter by status (active, expired)
- `startDateFrom`: Filter by start date range (YYYY-MM-DD)
- `startDateTo`: Filter by start date range (YYYY-MM-DD)
- `expiryDateFrom`: Filter by expiry date range (YYYY-MM-DD)
- `expiryDateTo`: Filter by expiry date range (YYYY-MM-DD)

**Response**:
```json
{
  "success": true,
  "message": "Discount codes retrieved successfully",
  "data": {
    "discounts": [
      {
        "discountId": "DISC-12345",
        "code": "SUMMER2025",
        "description": "Summer discount for subscription renewals",
        "type": "percentage",
        "value": 15,
        "minimumPurchase": 50,
        "maxDiscountAmount": 100,
        "startDate": "2025-06-01T00:00:00.000Z",
        "expiryDate": "2025-08-31T23:59:59.000Z",
        "usageLimit": 1000,
        "usageCount": 243,
        "perUserLimit": 1,
        "applicableFor": ["subscription", "pos"],
        "shopId": null,
        "isActive": true,
        "createdBy": "USER-12345",
        "createdAt": "2025-05-15T14:30:00.000Z"
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

### Create Discount Code

```
POST /api/discounts
```

**Authentication Required**: Yes  
**Authorization**: Super Admin, Admin

**Request Body**:
```json
{
  "code": "WELCOME25",
  "description": "25% off for new subscribers",
  "type": "percentage",
  "value": 25,
  "minimumPurchase": 0,
  "maxDiscountAmount": 100,
  "startDate": "2025-05-01T00:00:00.000Z",
  "expiryDate": "2025-06-30T23:59:59.000Z",
  "usageLimit": 500,
  "perUserLimit": 1,
  "applicableFor": ["subscription", "pos"],
  "shopId": null,
  "isActive": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Discount code created successfully",
  "data": {
    "discountId": "DISC-12346",
    "code": "WELCOME25",
    "description": "25% off for new subscribers",
    "type": "percentage",
    "value": 25,
    "minimumPurchase": 0,
    "maxDiscountAmount": 100,
    "startDate": "2025-05-01T00:00:00.000Z",
    "expiryDate": "2025-06-30T23:59:59.000Z",
    "usageLimit": 500,
    "usageCount": 0,
    "perUserLimit": 1,
    "applicableFor": ["subscription", "pos"],
    "shopId": null,
    "isActive": true,
    "createdBy": "USER-12345",
    "createdAt": "2025-04-27T07:30:00.000Z"
  }
}
```

### Get Discount Code by ID

```
GET /api/discounts/:discountId
```

**Authentication Required**: Yes  
**Authorization**: Super Admin, Admin

**Path Parameters**:
- `discountId`: ID of the discount code

**Response**:
```json
{
  "success": true,
  "message": "Discount code retrieved successfully",
  "data": {
    "discountId": "DISC-12346",
    "code": "WELCOME25",
    "description": "25% off for new subscribers",
    "type": "percentage",
    "value": 25,
    "minimumPurchase": 0,
    "maxDiscountAmount": 100,
    "startDate": "2025-05-01T00:00:00.000Z",
    "expiryDate": "2025-06-30T23:59:59.000Z",
    "usageLimit": 500,
    "usageCount": 0,
    "perUserLimit": 1,
    "applicableFor": ["subscription", "pos"],
    "shopId": null,
    "isActive": true,
    "createdBy": "USER-12345",
    "createdAt": "2025-04-27T07:30:00.000Z"
  }
}
```

### Update Discount Code

```
PUT /api/discounts/:discountId
```

**Authentication Required**: Yes  
**Authorization**: Super Admin, Admin

**Path Parameters**:
- `discountId`: ID of the discount code

**Request Body** (all fields optional):
```json
{
  "description": "Updated description",
  "type": "fixed",
  "value": 20,
  "minimumPurchase": 100,
  "maxDiscountAmount": null,
  "expiryDate": "2025-07-31T23:59:59.000Z",
  "usageLimit": 1000,
  "isActive": false
}
```

**Response**:
```json
{
  "success": true,
  "message": "Discount code updated successfully",
  "data": {
    "discountId": "DISC-12346",
    "code": "WELCOME25",
    "description": "Updated description",
    "type": "fixed",
    "value": 20,
    "minimumPurchase": 100,
    "maxDiscountAmount": null,
    "startDate": "2025-05-01T00:00:00.000Z",
    "expiryDate": "2025-07-31T23:59:59.000Z",
    "usageLimit": 1000,
    "usageCount": 0,
    "perUserLimit": 1,
    "applicableFor": ["subscription", "pos"],
    "shopId": null,
    "isActive": false,
    "createdBy": "USER-12345",
    "createdAt": "2025-04-27T07:30:00.000Z",
    "updatedBy": "USER-12345",
    "updatedAt": "2025-04-27T08:15:00.000Z"
  }
}
```

### Delete Discount Code

```
DELETE /api/discounts/:discountId
```

**Authentication Required**: Yes  
**Authorization**: Super Admin, Admin

**Path Parameters**:
- `discountId`: ID of the discount code

**Response**:
```json
{
  "success": true,
  "message": "Discount code deleted successfully"
}
```

### Validate Discount Code

```
POST /api/discounts/validate
```

**Authentication Required**: Yes  
**Authorization**: Any authenticated user

**Request Body**:
```json
{
  "code": "WELCOME25",
  "amount": 200,
  "context": "subscription"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "Discount code is valid",
  "data": {
    "discountId": "DISC-12346",
    "code": "WELCOME25",
    "type": "percentage",
    "value": 25,
    "discountAmount": 50,
    "finalAmount": 150,
    "description": "25% off for new subscribers"
  }
}
```

**Response (Invalid)**:
```json
{
  "success": false,
  "message": "Discount code is expired or inactive",
  "error": {
    "code": "invalid_discount",
    "message": "Discount code is expired or inactive"
  }
}
```

**Important Note**: For debt context, a special error will be returned:
```json
{
  "success": false,
  "message": "Discount codes cannot be applied to debt payments unless explicitly configured to do so.",
  "error": {
    "code": "invalid_context_debt",
    "message": "Discount codes cannot be applied to debt payments unless explicitly configured to do so."
  }
}
```

### Apply Discount Code

```
POST /api/discounts/apply
```

**Authentication Required**: Yes  
**Authorization**: Any authenticated user

**Request Body**:
```json
{
  "code": "WELCOME25",
  "amount": 200,
  "context": "subscription"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "Discount code applied successfully",
  "data": {
    "discountId": "DISC-12346",
    "code": "WELCOME25",
    "type": "percentage",
    "value": 25,
    "discountAmount": 50,
    "finalAmount": 150,
    "description": "25% off for new subscribers",
    "applied": true,
    "usageCount": 1,
    "usageLimit": 500
  }
}
```

**Response (Invalid)**:
```json
{
  "success": false,
  "message": "Discount code is expired or inactive",
  "error": {
    "code": "invalid_discount",
    "message": "Discount code is expired or inactive"
  }
}
```

## Frontend Implementation Guide

### React Query Implementation

Here's a sample implementation using React Query for fetching discount codes:

```tsx
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';

// API client
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

// Get all discount codes
export const useDiscountCodes = (page = 1, limit = 20, filters = {}) => {
  return useQuery(
    ['discountCodes', page, limit, filters],
    async () => {
      const params = { page, limit, ...filters };
      const response = await api.get('/api/discounts', { params });
      return response.data;
    },
    {
      keepPreviousData: true,
    }
  );
};

// Create discount code
export const useCreateDiscountCode = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    async (discountData) => {
      const response = await api.post('/api/discounts', discountData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('discountCodes');
      },
    }
  );
};

// Update discount code
export const useUpdateDiscountCode = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    async ({ discountId, data }) => {
      const response = await api.put(`/api/discounts/${discountId}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('discountCodes');
      },
    }
  );
};

// Delete discount code
export const useDeleteDiscountCode = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    async (discountId) => {
      const response = await api.delete(`/api/discounts/${discountId}`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('discountCodes');
      },
    }
  );
};

// Validate discount code
export const useValidateDiscountCode = () => {
  return useMutation(async (data) => {
    const response = await api.post('/api/discounts/validate', data);
    return response.data;
  });
};

// Apply discount code
export const useApplyDiscountCode = () => {
  return useMutation(async (data) => {
    const response = await api.post('/api/discounts/apply', data);
    return response.data;
  });
};
```

### Sample UI Component

Here's a sample component using Shadcn UI and TailwindCSS:

```tsx
import { useState } from 'react';
import { useDiscountCodes, useDeleteDiscountCode } from '../hooks/useDiscountApi';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { useToast } from '@/components/ui/use-toast';

export default function DiscountCodesTable() {
  const [page, setPage] = useState(1);
  const { toast } = useToast();
  
  const { data, isLoading, error } = useDiscountCodes(page);
  const deleteDiscountCode = useDeleteDiscountCode();
  
  const handleDelete = async (discountId) => {
    try {
      await deleteDiscountCode.mutateAsync(discountId);
      toast({
        title: 'Success',
        description: 'Discount code deleted successfully',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete discount code',
        variant: 'destructive',
      });
    }
  };
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading discount codes</div>;
  
  const { discounts, pagination } = data.data;
  
  return (
    <div className="space-y-4">
      <Table>
        <TableCaption>List of discount codes</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Expiry Date</TableHead>
            <TableHead>Usage</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {discounts.map((discount) => (
            <TableRow key={discount.discountId}>
              <TableCell className="font-medium">{discount.code}</TableCell>
              <TableCell>{discount.type}</TableCell>
              <TableCell>
                {discount.type === 'percentage' ? `${discount.value}%` : `$${discount.value}`}
              </TableCell>
              <TableCell>{new Date(discount.expiryDate).toLocaleDateString()}</TableCell>
              <TableCell>
                {discount.usageCount} / {discount.usageLimit || '∞'}
              </TableCell>
              <TableCell>
                {discount.isActive ? (
                  <Badge className="bg-green-500">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDelete(discount.discountId)}
                  >
                    Delete
                  </Button>
                </div>
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

For reference, here's the Discount Code schema:

```javascript
{
  discountId: {
    type: String,
    required: true,
    unique: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['fixed', 'percentage'],
    required: true
  },
  value: {
    type: Number,
    required: true
  },
  minimumPurchase: {
    type: Number,
    default: 0
  },
  maxDiscountAmount: {
    type: Number,
    default: null
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: true
  },
  usageLimit: {
    type: Number,
    default: null
  },
  usageCount: {
    type: Number,
    default: 0
  },
  perUserLimit: {
    type: Number,
    default: 1
  },
  applicableFor: {
    type: [String],
    enum: ['subscription', 'pos', 'debt', 'all'],
    default: ['subscription', 'pos']
  },
  shopId: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: {
    type: String,
    default: null
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
