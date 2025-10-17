# 🔌 API Endpoints Documentation

## Overview
Complete documentation of all REST API endpoints available in the Nomu Cafe server.

## Base URL
```
Development: http://localhost:5000
Production: https://yourdomain.com
```

## Authentication
Most endpoints require authentication via JWT token in the Authorization header:
```http
Authorization: Bearer <your_jwt_token>
```

## Response Format
All API responses follow a consistent format:

### Success Response
```json
{
  "message": "Success message",
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

## Authentication Endpoints

### Customer Authentication

#### Register New Customer
```http
POST /api/auth/signup
Content-Type: application/json

{
  "fullName": "John Doe",
  "username": "johndoe",
  "email": "john@gmail.com",
  "birthday": "1990-01-01",
  "gender": "male",
  "password": "StrongPass123!"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "token": "jwt_token_here",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "email": "john@gmail.com",
    "role": "customer"
  }
}
```

#### Customer Login
```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "john@gmail.com",
  "password": "StrongPass123!",
  "rememberMe": true
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "email": "john@gmail.com",
    "role": "customer"
  }
}
```

### Admin Authentication

#### Request Admin OTP
```http
POST /api/auth/admin/request-otp
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin_password"
}
```

**Response:**
```json
{
  "message": "OTP sent to your email"
}
```

#### Verify Admin OTP
```http
POST /api/auth/admin/verify-otp
Content-Type: application/json

{
  "email": "admin@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "message": "Admin login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "fullName": "Admin Name",
    "email": "admin@example.com",
    "role": "superadmin"
  }
}
```

### User Management

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "fullName": "John Doe",
    "email": "john@gmail.com",
    "role": "customer",
    "profilePicture": "/api/images/profile/507f1f77bcf86cd799439012"
  }
}
```

#### Update User Profile
```http
PUT /api/auth/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "John Updated",
  "employmentStatus": "Employed"
}
```

## Menu Management

### Get All Menu Items (Admin)
```http
GET /api/menu
Authorization: Bearer <admin_token>
```

### Get Active Menu Items (Public)
```http
GET /api/menu/client
```

**Response:**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "name": "Cappuccino",
    "description": "Rich espresso with steamed milk",
    "price": 120,
    "category": "Drinks",
    "imageUrl": "/api/images/menu/507f1f77bcf86cd799439012",
    "status": "active"
  }
]
```

### Create Menu Item
```http
POST /api/menu
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

name: Cappuccino
description: Rich espresso with steamed milk
price: 120
category: Drinks
image: [file]
```

### Update Menu Item
```http
PUT /api/menu/:id
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

name: Updated Cappuccino
price: 130
image: [file]
```

### Delete Menu Item
```http
DELETE /api/menu/:id
Authorization: Bearer <admin_token>
```

### Toggle Menu Item Status
```http
PATCH /api/menu/:id/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "disabled"
}
```

## Promotional Offers

### Get All Promos (Admin)
```http
GET /api/promos
Authorization: Bearer <admin_token>
```

### Get Active Promos (Public)
```http
GET /api/promos/active
```

**Response:**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "title": "Summer Sale",
    "description": "20% off all drinks",
    "promoType": "percentage",
    "discountValue": 20,
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-31T23:59:59.000Z",
    "imageUrl": "/api/images/promo/507f1f77bcf86cd799439012",
    "status": "Active"
  }
]
```

### Create Promo
```http
POST /api/promos
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

title: Summer Sale
description: 20% off all drinks
promoType: percentage
discountValue: 20
startDate: 2024-01-01
endDate: 2024-01-31
image: [file]
```

### Update Promo
```http
PUT /api/promos/:id
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

title: Updated Summer Sale
discountValue: 25
image: [file]
```

### Delete Promo
```http
DELETE /api/promos/:id
Authorization: Bearer <admin_token>
```

### Toggle Promo Status
```http
PATCH /api/promos/:id/toggle-status
Authorization: Bearer <admin_token>
```

## Inventory Management

### Get Inventory Items
```http
GET /api/inventory?page=1&limit=20&category=Drinks&search=coffee
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `category`: Filter by category (Donuts, Drinks, Pastries, Pizza)
- `status`: Filter by status (active, inactive, discontinued)
- `stockStatus`: Filter by stock status (in-stock, low-stock, out-of-stock)
- `search`: Search by name, SKU, or barcode
- `sortBy`: Sort field (name, currentStock, totalValue, createdAt)
- `sortOrder`: Sort order (asc, desc)

### Get Inventory Dashboard
```http
GET /api/inventory/dashboard
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "totalItems": 150,
  "lowStockItems": 12,
  "outOfStockItems": 3,
  "totalValue": 50000,
  "recentMovements": [...],
  "categoryBreakdown": [...]
}
```

### Get Specific Inventory Item
```http
GET /api/inventory/:id
Authorization: Bearer <admin_token>
```

### Create Inventory Item
```http
POST /api/inventory
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

name: Coffee Beans
category: Drinks
currentStock: 100
minimumThreshold: 20
unit: kg
unitCost: 500
sellingPrice: 600
image: [file]
```

### Update Inventory Item
```http
PUT /api/inventory/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "currentStock": 120,
  "unitCost": 480
}
```

### Record Stock Movement
```http
POST /api/inventory/:id/stock-movement
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "movementType": "purchase",
  "quantity": 50,
  "unitCost": 500,
  "reason": "received_order",
  "supplier": "Coffee Supplier Inc",
  "referenceNumber": "PO-2024-001"
}
```

### Delete Inventory Item
```http
DELETE /api/inventory/:id
Authorization: Bearer <admin_token>
```

## Customer Feedback

### Submit Feedback (Public)
```http
POST /api/feedback
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@gmail.com",
  "message": "Great coffee and service!"
}
```

### Get All Feedback (Admin)
```http
GET /api/feedback
Authorization: Bearer <admin_token>
```

### Reply to Feedback
```http
POST /api/feedback/reply/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reply": "Thank you for your feedback! We're glad you enjoyed your visit."
}
```

## Analytics

### Get Customer Analytics
```http
GET /api/analytics/overview
Authorization: Bearer <admin_token>
```

### Get Gender Distribution
```http
GET /api/analytics/gender
Authorization: Bearer <admin_token>
```

### Get Employment Status Distribution
```http
GET /api/analytics/employment
Authorization: Bearer <admin_token>
```

### Get Age Range Distribution
```http
GET /api/analytics/age-ranges
Authorization: Bearer <admin_token>
```

### Get Signup Growth
```http
GET /api/analytics/signup-growth?period=monthly
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `period`: daily, weekly, monthly (default: monthly)

## File Serving

### Serve Images
```http
GET /api/images/promo/:id      # Promo images
GET /api/images/menu/:id       # Menu images
GET /api/images/inventory/:id  # Inventory images
GET /api/images/profile/:id    # Profile images
```

## Admin Management

### Get All Admins
```http
GET /api/admins
Authorization: Bearer <superadmin_token>
```

### Create Admin
```http
POST /api/admins
Authorization: Bearer <superadmin_token>
Content-Type: application/json

{
  "fullName": "New Admin",
  "email": "admin@gmail.com",
  "password": "StrongPass123!",
  "role": "staff"
}
```

### Update Admin
```http
PUT /api/admins/:id
Authorization: Bearer <superadmin_token>
Content-Type: application/json

{
  "role": "manager",
  "status": "active"
}
```

### Delete Admin
```http
DELETE /api/admins/:id
Authorization: Bearer <superadmin_token>
```

## Error Codes

### Common Error Codes
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate resource)
- `413` - Payload Too Large (file too big)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Validation Errors
```json
{
  "error": "ValidationError",
  "message": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Email must be a valid Gmail address"
    }
  ]
}
```

### Rate Limit Errors
```json
{
  "error": "RateLimitError",
  "message": "Too many requests, please try again later",
  "retryAfter": 900
}
```

## Rate Limiting

### Limits by Endpoint
- **Authentication**: 5 requests per 15 minutes
- **General API**: 100 requests per 15 minutes
- **File Upload**: 10 uploads per hour
- **Admin Operations**: 50 requests per 15 minutes

### Rate Limit Headers
```http
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1640995200
```

## Testing

### Using cURL
```bash
# Test customer login
curl -X POST http://localhost:5000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gmail.com","password":"StrongPass123!"}'

# Test protected endpoint
curl -X GET http://localhost:5000/api/menu \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using Postman
1. Import the API collection
2. Set base URL to `http://localhost:5000`
3. Add Authorization header with Bearer token
4. Test all endpoints

---

**Related Documentation**:
- [Authentication System](./authentication.md)
- [File Storage System](./file-storage.md)
- [Security Implementation](./security.md)
