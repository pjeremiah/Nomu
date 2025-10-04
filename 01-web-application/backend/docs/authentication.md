# 🔐 Authentication System

## Overview
The Nomu Cafe server implements a comprehensive authentication system with support for both customer and admin accounts, featuring JWT tokens, OTP verification, and role-based access control.

## Features

### Customer Authentication
- Email/password registration and login
- Gmail-only email validation
- Strong password requirements
- JWT token-based sessions
- Remember me functionality

### Admin Authentication
- Email/password + OTP verification
- Role-based access control (Staff, Manager, Super Admin)
- Secure admin account management
- Activity logging and audit trails

## API Endpoints

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

#### Verify Admin OTP
```http
POST /api/auth/admin/verify-otp
Content-Type: application/json

{
  "email": "admin@example.com",
  "otp": "123456"
}
```

## Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Rate Limiting
- **Signup**: 5 attempts per 15 minutes
- **Signin**: 5 attempts per 15 minutes
- **Admin OTP**: 3 attempts per 15 minutes

### JWT Token Configuration
- **Algorithm**: HS256
- **Expiration**: 1 day for customers, 1 day for admins
- **Refresh**: Automatic on valid requests

## Role-Based Access Control

### Customer Role
- View menu items
- Submit feedback
- Update own profile
- Access account settings

### Staff Role
- Basic admin functions
- View customer data
- Process orders
- Limited system access

### Manager Role
- Full inventory management
- Customer analytics
- Feedback management
- Staff management
- All staff permissions

### Super Admin Role
- Complete system access
- Admin account management
- System configuration
- All manager permissions

## OTP System

### Features
- 6-digit numeric codes
- 10-minute expiration
- 3 attempt limit
- Automatic cleanup
- Beautiful HTML email templates

### Email Configuration
- Gmail SMTP service
- App password authentication
- Professional email templates
- Error handling and retry logic

## Implementation Details

### JWT Token Structure
```javascript
{
  userId: "507f1f77bcf86cd799439011",
  email: "user@example.com",
  role: "customer",
  principalType: "user"
}
```

### Password Hashing
- **Algorithm**: bcrypt
- **Rounds**: 12 (configurable)
- **Salt**: Automatic generation

### Session Management
- **Storage**: JWT tokens in localStorage/sessionStorage
- **Refresh**: Automatic on valid requests
- **Logout**: Token invalidation

## Security Middleware

### Authentication Middleware
```javascript
const authMiddleware = require('./middleware/authMiddleware');

// Protect routes
router.get('/protected', authMiddleware, (req, res) => {
  // Access req.user for user data
});
```

### Role-Based Middleware
```javascript
const requireAdmin = (req, res, next) => {
  if (!['superadmin', 'manager', 'staff'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};
```

## Error Handling

### Common Error Responses
```json
{
  "error": "ValidationError",
  "message": "Password must be at least 8 characters long",
  "field": "password"
}
```

### Rate Limit Responses
```json
{
  "error": "RateLimitError",
  "message": "Too many requests, please try again later",
  "retryAfter": 900
}
```

## Testing

### Test Authentication Flow
```bash
# Test customer registration
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","username":"testuser","email":"test@gmail.com","birthday":"1990-01-01","gender":"male","password":"StrongPass123!"}'

# Test customer login
curl -X POST http://localhost:5000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gmail.com","password":"StrongPass123!"}'
```

### Test Admin Flow
```bash
# Request admin OTP
curl -X POST http://localhost:5000/api/auth/admin/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin_password"}'

# Verify OTP
curl -X POST http://localhost:5000/api/auth/admin/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","otp":"123456"}'
```

## Troubleshooting

### Common Issues

#### "Invalid credentials"
- Check email/password combination
- Verify account exists
- Check for typos

#### "OTP expired"
- Request a new OTP
- Check email for new code
- Verify email configuration

#### "Rate limited"
- Wait for rate limit to reset
- Check rate limit headers
- Verify rate limiting configuration

#### "Access denied"
- Check user role permissions
- Verify JWT token validity
- Ensure proper authentication

### Debug Steps
1. Check server logs for detailed errors
2. Verify environment variables
3. Test with curl/Postman
4. Check database connection
5. Verify email configuration

## Best Practices

### Security
- Use strong, unique passwords
- Enable 2FA where possible
- Regularly rotate secrets
- Monitor authentication logs

### Development
- Test all authentication flows
- Verify role-based access
- Check error handling
- Validate input sanitization

### Production
- Use HTTPS only
- Set secure JWT secrets
- Enable rate limiting
- Monitor failed attempts

---

**Related Documentation**:
- [Security Implementation](./security.md)
- [API Endpoints](./api-endpoints.md)
- [Environment Variables](./environment-variables.md)
