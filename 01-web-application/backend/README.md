# 🚀 Nomu Cafe Server Documentation

Welcome to the Nomu Cafe server documentation! This comprehensive guide covers all aspects of the backend system, from setup to deployment.

## 📚 Documentation Index

### 🏗️ **Setup & Configuration**
- [Quick Start Guide](#quick-start)
- [Environment Configuration](#environment-setup)
- [Database Setup](#database-setup)

### 🔧 **Core Features**
- [Authentication System](./docs/authentication.md)
- [File Storage (GridFS)](./docs/file-storage.md)
- [Inventory Management](./docs/inventory-management.md)
- [Customer Analytics](./docs/customer-analytics.md)
- [Feedback System](./docs/feedback-system.md)

### 🔒 **Security**
- [Security Implementation](./docs/security.md)
- [Security Testing](./docs/security-testing.md)
- [Production Security Checklist](./docs/production-security.md)

### 📱 **API Documentation**
- [REST API Endpoints](./docs/api-endpoints.md)
- [Mobile App Integration](./docs/mobile-integration.md)
- [WebSocket Events](./docs/websocket-events.md)

### 🚀 **Deployment**
- [Production Deployment](./docs/deployment.md)
- [Environment Variables](./docs/environment-variables.md)
- [Monitoring & Logging](./docs/monitoring.md)

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- MongoDB Atlas account
- Gmail account (for OTP/email services)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd NomuWebApp/server

# Install dependencies
npm install

# Copy environment template
cp env-template.txt .env

# Configure environment variables (see Environment Setup)
# Start the server
npm start
```

## 🔧 Environment Setup

### Required Environment Variables
```env
# Database
MONGO_URI=your_mongodb_atlas_connection_string

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters

# Server Configuration
PORT=5000
NODE_ENV=development

# Email Configuration (for OTP and notifications)
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_password

# Security Settings
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=5242880
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Optional Environment Variables
```env
# Super Admin Account (auto-created on first run)
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=your_secure_password
SUPER_ADMIN_USERNAME=superadmin
SUPER_ADMIN_FULLNAME=Super Admin

# Advanced Security
TRUST_PROXY=1
CORS_CREDENTIALS=true
```

## 🗄️ Database Setup

### MongoDB Atlas Configuration
1. Create a MongoDB Atlas cluster
2. Create a database user with read/write permissions
3. Whitelist your server's IP address
4. Copy the connection string to `MONGO_URI`

### Database Collections
The server automatically creates these collections:
- `users` - Customer accounts
- `admins` - Admin accounts
- `promos` - Promotional offers
- `menuitems` - Menu items
- `inventoryitems` - Inventory management
- `stockmovements` - Stock tracking
- `feedbacks` - Customer feedback
- `adminactivities` - Admin activity logs
- `otps` - OTP verification codes
- `failedattempts` - Security tracking

### GridFS Collections (File Storage)
- `promo_images` - Promo images
- `menu_images` - Menu item images
- `inventory_images` - Inventory item images
- `profile_images` - User profile pictures

## 🏗️ Project Structure

```
server/
├── config/                 # Configuration files
│   ├── gridfs.js          # GridFS file storage config
│   └── security.js        # Security middleware config
├── docs/                  # Documentation (organized)
├── middleware/            # Custom middleware
│   ├── authMiddleware.js  # JWT authentication
│   ├── failedAttemptMiddleware.js  # Security tracking
│   └── securityMiddleware.js  # Security headers & validation
├── models/                # MongoDB models
│   ├── Admin.js          # Admin user model
│   ├── User.js           # Customer user model
│   ├── MenuItem.js       # Menu item model
│   ├── Promo.js          # Promotional offer model
│   ├── InventoryItem.js  # Inventory management model
│   ├── Feedback.js       # Customer feedback model
│   └── ...               # Other models
├── routes/                # API route handlers
│   ├── auth.js           # Authentication routes
│   ├── menu.js           # Menu management routes
│   ├── promos.js         # Promotional offers routes
│   ├── inventory.js      # Inventory management routes
│   ├── feedback.js       # Customer feedback routes
│   └── ...               # Other route files
├── services/              # Business logic services
│   ├── emailService.js   # Email sending service
│   ├── otpService.js     # OTP generation & verification
│   └── activityService.js # Admin activity logging
├── uploads/               # Local file storage (legacy)
├── index.js              # Main server file
├── barista-server.js     # Mobile app API server
└── package.json          # Dependencies & scripts
```

## 🔌 API Overview

### Authentication Endpoints
- `POST /api/auth/signup` - Customer registration
- `POST /api/auth/signin` - Customer login
- `POST /api/auth/admin/request-otp` - Admin OTP request
- `POST /api/auth/admin/verify-otp` - Admin OTP verification
- `GET /api/auth/me` - Get current user info
- `PUT /api/auth/me` - Update user profile

### Menu Management
- `GET /api/menu` - Get all menu items (admin)
- `GET /api/menu/client` - Get active menu items (public)
- `POST /api/menu` - Create menu item (admin)
- `PUT /api/menu/:id` - Update menu item (admin)
- `DELETE /api/menu/:id` - Delete menu item (admin)

### Promotional Offers
- `GET /api/promos` - Get all promos (admin)
- `GET /api/promos/active` - Get active promos (public)
- `POST /api/promos` - Create promo (admin)
- `PUT /api/promos/:id` - Update promo (admin)
- `DELETE /api/promos/:id` - Delete promo (admin)

### Inventory Management
- `GET /api/inventory` - Get inventory items (admin)
- `GET /api/inventory/dashboard` - Get inventory stats (admin)
- `POST /api/inventory` - Create inventory item (admin)
- `PUT /api/inventory/:id` - Update inventory item (admin)
- `POST /api/inventory/:id/stock-movement` - Record stock movement (admin)

### Customer Feedback
- `POST /api/feedback` - Submit feedback (public)
- `GET /api/feedback` - Get all feedback (admin)
- `POST /api/feedback/reply/:id` - Reply to feedback (admin)

### File Serving
- `GET /api/images/promo/:id` - Serve promo images
- `GET /api/images/menu/:id` - Serve menu images
- `GET /api/images/inventory/:id` - Serve inventory images
- `GET /api/images/profile/:id` - Serve profile images

## 🔒 Security Features

### Authentication & Authorization
- JWT token-based authentication
- Role-based access control (Customer, Staff, Manager, Super Admin)
- Password hashing with bcrypt (12 rounds)
- OTP verification for admin login

### API Security
- Rate limiting on all endpoints
- CORS protection with whitelist
- Input validation and sanitization
- SQL/NoSQL injection prevention
- XSS protection

### File Upload Security
- File type validation (images only)
- File size limits (5MB for promos, 50MB for inventory)
- Secure file naming
- GridFS storage for scalability

## 📱 Mobile App Support

The server includes a dedicated mobile API (`barista-server.js`) with:
- Mobile-optimized authentication
- QR code scanning for loyalty points
- Real-time updates via Socket.IO
- Admin role management
- Customer lookup functionality

## 🚀 Deployment

### Development
```bash
npm run dev  # Start with nodemon
```

### Production
```bash
npm start    # Start production server
```

### Environment-Specific Configuration
- **Development**: Relaxed CORS, detailed logging
- **Production**: Strict security, minimal logging

## 📊 Monitoring & Logging

### Request Logging
- All requests logged with Morgan
- IP addresses and user agents tracked
- Response times and status codes

### Security Logging
- Failed authentication attempts
- Rate limit violations
- File upload activities
- Admin actions

### Error Handling
- Comprehensive error logging
- No sensitive data in error responses
- Graceful error recovery

## 🛠️ Development

### Adding New Features
1. Create model in `models/` directory
2. Add routes in `routes/` directory
3. Implement business logic in `services/` directory
4. Add middleware if needed
5. Update documentation

### Testing
- Use the [Security Testing Guide](./docs/security-testing.md)
- Test all API endpoints
- Verify security measures
- Check file upload functionality

## 📞 Support

### Common Issues
- **Database Connection**: Check MongoDB Atlas settings
- **Email Not Sending**: Verify Gmail app password
- **File Upload Issues**: Check GridFS configuration
- **Authentication Problems**: Verify JWT secret

### Getting Help
1. Check the relevant documentation section
2. Review server logs for error details
3. Test with the security testing guide
4. Verify environment variables

## 📝 License

This project is proprietary software for Nomu Cafe.

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Maintainer**: Development Team
