# Testing Guide for High-Volume Security Features

This guide explains how to test all the security features implemented for the mobile applications.

## 🚀 Quick Start Testing

### 1. Start the Mobile Client Backend
```bash
cd 02-mobile-client/mobile-backend
npm install
cp env-template.txt .env
# Edit .env with your MongoDB URI and email credentials
npm start
```

### 2. Start the Mobile Barista Backend
```bash
cd 03-mobile-barista/mobile-barista-backend
npm install
cp env-template.txt .env
# Edit .env with your MongoDB URI and email credentials
npm start
```

## 🧪 Test Scenarios

### Test 1: IP-Based Rate Limiting

**Objective**: Verify that IP-based rate limiting works correctly.

**Steps**:
1. Use a tool like Postman, curl, or a custom script
2. Make rapid requests to any endpoint
3. Verify that after 100 requests in 15 minutes, you get rate limited

**Test Script** (Node.js):
```javascript
const axios = require('axios');

async function testRateLimit() {
  const baseURL = 'http://localhost:5000'; // Mobile client backend
  const requests = [];
  
  console.log('Testing IP-based rate limiting...');
  
  // Make 105 requests (5 more than the limit)
  for (let i = 0; i < 105; i++) {
    requests.push(
      axios.get(`${baseURL}/api/health`)
        .then(response => ({ status: response.status, success: true }))
        .catch(error => ({ status: error.response?.status, success: false }))
    );
  }
  
  const results = await Promise.all(requests);
  const rateLimited = results.filter(r => r.status === 429);
  
  console.log(`Total requests: ${results.length}`);
  console.log(`Rate limited requests: ${rateLimited.length}`);
  console.log(`Success rate: ${((results.length - rateLimited.length) / results.length * 100).toFixed(2)}%`);
}

testRateLimit();
```

**Expected Result**: After 100 requests, you should get HTTP 429 (Too Many Requests) responses.

### Test 2: Employee Rate Limiting

**Objective**: Test that baristas can't exceed their scan limits.

**Steps**:
1. Create a test employee ID
2. Make multiple scan requests with the same employee ID
3. Verify limits are enforced

**Test Script**:
```javascript
const axios = require('axios');

async function testEmployeeLimits() {
  const baseURL = 'http://localhost:5002'; // Barista backend
  const employeeId = 'test_employee_123';
  const qrToken = 'test_qr_token';
  
  console.log('Testing employee rate limiting...');
  
  // Test hourly limit (100 scans)
  const requests = [];
  for (let i = 0; i < 105; i++) {
    requests.push(
      axios.post(`${baseURL}/api/loyalty/scan`, {
        qrToken: qrToken,
        drink: 'Test Coffee',
        employeeId: employeeId
      })
      .then(response => ({ status: response.status, success: true }))
      .catch(error => ({ status: error.response?.status, success: false, message: error.response?.data?.error }))
    );
  }
  
  const results = await Promise.all(requests);
  const rateLimited = results.filter(r => r.status === 429);
  
  console.log(`Total scan attempts: ${results.length}`);
  console.log(`Rate limited: ${rateLimited.length}`);
  console.log(`First rate limit message: ${rateLimited[0]?.message}`);
}

testEmployeeLimits();
```

**Expected Result**: After 100 scans, you should get rate limited with "Hourly scan limit exceeded" message.

### Test 3: Customer Rate Limiting

**Objective**: Test that customers can't exceed their daily limits.

**Steps**:
1. Create a test customer
2. Make multiple scan requests for the same customer
3. Verify daily limits are enforced

**Test Script**:
```javascript
const axios = require('axios');

async function testCustomerLimits() {
  const baseURL = 'http://localhost:5000'; // Mobile client backend
  const customerId = 'test_customer_123';
  
  console.log('Testing customer rate limiting...');
  
  // Test daily scan limit (10 scans)
  const requests = [];
  for (let i = 0; i < 15; i++) {
    requests.push(
      axios.post(`${baseURL}/api/loyalty/scan`, {
        qrToken: 'test_qr_token',
        itemName: 'Test Coffee',
        customerId: customerId
      })
      .then(response => ({ status: response.status, success: true }))
      .catch(error => ({ status: error.response?.status, success: false, message: error.response?.data?.error }))
    );
  }
  
  const results = await Promise.all(requests);
  const rateLimited = results.filter(r => r.status === 429);
  
  console.log(`Total scan attempts: ${results.length}`);
  console.log(`Rate limited: ${rateLimited.length}`);
  console.log(`First rate limit message: ${rateLimited[0]?.message}`);
}

testCustomerLimits();
```

**Expected Result**: After 10 scans, you should get rate limited with "Daily scan limit exceeded" message.

### Test 4: Abuse Detection

**Objective**: Test that suspicious patterns are detected and blocked.

**Steps**:
1. Simulate rapid-fire scanning
2. Simulate scanning the same customer multiple times
3. Verify abuse detection triggers

**Test Script**:
```javascript
const axios = require('axios');

async function testAbuseDetection() {
  const baseURL = 'http://localhost:5002'; // Barista backend
  const employeeId = 'test_employee_456';
  const customerId = 'test_customer_456';
  const qrToken = 'test_qr_token';
  
  console.log('Testing abuse detection...');
  
  // Test rapid-fire scanning (more than 20 scans in 1 minute)
  const rapidRequests = [];
  for (let i = 0; i < 25; i++) {
    rapidRequests.push(
      axios.post(`${baseURL}/api/loyalty/scan`, {
        qrToken: qrToken,
        drink: 'Test Coffee',
        employeeId: employeeId
      })
      .then(response => ({ status: response.status, success: true }))
      .catch(error => ({ status: error.response?.status, success: false, message: error.response?.data?.error }))
    );
  }
  
  const results = await Promise.all(rapidRequests);
  const abuseDetected = results.filter(r => r.message?.includes('Abuse detected'));
  
  console.log(`Rapid-fire test - Total requests: ${results.length}`);
  console.log(`Abuse detected: ${abuseDetected.length}`);
  console.log(`First abuse message: ${abuseDetected[0]?.message}`);
}

testAbuseDetection();
```

**Expected Result**: After rapid scanning, you should get "Suspicious activity detected. Scan blocked for security." message.

### Test 5: JWT QR Token Security

**Objective**: Test that JWT-based QR tokens work correctly.

**Steps**:
1. Register a new user
2. Verify the QR token is a JWT
3. Test token validation

**Test Script**:
```javascript
const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testJWTQRTokens() {
  const baseURL = 'http://localhost:5000'; // Mobile client backend
  
  console.log('Testing JWT QR token generation...');
  
  // Register a new user
  const registerResponse = await axios.post(`${baseURL}/api/register`, {
    fullName: 'Test User',
    username: 'testuser123',
    email: 'test@example.com',
    password: 'password123',
    birthday: '1990-01-01',
    gender: 'Other'
  });
  
  const user = registerResponse.data.user;
  const qrToken = user.qrToken;
  
  console.log('QR Token:', qrToken);
  console.log('QR Token length:', qrToken.length);
  
  // Verify it's a JWT
  try {
    const decoded = jwt.decode(qrToken);
    console.log('JWT decoded successfully:', decoded);
    console.log('Token type:', decoded.type);
    console.log('User ID:', decoded.userId);
    console.log('Expires at:', new Date(decoded.exp * 1000));
  } catch (error) {
    console.log('Not a valid JWT:', error.message);
  }
}

testJWTQRTokens();
```

**Expected Result**: QR token should be a valid JWT with type 'qr_loyalty' and 24-hour expiry.

## 🔧 Manual Testing with Postman

### 1. Import Postman Collection
Create a new collection with these requests:

**Health Check**:
- Method: GET
- URL: `http://localhost:5000/api/health`
- Headers: None

**Rate Limit Test**:
- Method: GET
- URL: `http://localhost:5000/api/health`
- Headers: None
- Run this 105 times using Postman's Collection Runner

**Loyalty Scan**:
- Method: POST
- URL: `http://localhost:5002/api/loyalty/scan`
- Headers: `Content-Type: application/json`
- Body:
```json
{
  "qrToken": "test_qr_token",
  "drink": "Test Coffee",
  "employeeId": "test_employee_123"
}
```

### 2. Test Rate Limiting
1. Open Postman Collection Runner
2. Select the "Rate Limit Test" request
3. Set iterations to 105
4. Run the collection
5. Observe that requests 101-105 return 429 status

## 📊 Monitoring and Logs

### 1. Check Console Logs
Both backends will log security events:
```
🚨 [SECURITY] Security check failed: Daily scan limit exceeded
🚨 [ABUSE DETECTION] Employee test_employee_123 scanning too rapidly (25 scans)
⚠️ [SECURITY] Failed to record scan: Error message
```

### 2. Monitor Rate Limiting
Look for these log messages:
```
Rate limit exceeded for IP: 127.0.0.1
Rate limit reset for IP: 127.0.0.1
```

### 3. Check Abuse Detection
Look for these log messages:
```
🚨 [ABUSE DETECTION] Employee test_employee_123 scanning same customer test_customer_456 repeatedly (6 times)
🚨 [ABUSE DETECTION] Employee test_employee_123 scanning too rapidly (25 scans)
```

## 🐛 Troubleshooting

### Common Issues

1. **Rate limiting not working**:
   - Check if `express-rate-limit` is installed
   - Verify environment variables are set correctly
   - Check middleware order in server.js

2. **Abuse detection not triggering**:
   - Verify `ENABLE_SUSPICIOUS_PATTERN_DETECTION=true` in .env
   - Check thresholds in environment variables
   - Look for error messages in console

3. **JWT tokens not working**:
   - Verify JWT_SECRET is set in .env
   - Check if `jsonwebtoken` package is installed
   - Verify token generation in security middleware

4. **Database connection issues**:
   - Check MongoDB connection string
   - Verify database is running
   - Check for connection errors in logs

### Debug Mode
Add this to your .env file for more detailed logging:
```env
DEBUG=security:*
NODE_ENV=development
```

## 📈 Performance Testing

### Load Testing with Artillery
Install Artillery: `npm install -g artillery`

Create `load-test.yml`:
```yaml
config:
  target: 'http://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Health check load test"
    requests:
      - get:
          url: "/api/health"
```

Run: `artillery run load-test.yml`

## ✅ Success Criteria

Your security implementation is working correctly if:

1. ✅ IP rate limiting blocks after 100 requests in 15 minutes
2. ✅ Employee rate limiting blocks after 100 scans per hour
3. ✅ Customer rate limiting blocks after 10 scans per day
4. ✅ Abuse detection triggers for suspicious patterns
5. ✅ JWT QR tokens are generated and validated correctly
6. ✅ Security headers are present in responses
7. ✅ CORS is properly configured
8. ✅ All limits are configurable via environment variables

## 🎯 Next Steps

1. Run all test scenarios
2. Monitor logs for security events
3. Adjust thresholds based on your needs
4. Set up production monitoring
5. Consider using Redis for better performance in production

---

**Note**: These tests are designed for development environments. For production testing, use appropriate test data and consider the impact on your database.
