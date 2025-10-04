# OTP Verification Setup Guide

## Overview
This guide will help you set up OTP (One-Time Password) verification for admin login using Gmail.

## Prerequisites
1. A Gmail account
2. 2-Step Verification enabled on your Google Account
3. Access to Google Account settings

## Setup Steps

### 1. Enable 2-Step Verification
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", click on "2-Step Verification"
3. Follow the prompts to enable 2-Step Verification

### 2. Generate App Password
1. In Google Account Security, go to "2-Step Verification"
2. Scroll down to "App passwords"
3. Click "App passwords"
4. Select "Mail" as the app
5. Copy the generated 16-character password (it will look like: `abcd efgh ijkl mnop`)

### 3. Configure Environment Variables
Add these variables to your `.env` file in the server directory:

```env
# Email Configuration for OTP
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_password

# Other existing variables...
MONGODB_URI=mongodb://localhost:27017/nomuwebapp
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
NODE_ENV=development
```

### 4. Test Email Configuration
You can test if the email configuration is working by running the server and checking the console logs. The email service will verify the connection on startup.

## How It Works

### Admin Login Flow
1. Admin enters email and password
2. System verifies credentials
3. If valid admin, system sends OTP to admin's email
4. Admin enters 6-digit OTP code
5. System verifies OTP and completes login

### OTP Features
- **6-digit numeric codes**
- **10-minute expiration**
- **3 attempt limit** before invalidation
- **Automatic cleanup** of expired codes
- **Beautiful HTML email templates**
- **Rate limiting** for security

### Security Features
- Rate limiting on OTP requests
- Failed attempt tracking
- Automatic OTP expiration
- Secure email delivery
- Input validation and sanitization

## API Endpoints

### Request OTP
```
POST /api/auth/admin/request-otp
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin_password"
}
```

### Verify OTP
```
POST /api/auth/admin/verify-otp
Content-Type: application/json

{
  "email": "admin@example.com",
  "otp": "123456"
}
```

## Troubleshooting

### Email Not Sending
1. Check if 2-Step Verification is enabled
2. Verify the app password is correct
3. Check Gmail account security settings
4. Look for server console errors

### OTP Not Working
1. Check if OTP has expired (10 minutes)
2. Verify you haven't exceeded 3 attempts
3. Check server logs for validation errors
4. Ensure you're using the correct email address

### Common Issues
- **"Invalid credentials"**: Check email/password combination
- **"OTP expired"**: Request a new OTP
- **"Too many attempts"**: Wait for OTP to expire and request new one
- **"Email service error"**: Check email configuration

## Security Notes
- OTPs are automatically deleted after expiration
- Failed attempts are tracked and limited
- Rate limiting prevents abuse
- All inputs are validated and sanitized
- Email addresses are normalized to lowercase

## Support
If you encounter issues, check:
1. Server console logs
2. Email configuration
3. Network connectivity
4. Gmail account settings
