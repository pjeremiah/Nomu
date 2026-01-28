# NOMU Superadmin Scanner API

This is the backend API for the NOMU Cafe Superadmin Scanner app with email verification.

## Features

- **Email Verification**: Superadmin login requires OTP verification via email
- **Superadmin-Only Access**: Only users with `userType: 'superadmin'` in database can login
- **QR Code Scanning**: Superadmins can scan customer QR codes to add loyalty points
- **Customer Lookup**: Get customer information by QR token
- **JWT Authentication**: Secure token-based authentication

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
PORT=5001
SERVER_HOST=0.0.0.0
SERVER_PORT=5001

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/nomu_cafe

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_here

# Email Configuration (Gmail)
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password_here
```

### Host Configuration Options:

- **`SERVER_HOST=0.0.0.0`** - Accessible from any network interface (default)
- **`SERVER_HOST=localhost`** - Only accessible from localhost
- **`SERVER_HOST=127.0.0.1`** - Only accessible from localhost
- **`SERVER_HOST=192.168.1.100`** - Bind to specific IP address

### 3. Gmail Setup

For email functionality, you need to:

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password as `EMAIL_PASS` in your `.env` file

### 4. MongoDB Setup

Make sure MongoDB is running on your system:

```bash
# Start MongoDB (if using local installation)
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGO_URI in .env with your Atlas connection string
```

### 5. Run the Server

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- `POST /api/superadmin/send-login-otp` - Send OTP for superadmin login
- `POST /api/superadmin/verify-login-otp` - Verify OTP and complete login
- `POST /api/login` - Legacy login (redirects to OTP flow)

**Note**: Only users with `userType: 'superadmin'` in your MongoDB database can login.

### QR Scanning
- `POST /api/loyalty/scan` - Add loyalty points via QR scan
- `GET /api/user/qr/:qrToken` - Get customer info by QR token

### Utility
- `GET /api/health` - Health check
- `GET /api/info` - Server information

## Security Features

- **OTP Expiry**: Verification codes expire in 5 minutes
- **Cooldown**: 60-second cooldown between OTP requests
- **Staff Only**: Only staff accounts can access the barista scanner
- **JWT Tokens**: Secure authentication with 24-hour expiry

## Development

The server runs on `http://localhost:5001` by default. The Flutter app should be configured to connect to this endpoint.

## Troubleshooting

### Email Issues
- Verify Gmail credentials and app password
- Check that 2FA is enabled on Gmail account
- Ensure firewall allows outbound SMTP connections

### MongoDB Issues
- Verify MongoDB is running
- Check connection string format
- Ensure database permissions are correct

### CORS Issues
- The server is configured to allow all origins for development
- For production, update CORS settings in `server.js`
