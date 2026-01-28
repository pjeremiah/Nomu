# NOMU Cafe Admin Scanner API

A comprehensive API server for NOMU Cafe's admin scanner system with multi-role support for superadmin, manager, and staff accounts.

## 🚀 Features

- **Multi-Role Support**: Supports `superadmin`, `manager`, and `staff` roles
- **Email OTP Authentication**: Secure login with email verification
- **Mobile App Support**: Optimized for Flutter mobile applications
- **QR Code Scanning**: Loyalty point management system
- **Real-time Updates**: Socket.IO for live notifications
- **Customer Management**: Customer lookup and order tracking

## 📋 Supported Admin Roles

| Role | Access Level | Permissions |
|------|-------------|-------------|
| `superadmin` | Full Access | All features, user management |
| `manager` | Management | QR scanning, customer management |
| `staff` | Basic | QR scanning, basic operations |

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Environment Variables

Create a `.env` file in the server directory:

```env
# Database
MONGO_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_jwt_secret_key

# Email Configuration
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password

# Server Configuration
PORT=5000
SERVER_HOST=0.0.0.0
NODE_ENV=development
```

### 3. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📡 API Endpoints

### Authentication Endpoints

#### Send OTP for Admin Login
```http
POST /api/admin/send-login-otp
Content-Type: application/json

{
  "email": "admin@example.com"
}
```

#### Verify OTP and Complete Login
```http
POST /api/admin/verify-login-otp
Content-Type: application/json

{
  "email": "admin@example.com",
  "otp": "123456"
}
```

#### Mobile Admin Login (Email + Password)
```http
POST /api/mobile/admin/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

#### Mobile Admin OTP Verification
```http
POST /api/mobile/admin/verify-otp
Content-Type: application/json

{
  "email": "admin@example.com",
  "otp": "123456"
}
```

#### Resend OTP
```http
POST /api/mobile/admin/resend-otp
Content-Type: application/json

{
  "email": "admin@example.com"
}
```

### QR Scanning Endpoints

#### Add Loyalty Point
```http
POST /api/loyalty/scan
Content-Type: application/json

{
  "qrToken": "customer_qr_token",
  "drink": "Coffee Latte"
}
```

#### Get Customer by QR Token
```http
GET /api/customer/qr/:qrToken
```

### Utility Endpoints

#### Health Check
```http
GET /api/health
```

#### Server Information
```http
GET /api/info
```

## 🔌 Socket.IO Events

### Client Events (Send to Server)

#### Join as Admin
```javascript
socket.emit('admin-join', {
  name: 'Admin Name',
  email: 'admin@example.com',
  userType: 'admin'
});
```

#### Process Order
```javascript
socket.emit('order-processed', {
  drink: 'Coffee Latte',
  points: 5,
  adminName: 'Admin Name'
});
```

### Server Events (Listen from Server)

#### Admin Status Update
```javascript
socket.on('admin-status-update', (data) => {
  console.log('Active admins:', data.activeAdmins);
  console.log('Total connected:', data.totalConnected);
});
```

#### New Order Notification
```javascript
socket.on('new-order-notification', (data) => {
  console.log('New order:', data.drink);
  console.log('Points:', data.points);
  console.log('Processed by:', data.processedBy);
});
```

#### Loyalty Point Added
```javascript
socket.on('loyalty-point-added', (data) => {
  console.log('Loyalty point added:', data);
});
```

## 📱 Flutter Integration

### Configuration

Update your Flutter app's config file:

```dart
class Config {
  static const String _baseUrl = 'http://your-server-ip:5000';
  
  static Future<String> get adminSendOTPUrl async => '$_baseUrl/api/admin/send-login-otp';
  static Future<String> get adminVerifyOTPUrl async => '$_baseUrl/api/admin/verify-login-otp';
  static Future<String> get mobileAdminLoginUrl async => '$_baseUrl/api/mobile/admin/login';
  static Future<String> get mobileAdminVerifyOTPUrl async => '$_baseUrl/api/mobile/admin/verify-otp';
  static Future<String> get mobileAdminResendOTPUrl async => '$_baseUrl/api/mobile/admin/resend-otp';
}
```

### Usage Example

```dart
// Send OTP for admin login
final otpResponse = await ApiService.sendAdminLoginOTP('admin@example.com');

// Verify OTP
final user = await ApiService.verifyAdminLoginOTP('admin@example.com', '123456');

// Add loyalty point
final result = await ApiService.addLoyaltyPoint('customer_qr_token', 'Coffee Latte');
```

## 🔐 Security Features

- **Role-based Access Control**: Different permissions for different roles
- **Email OTP Verification**: Two-factor authentication
- **JWT Token Authentication**: Secure session management
- **Rate Limiting**: Prevents spam and abuse
- **Input Validation**: Sanitizes all user inputs
- **CORS Protection**: Configurable cross-origin policies

## 🎯 Role Permissions

### Superadmin
- Full system access
- User management
- All QR scanning features
- System configuration

### Manager
- QR scanning
- Customer management
- Order processing
- Basic reporting

### Staff
- QR scanning
- Order processing
- Customer lookup
- Basic operations

## 🚨 Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `ADMIN_NOT_FOUND`: Admin account doesn't exist
- `INSUFFICIENT_PERMISSIONS`: Role doesn't have required permissions
- `OTP_EXPIRED`: OTP has expired
- `INVALID_OTP`: OTP is incorrect
- `RATE_LIMITED`: Too many requests

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Server Info
```bash
curl http://localhost:5000/api/info
```

## 🔄 Real-time Features

- **Live Admin Tracking**: See which admins are currently online
- **Order Notifications**: Real-time order processing updates
- **Loyalty Updates**: Live loyalty point additions
- **System Status**: Real-time system health monitoring

## 🛠️ Development

### Running in Development Mode
```bash
npm run dev
```

### Testing Endpoints
```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Test admin OTP
curl -X POST http://localhost:5000/api/admin/send-login-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com"}'
```

## 📝 Logs

The server provides detailed logging for:
- Authentication attempts
- OTP generation and verification
- QR scanning activities
- Socket.IO connections
- Error tracking

## 🚀 Production Deployment

1. Set `NODE_ENV=production`
2. Use a process manager like PM2
3. Set up SSL/TLS certificates
4. Configure proper firewall rules
5. Set up monitoring and logging

## 📞 Support

For issues or questions:
1. Check the logs for error details
2. Verify environment variables
3. Test endpoints with curl/Postman
4. Check MongoDB connection
5. Verify email configuration

---

**Note**: This API supports all three admin roles (superadmin, manager, staff) and provides role-based access control for secure multi-user operations.
