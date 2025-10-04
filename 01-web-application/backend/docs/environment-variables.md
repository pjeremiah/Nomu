# ⚙️ Environment Variables Configuration

## Overview
Complete guide to configuring environment variables for the Nomu Cafe server in different environments.

## Environment File Setup

### 1. Create Environment File
```bash
# Copy the template
cp env-template.txt .env

# Or create manually
touch .env
```

### 2. File Location
```
server/
├── .env                    # Environment variables (DO NOT COMMIT)
├── env-template.txt        # Template file (safe to commit)
└── package.json
```

## Required Variables

### Database Configuration
```env
# MongoDB Atlas Connection
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/nomu_cafe?retryWrites=true&w=majority
```

**Description**: MongoDB Atlas connection string with authentication and cluster information.

### JWT Configuration
```env
# JWT Secret (32+ characters recommended)
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters_long
```

**Description**: Secret key for signing and verifying JWT tokens. Must be at least 32 characters.

### Server Configuration
```env
# Server Port
PORT=5000

# Environment Mode
NODE_ENV=development
```

**Description**: 
- `PORT`: Port number for the server to listen on
- `NODE_ENV`: Environment mode (development, production, test)

## Email Configuration

### Gmail SMTP Settings
```env
# Gmail Account for OTP and Notifications
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_password
```

**Setup Instructions**:
1. Enable 2-Step Verification on your Google Account
2. Generate an App Password for "Mail"
3. Use the 16-character app password (not your regular password)

### Email Service Features
- OTP verification for admin login
- Customer feedback notifications
- Password reset emails
- System notifications

## Security Configuration

### Password Hashing
```env
# Bcrypt Rounds (higher = more secure, slower)
BCRYPT_ROUNDS=12
```

**Recommended Values**:
- Development: 10-12 rounds
- Production: 12-14 rounds

### Rate Limiting
```env
# General API Rate Limit (requests per 15 minutes)
RATE_LIMIT_MAX_REQUESTS=100

# Authentication Rate Limit (attempts per 15 minutes)
AUTH_RATE_LIMIT_MAX=5

# File Upload Rate Limit (uploads per hour)
UPLOAD_RATE_LIMIT_MAX=10
```

### CORS Configuration
```env
# Allowed Origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# CORS Credentials
CORS_CREDENTIALS=true
```

## File Upload Configuration

### File Size Limits
```env
# Maximum file size (in bytes)
MAX_FILE_SIZE=5242880

# Promo image limit (5MB)
PROMO_MAX_SIZE=5242880

# Menu image limit (50MB)
MENU_MAX_SIZE=52428800

# Inventory image limit (50MB)
INVENTORY_MAX_SIZE=52428800
```

### File Type Validation
```env
# Allowed file types (comma-separated)
ALLOWED_FILE_TYPES=image/jpeg,image/jpg,image/png,image/webp
```

## Super Admin Configuration

### Auto-Create Super Admin
```env
# Super Admin Account (auto-created on first run)
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=your_secure_password
SUPER_ADMIN_USERNAME=superadmin
SUPER_ADMIN_FULLNAME=Super Admin
```

**Important**: 
- Email must end with `@gmail.com`
- Password must meet security requirements
- Account is created automatically on server startup

## Advanced Security

### Trust Proxy
```env
# Trust proxy headers (for production behind reverse proxy)
TRUST_PROXY=1
```

### Security Headers
```env
# Content Security Policy
CSP_POLICY=default-src 'self'

# HSTS Max Age (seconds)
HSTS_MAX_AGE=31536000

# X-Frame-Options
X_FRAME_OPTIONS=DENY
```

## Database Security

### MongoDB Atlas Security
```env
# Database User (from MongoDB Atlas)
DB_USER=nomu_cafe_user

# Database Password (from MongoDB Atlas)
DB_PASSWORD=your_secure_db_password

# Database Name
DB_NAME=nomu_cafe
```

### Connection Options
```env
# Connection Timeout (milliseconds)
DB_CONNECT_TIMEOUT=30000

# Socket Timeout (milliseconds)
DB_SOCKET_TIMEOUT=30000

# Max Pool Size
DB_MAX_POOL_SIZE=10
```

## Monitoring & Logging

### Logging Configuration
```env
# Log Level (error, warn, info, debug)
LOG_LEVEL=info

# Log Format (combined, common, dev, short, tiny)
LOG_FORMAT=combined

# Enable Request Logging
ENABLE_REQUEST_LOGGING=true
```

### Error Tracking
```env
# Enable Error Tracking
ENABLE_ERROR_TRACKING=true

# Error Tracking Service (optional)
ERROR_TRACKING_SERVICE=sentry
ERROR_TRACKING_DSN=your_sentry_dsn
```

## Development vs Production

### Development Environment
```env
NODE_ENV=development
PORT=5000
LOG_LEVEL=debug
CORS_CREDENTIALS=true
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
TRUST_PROXY=false
```

### Production Environment
```env
NODE_ENV=production
PORT=5000
LOG_LEVEL=warn
CORS_CREDENTIALS=true
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
TRUST_PROXY=1
BCRYPT_ROUNDS=14
```

## Environment-Specific Examples

### Local Development
```env
# Database
MONGO_URI=mongodb://localhost:27017/nomu_cafe_dev

# JWT
JWT_SECRET=dev_jwt_secret_32_characters_minimum

# Server
PORT=5000
NODE_ENV=development

# Email (use test account)
EMAIL_USER=test@gmail.com
EMAIL_PASS=test_app_password

# Security (relaxed for development)
BCRYPT_ROUNDS=10
RATE_LIMIT_MAX_REQUESTS=1000
ALLOWED_ORIGINS=*
```

### Staging Environment
```env
# Database
MONGO_URI=mongodb+srv://staging_user:staging_pass@cluster.mongodb.net/nomu_cafe_staging

# JWT
JWT_SECRET=staging_jwt_secret_32_characters_minimum

# Server
PORT=5000
NODE_ENV=staging

# Email
EMAIL_USER=staging@gmail.com
EMAIL_PASS=staging_app_password

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX_REQUESTS=200
ALLOWED_ORIGINS=https://staging.yourdomain.com
```

### Production Environment
```env
# Database
MONGO_URI=mongodb+srv://prod_user:prod_pass@cluster.mongodb.net/nomu_cafe_prod

# JWT
JWT_SECRET=production_jwt_secret_32_characters_minimum_very_secure

# Server
PORT=5000
NODE_ENV=production

# Email
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASS=production_app_password

# Security (strict)
BCRYPT_ROUNDS=14
RATE_LIMIT_MAX_REQUESTS=100
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
TRUST_PROXY=1
```

## Security Best Practices

### Secret Generation
```bash
# Generate secure JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate secure session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate secure database password
openssl rand -base64 32
```

### Environment File Security
```bash
# Set proper permissions
chmod 600 .env

# Add to .gitignore
echo ".env" >> .gitignore

# Never commit .env file
git update-index --assume-unchanged .env
```

### Secret Rotation
- **JWT Secret**: Every 90 days
- **Database Password**: Every 180 days
- **Email Password**: Every 90 days
- **API Keys**: Every 90 days

## Validation

### Required Variables Check
```javascript
// server/index.js
const requiredVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'PORT',
  'NODE_ENV'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  process.exit(1);
}
```

### Environment Validation
```javascript
// Validate NODE_ENV
if (!['development', 'staging', 'production', 'test'].includes(process.env.NODE_ENV)) {
  console.error('Invalid NODE_ENV value:', process.env.NODE_ENV);
  process.exit(1);
}

// Validate JWT secret length
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters long');
  process.exit(1);
}
```

## Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check MongoDB URI format
echo $MONGO_URI

# Test connection
mongosh "$MONGO_URI"
```

#### Email Not Sending
```bash
# Check email configuration
echo $EMAIL_USER
echo $EMAIL_PASS

# Test SMTP connection
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
transporter.verify(console.log);
"
```

#### JWT Token Issues
```bash
# Check JWT secret
echo $JWT_SECRET | wc -c  # Should be 32+ characters

# Test JWT generation
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign({test: 'data'}, process.env.JWT_SECRET);
console.log('Token generated:', !!token);
"
```

### Environment Loading
```javascript
// Check if .env file is loaded
console.log('Environment loaded:', !!process.env.MONGO_URI);

// List all environment variables
console.log('Available env vars:', Object.keys(process.env).filter(key => key.startsWith('NOMU_')));
```

---

**Related Documentation**:
- [Quick Start Guide](../README.md)
- [Security Implementation](./security.md)
- [Production Deployment](./deployment.md)
