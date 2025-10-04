# 🧪 SECURITY TESTING GUIDE

## 🎯 **Testing Your Security Implementation**

This guide will help you verify that all security measures are working correctly.

## 📋 **Pre-Testing Checklist**

### ✅ **Environment Setup**
- [ ] Copy `server/env-template.txt` to `server/.env`
- [ ] Fill in all required environment variables
- [ ] Generate secure JWT secrets
- [ ] Set `NODE_ENV=production` for production testing

### ✅ **Dependencies**
- [ ] All security packages installed
- [ ] No vulnerabilities in `npm audit`
- [ ] Server starts without errors

## 🔍 **Security Tests**

### 1. **Rate Limiting Tests**

#### Test Authentication Rate Limiting
```bash
# Test signin rate limiting (should block after 5 attempts)
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/signin \
    -H "Content-Type: application/json" \
    -d '{"email":"test@gmail.com","password":"wrongpassword"}'
  echo "Attempt $i"
done
```

**Expected Result**: After 5 attempts, you should get a 429 status code with rate limit error.

#### Test General Rate Limiting
```bash
# Test general API rate limiting (should block after 100 requests)
for i in {1..101}; do
  curl -X GET http://localhost:5000/
  echo "Request $i"
done
```

**Expected Result**: After 100 requests, you should get a 429 status code.

### 2. **CORS Protection Tests**

#### Test Allowed Origin
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Origin: http://localhost:3000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Result**: Should work if token is valid.

#### Test Disallowed Origin
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Origin: https://malicious-site.com" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Result**: Should get 403 CORS error.

### 3. **Input Validation Tests**

#### Test Weak Password
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "username": "testuser",
    "email": "test@gmail.com",
    "birthday": "1990-01-01",
    "gender": "male",
    "password": "weak"
  }'
```

**Expected Result**: Should get 400 error with password validation message.

#### Test Invalid Email
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "username": "testuser",
    "email": "invalid-email",
    "birthday": "1990-01-01",
    "gender": "male",
    "password": "StrongPass123!"
  }'
```

**Expected Result**: Should get 400 error with email validation message.

#### Test NoSQL Injection Attempt
```bash
curl -X POST http://localhost:5000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email": {"$ne": null}, "password": {"$ne": null}}'
```

**Expected Result**: Should get 400 error, not database error.

### 4. **Security Headers Tests**

#### Test Security Headers
```bash
curl -I http://localhost:5000/
```

**Expected Headers**:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Content-Security-Policy: default-src 'self'`

### 5. **Authentication Tests**

#### Test Without Token
```bash
curl -X GET http://localhost:5000/api/auth/me
```

**Expected Result**: Should get 401 Unauthorized.

#### Test With Invalid Token
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer invalid_token"
```

**Expected Result**: Should get 403 Invalid token.

### 6. **File Upload Security Tests**

#### Test Large File Upload
```bash
# Create a 10MB file
dd if=/dev/zero of=large_file.jpg bs=1M count=10

curl -X POST http://localhost:5000/api/auth/me/avatar \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "avatar=@large_file.jpg"
```

**Expected Result**: Should get 413 File Too Large error.

#### Test Invalid File Type
```bash
# Create a text file
echo "malicious content" > test.txt

curl -X POST http://localhost:5000/api/auth/me/avatar \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "avatar=@test.txt"
```

**Expected Result**: Should get 400 Invalid file type error.

### 7. **Authorization Tests**

#### Test Staff Access to Admin Routes
```bash
# Login as staff user and try to access admin routes
curl -X GET http://localhost:5000/api/admins \
  -H "Authorization: Bearer STAFF_TOKEN"
```

**Expected Result**: Should get 403 Access denied.

#### Test Manager Access to Super Admin Routes
```bash
# Login as manager and try to create admin
curl -X POST http://localhost:5000/api/admins \
  -H "Authorization: Bearer MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName": "New Admin", "email": "admin@gmail.com", "password": "StrongPass123!", "role": "staff"}'
```

**Expected Result**: Should get 403 Access denied.

## 🚨 **Security Monitoring Tests**

### 1. **Check Request Logging**
Monitor your server logs while running tests. You should see:
- All requests logged with timestamps
- IP addresses
- Request methods and paths
- Response status codes

### 2. **Check Rate Limit Headers**
```bash
curl -I http://localhost:5000/api/auth/signin
```

**Expected Headers**:
- `RateLimit-Limit: 5`
- `RateLimit-Remaining: 4`
- `RateLimit-Reset: [timestamp]`

## 🔧 **Automated Security Testing**

### Create a Security Test Script
```bash
#!/bin/bash
# security-test.sh

echo "🔒 Starting Security Tests..."

# Test 1: Rate Limiting
echo "Testing rate limiting..."
for i in {1..6}; do
  response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/auth/signin \
    -H "Content-Type: application/json" \
    -d '{"email":"test@gmail.com","password":"wrong"}')
  if [ $i -eq 6 ] && [ $response -eq 429 ]; then
    echo "✅ Rate limiting working correctly"
  fi
done

# Test 2: CORS
echo "Testing CORS protection..."
response=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:5000/api/auth/me \
  -H "Origin: https://malicious-site.com")
if [ $response -eq 403 ]; then
  echo "✅ CORS protection working correctly"
fi

# Test 3: Security Headers
echo "Testing security headers..."
headers=$(curl -s -I http://localhost:5000/)
if echo "$headers" | grep -q "X-Content-Type-Options: nosniff"; then
  echo "✅ Security headers present"
fi

echo "🔒 Security tests completed!"
```

## 📊 **Security Metrics to Monitor**

### 1. **Rate Limiting Metrics**
- Number of blocked requests per hour
- Top IP addresses hitting rate limits
- Most frequently rate-limited endpoints

### 2. **Authentication Metrics**
- Failed login attempts
- Successful logins
- Token refresh rates

### 3. **File Upload Metrics**
- Upload success/failure rates
- File type distribution
- Upload size distribution

## 🚨 **Security Alerts**

Set up alerts for:
- Multiple failed authentication attempts
- Rate limit violations
- Unusual file upload patterns
- CORS violations
- Security header violations

## 📝 **Test Results Template**

```
Security Test Results - [Date]

✅ Rate Limiting: PASS/FAIL
✅ CORS Protection: PASS/FAIL
✅ Input Validation: PASS/FAIL
✅ Security Headers: PASS/FAIL
✅ Authentication: PASS/FAIL
✅ Authorization: PASS/FAIL
✅ File Upload Security: PASS/FAIL

Issues Found:
- [List any issues]

Recommendations:
- [List recommendations]

Next Review Date: [Date + 30 days]
```

## 🔄 **Regular Security Testing Schedule**

- **Daily**: Monitor logs for anomalies
- **Weekly**: Run automated security tests
- **Monthly**: Full security audit
- **Quarterly**: Penetration testing
- **Annually**: Security assessment

---

**⚠️ IMPORTANT**: Always test in a development environment first. Never run security tests against production systems without proper authorization.

**Last Updated**: [Current Date]
**Test Version**: 1.0
