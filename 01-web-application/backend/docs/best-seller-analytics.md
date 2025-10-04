# Best Seller Analytics API Documentation

This document describes the best seller analytics endpoints that provide insights into the most popular items at Nomu Cafe based on customer past orders.

## Overview

The best seller analytics system analyzes customer past orders to determine:
- Most popular items by quantity sold
- Best sellers by category
- Sales trends over time
- Revenue analysis

## Data Structure

### Updated User Model
The `pastOrders` array in the User model now includes:
```javascript
pastOrders: [{
  drink: String,           // Item name
  quantity: Number,        // Quantity ordered (default: 1)
  price: Number,          // Price per unit (default: 0)
  date: Date             // Order date
}]
```

## API Endpoints

### 1. Get Best Sellers
**Endpoint:** `GET /api/analytics/best-sellers`

**Description:** Returns the most popular items based on total quantity sold.

**Query Parameters:**
- `period` (optional): Time period filter
  - `all` (default): All time
  - `today`: Today only
  - `week`: Last 7 days
  - `month`: Current month
  - `year`: Current year
- `limit` (optional): Number of results to return (default: 10)

**Response:**
```json
{
  "bestSellers": [
    {
      "itemName": "Coffee Latte",
      "totalOrders": 25,
      "totalQuantity": 45,
      "totalRevenue": 6750,
      "uniqueCustomers": 20,
      "orderPercentage": "15.25",
      "quantityPercentage": "18.75",
      "revenuePercentage": "16.50"
    }
  ],
  "summary": {
    "totalOrders": 164,
    "totalQuantity": 240,
    "totalRevenue": 40920,
    "totalUniqueItems": 8,
    "period": "month",
    "generatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Get Best Sellers by Category
**Endpoint:** `GET /api/analytics/best-sellers-by-category`

**Description:** Returns best selling items grouped by category.

**Query Parameters:**
- `period` (optional): Time period filter (same as above)
- `limit` (optional): Number of results per category (default: 5)

**Response:**
```json
{
  "categories": {
    "Drinks": [
      {
        "itemName": "Coffee Latte",
        "totalOrders": 25,
        "totalQuantity": 45,
        "totalRevenue": 6750,
        "uniqueCustomers": 20
      }
    ],
    "Donuts": [
      {
        "itemName": "Chocolate Donut",
        "totalOrders": 15,
        "totalQuantity": 30,
        "totalRevenue": 2400,
        "uniqueCustomers": 12
      }
    ]
  },
  "categoryTotals": {
    "Drinks": {
      "totalOrders": 45,
      "totalQuantity": 80,
      "totalRevenue": 12000,
      "totalItems": 3,
      "topItem": "Coffee Latte"
    }
  },
  "summary": {
    "period": "month",
    "generatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 3. Get Sales Trends
**Endpoint:** `GET /api/analytics/sales-trends`

**Description:** Returns sales trends over time for analysis.

**Query Parameters:**
- `period` (optional): Time grouping
  - `daily`: Group by day
  - `weekly`: Group by week
  - `monthly` (default): Group by month
- `itemName` (optional): Filter by specific item name

**Response:**
```json
{
  "trends": [
    {
      "period": "2024-01",
      "totalOrders": 164,
      "totalQuantity": 240,
      "totalRevenue": 40920,
      "uniqueCustomers": 45
    },
    {
      "period": "2024-02",
      "totalOrders": 189,
      "totalQuantity": 275,
      "totalRevenue": 45650,
      "uniqueCustomers": 52
    }
  ],
  "summary": {
    "period": "monthly",
    "itemName": "All Items",
    "generatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## Authentication

All endpoints require authentication with admin privileges:
- `superadmin`
- `manager` 
- `staff`

## Usage Examples

### Get Top 5 Best Sellers This Month
```bash
GET /api/analytics/best-sellers?period=month&limit=5
Authorization: Bearer <admin_token>
```

### Get Best Sellers by Category for Last Week
```bash
GET /api/analytics/best-sellers-by-category?period=week&limit=3
Authorization: Bearer <admin_token>
```

### Get Daily Sales Trends for Coffee Latte
```bash
GET /api/analytics/sales-trends?period=daily&itemName=Coffee Latte
Authorization: Bearer <admin_token>
```

## Key Features

1. **Quantity-Based Ranking**: Items are ranked by total quantity sold, not just order count
2. **Revenue Tracking**: Includes revenue calculations for each item
3. **Customer Analysis**: Tracks unique customers for each item
4. **Percentage Calculations**: Shows market share percentages
5. **Time Filtering**: Flexible time period filtering
6. **Category Grouping**: Organizes results by menu categories
7. **Trend Analysis**: Historical sales trend tracking

## Data Accuracy

- Results are based on actual customer past orders
- Only includes orders from customers (role: 'Customer')
- Excludes disabled menu items
- Handles missing or invalid data gracefully
- Provides comprehensive error handling and logging

## Performance Considerations

- Uses MongoDB aggregation pipelines for efficient data processing
- Includes proper indexing on frequently queried fields
- Limits results to prevent large response payloads
- Optimized queries for better performance

## Error Handling

All endpoints include comprehensive error handling:
- 403 Forbidden: Insufficient permissions
- 500 Internal Server Error: Server-side errors
- Detailed error logging for debugging
- Graceful handling of missing data

## Future Enhancements

Potential future improvements:
- Real-time analytics updates
- Advanced filtering options
- Export functionality (CSV, PDF)
- Comparative analysis between periods
- Customer segmentation analysis
- Inventory correlation analysis
