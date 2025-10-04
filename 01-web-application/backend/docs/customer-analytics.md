# Customer Analytics Feature Implementation

## Overview
This document outlines the implementation of the Customer Analytics feature for the Nomu Web App, which provides comprehensive insights into customer demographics and signup trends.

## Features Implemented

### 1. Database Schema Updates
- **User Model**: Added `employmentStatus` field with options:
  - Student
  - Employed
  - Unemployed
  - Prefer not to say
- **Existing Fields**: Utilized existing `birthday` and `gender` fields
- **Privacy-Friendly**: All fields include "Prefer not to say" options

### 2. Backend Analytics API
Created new analytics routes (`/api/analytics`) with the following endpoints:

#### `/api/analytics/gender`
- Returns gender distribution of customers
- Protected route (admin/super_admin only)
- Uses MongoDB aggregation for efficient data processing

#### `/api/analytics/employment`
- Returns employment status distribution
- Protected route (admin/super_admin only)
- Aggregates customer data by employment status

#### `/api/analytics/age-ranges`
- Calculates age from birthday field
- Groups customers into age ranges:
  - 1-17
  - 18-25
  - 26-32
  - 33-40
  - 41+
- Protected route (admin/super_admin only)

#### `/api/analytics/signup-growth`
- Tracks customer signup growth over time
- Configurable periods: daily, weekly, monthly
- Protected route (admin/super_admin only)

#### `/api/analytics/overview`
- Provides summary statistics:
  - Total customers
  - New customers this month
- Protected route (admin/super_admin only)

### 3. Frontend Components

#### CustomerAnalytics Component
- **Location**: `website/src/admin/components/CustomerAnalytics.jsx`
- **Charts**: Uses Recharts library for data visualization
- **Features**:
  - Pie chart for gender distribution
  - Bar chart for employment status
  - Bar chart for age ranges
  - Line chart for signup growth
  - Overview cards with key metrics
  - Period selector for signup growth (daily/weekly/monthly)

#### Admin Dashboard Integration
- **Location**: `website/src/admin/AdminHome.jsx`
- **Integration**: Customer Analytics section added to admin home dashboard
- **Layout**: Responsive grid layout with proper spacing and styling

### 4. User Interface Updates

#### SignUp Form
- **Location**: `website/src/client/SignUpForm.jsx`
- **Changes**: Added "Birthday" label above Month/Day/Year fields
- **Required Fields**: Only gender and birthday are required at signup
- **Employment Status**: Not required at signup, can be updated later

#### Account Settings
- **Location**: `website/src/client/AccountSettings.jsx`
- **Changes**: Added employment status field for editing
- **Features**: Users can view and edit their employment status
- **Default Value**: "Prefer not to say" for new users

### 5. API Integration Updates

#### Authentication Routes
- **Location**: `server/routes/auth.js`
- **Updates**: Modified to handle employment status field
- **Endpoints Updated**:
  - `GET /api/auth/me` - Returns employment status
  - `PUT /api/auth/me` - Allows updating employment status
  - Login response includes employment status

## Technical Implementation Details

### Age Calculation
```javascript
const calculateAge = (birthday) => {
  const today = new Date();
  const birthDate = new Date(birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};
```

### Age Range Categorization
```javascript
const categorizeAge = (age) => {
  if (age >= 1 && age <= 17) return '1-17';
  if (age >= 18 && age <= 25) return '18-25';
  if (age >= 26 && age <= 32) return '26-32';
  if (age >= 33 && age <= 40) return '33-40';
  if (age >= 41) return '41+';
  return 'Unknown';
};
```

### MongoDB Aggregation Example
```javascript
const genderStats = await User.aggregate([
  { $match: { role: 'customer' } },
  { $group: { _id: '$gender', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);
```

## Security Features

### Authentication & Authorization
- All analytics endpoints require valid JWT token
- Only admin and super_admin roles can access analytics
- User data is filtered by role (customers only)

### Data Privacy
- Age calculations done server-side
- No raw birthday data exposed to frontend
- Employment status is optional and user-editable

## Dependencies

### Backend
- Express.js
- MongoDB with Mongoose
- JWT authentication middleware

### Frontend
- React.js
- Recharts (already included in package.json)
- Responsive design with CSS Grid

## Usage Instructions

### For Administrators
1. Navigate to Admin Dashboard
2. View Customer Analytics section on the home page
3. Interact with charts and metrics
4. Switch between different time periods for signup growth

### For Customers
1. Employment status is optional during signup
2. Can update employment status in Account Settings
3. All personal data remains private and editable

## Future Enhancements

### Potential Additions
- Export analytics data to CSV/PDF
- Real-time analytics updates
- Custom date range selection
- Comparative analytics (month-over-month, year-over-year)
- Customer segmentation based on analytics data
- Email marketing insights based on demographics

### Performance Optimizations
- Implement caching for analytics data
- Add database indexes for frequently queried fields
- Implement pagination for large datasets
- Add data aggregation scheduling for real-time updates

## Testing

### Backend Testing
- Server starts successfully with new routes
- MongoDB connection established
- Analytics endpoints respond correctly
- Authentication middleware working

### Frontend Testing
- CustomerAnalytics component renders without errors
- Charts display data correctly
- Responsive design works on different screen sizes
- Integration with admin dashboard successful

## Conclusion

The Customer Analytics feature has been successfully implemented with:
- Comprehensive data collection and analysis
- Privacy-friendly data handling
- Beautiful, interactive visualizations
- Secure, role-based access control
- Responsive, user-friendly interface

The feature provides valuable insights for business decision-making while maintaining user privacy and data security.
