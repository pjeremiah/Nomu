# 🧪 Security Testing Summary

This document provides a complete guide on how to test the high-volume security features implemented for the NOMU mobile applications.

## 🚀 Quick Start Testing

### Option 1: Automated Testing Scripts (Recommended)

**For Mobile Client Backend:**
```bash
cd 02-mobile-client/mobile-backend
node test-security.js
```

**For Mobile Barista Backend:**
```bash
cd 03-mobile-barista/mobile-barista-backend
node test-security.js
```

### Option 2: Quick Manual Testing

**Windows PowerShell:**
```powershell
.\test-security-quick.ps1
```

**Linux/Mac Bash:**
```bash
./test-security-quick.sh
```

### Option 3: Manual Testing with curl/Postman

See detailed instructions in the individual testing guides.

## 📋 Test Checklist

### ✅ Prerequisites
- [ ] MongoDB is running
- [ ] Mobile client backend is running on port 5000
- [ ] Mobile barista backend is running on port 5002
- [ ] Environment variables are configured in .env files

### ✅ IP-Based Rate Limiting
- [ ] Server responds to health checks
- [ ] After 100 requests in 15 minutes, returns HTTP 429
- [ ] Rate limit headers are present in responses

### ✅ Employee Rate Limiting (Barista App)
- [ ] Employee can make up to 100 scans per hour
- [ ] Employee can make up to 500 scans per day
- [ ] 5-second cooldown between scans is enforced
- [ ] Appropriate error messages are returned

### ✅ Customer Rate Limiting (Mobile Client)
- [ ] Customer can make up to 10 scans per day
- [ ] Customer can earn up to 50 points per day
- [ ] Appropriate error messages are returned

### ✅ Abuse Detection
- [ ] Rapid-fire scanning is detected (>20 scans/minute)
- [ ] Same customer multiple scans is detected (>5 times/hour)
- [ ] Unusual hours scanning is detected (11 PM - 5 AM)
- [ ] Suspicious activity is blocked with appropriate messages

### ✅ JWT QR Token Security
- [ ] QR tokens are generated as JWTs
- [ ] Tokens have 24-hour expiry
- [ ] Tokens contain correct payload (userId, sessionId, type)
- [ ] Token validation works correctly

### ✅ Security Headers
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] X-XSS-Protection: 1; mode=block
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] Permissions-Policy: geolocation=(), microphone=(), camera=()

### ✅ CORS Configuration
- [ ] CORS preflight requests work
- [ ] Only allowed origins are accepted
- [ ] Proper CORS headers are returned

## 🔧 Setup Instructions

### 1. Start MongoDB
```bash
# Make sure MongoDB is running
mongod
```

### 2. Start Mobile Client Backend
```bash
cd 02-mobile-client/mobile-backend
npm install
cp env-template.txt .env
# Edit .env with your MongoDB URI and email credentials
npm start
```

### 3. Start Mobile Barista Backend
```bash
cd 03-mobile-barista/mobile-barista-backend
npm install
cp env-template.txt .env
# Edit .env with your MongoDB URI and email credentials
npm start
```

### 4. Run Tests
```bash
# Test mobile client backend
cd 02-mobile-client/mobile-backend
node test-security.js

# Test mobile barista backend
cd 03-mobile-barista/mobile-barista-backend
node test-security.js
```

## 📊 Expected Results

### Successful Test Output
```
🚀 Starting Security Tests for Mobile Client Backend
============================================================

🧪 Testing: Server Health Check
==================================================
✅ PASS: Server is running (Status: 200)

🧪 Testing: IP-Based Rate Limiting
==================================================
Total requests: 105
Successful: 100
Rate limited (429): 5
Other errors: 0
Duration: 2.34s
✅ PASS: Rate limiting working

🧪 Testing: Customer Rate Limiting
==================================================
Total scan attempts: 15
Successful: 10
Rate limited: 5
✅ PASS: Customer rate limiting working

🧪 Testing: JWT QR Token Generation
==================================================
✅ PASS: QR token is a valid JWT

🧪 Testing: Security Headers
==================================================
✅ PASS: Security headers present

🧪 Testing: CORS Configuration
==================================================
✅ PASS: CORS configured

📊 Test Results Summary
============================================================
✅ PASS: server health check
✅ PASS: ip rate limiting
✅ PASS: customer rate limiting
✅ PASS: jwt qr tokens
✅ PASS: security headers
✅ PASS: cors configuration

Overall: 6/6 tests passed

🎉 All security features are working correctly!
```

## 🐛 Troubleshooting

### Common Issues and Solutions

#### 1. "Server is not running" Error
**Problem**: Test scripts can't connect to the backend servers.

**Solutions**:
- Check if MongoDB is running: `mongod --version`
- Start the backend servers: `npm start` in each backend directory
- Check if ports 5000 and 5002 are available
- Verify .env files are configured correctly

#### 2. "Rate limiting not working" Error
**Problem**: Rate limiting doesn't trigger after 100 requests.

**Solutions**:
- Check if `express-rate-limit` is installed: `npm list express-rate-limit`
- Verify environment variables in .env file
- Check middleware order in server.js
- Restart the server after making changes

#### 3. "Abuse detection not working" Error
**Problem**: Suspicious patterns are not detected.

**Solutions**:
- Verify `ENABLE_SUSPICIOUS_PATTERN_DETECTION=true` in .env
- Check abuse detection thresholds in environment variables
- Look for error messages in console logs
- Ensure security middleware is properly imported

#### 4. "JWT tokens not working" Error
**Problem**: QR tokens are not generated as JWTs.

**Solutions**:
- Verify `JWT_SECRET` is set in .env file
- Check if `jsonwebtoken` package is installed
- Verify token generation in security middleware
- Check for JWT validation errors in logs

#### 5. "Database connection issues" Error
**Problem**: Can't connect to MongoDB.

**Solutions**:
- Check MongoDB connection string in .env
- Verify MongoDB is running: `mongod --version`
- Check for connection errors in logs
- Test MongoDB connection: `mongo mongodb://localhost:27017/nomu_cafe`

### Debug Mode
Add these to your .env file for more detailed logging:
```env
DEBUG=security:*
NODE_ENV=development
```

## 📈 Performance Testing

### Load Testing with Artillery
```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery run load-test.yml
```

### Load Testing with Apache Bench
```bash
# Test rate limiting
ab -n 200 -c 10 http://localhost:5000/api/health

# Test with different concurrency
ab -n 1000 -c 50 http://localhost:5002/api/health
```

## 🎯 Success Criteria

Your security implementation is working correctly if:

1. ✅ **IP Rate Limiting**: Blocks after 100 requests in 15 minutes
2. ✅ **Employee Rate Limiting**: Blocks after 100 scans per hour
3. ✅ **Customer Rate Limiting**: Blocks after 10 scans per day
4. ✅ **Abuse Detection**: Triggers for suspicious patterns
5. ✅ **JWT QR Tokens**: Generated and validated correctly
6. ✅ **Security Headers**: Present in all responses
7. ✅ **CORS**: Properly configured
8. ✅ **Error Handling**: Appropriate error messages returned

## 📞 Support

If you encounter issues:

1. **Check the logs** for error messages
2. **Verify configuration** in .env files
3. **Test individual components** using the test scripts
4. **Review the documentation** in SECURITY_IMPLEMENTATION.md
5. **Check the troubleshooting section** above

## 🚀 Next Steps

After successful testing:

1. **Deploy to staging** environment
2. **Run comprehensive load tests**
3. **Set up monitoring** and alerting
4. **Configure production** environment variables
5. **Train staff** on security features
6. **Schedule regular security audits**

---

**Note**: These tests are designed for development environments. For production testing, use appropriate test data and consider the impact on your database.
