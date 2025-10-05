#!/usr/bin/env node

/**
 * Security Testing Script for Mobile Client Backend
 * 
 * This script tests all the high-volume security features:
 * - IP-based rate limiting
 * - Customer rate limiting
 * - JWT QR token generation
 * - Security headers
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_ITERATIONS = 105; // More than the rate limit
const CUSTOMER_ID = 'test_customer_' + Date.now();
const QR_TOKEN = 'test_qr_token_' + Date.now();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  log(`\n🧪 Testing: ${testName}`, 'cyan');
  log('='.repeat(50), 'cyan');
}

function logResult(success, message) {
  const status = success ? '✅ PASS' : '❌ FAIL';
  const color = success ? 'green' : 'red';
  log(`${status}: ${message}`, color);
}

async function testServerHealth() {
  logTest('Server Health Check');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    logResult(response.status === 200, `Server is running (Status: ${response.status})`);
    return true;
  } catch (error) {
    logResult(false, `Server is not running: ${error.message}`);
    return false;
  }
}

async function testIPRateLimiting() {
  logTest('IP-Based Rate Limiting');
  
  const requests = [];
  const startTime = Date.now();
  
  // Make requests rapidly
  for (let i = 0; i < TEST_ITERATIONS; i++) {
    requests.push(
      axios.get(`${BASE_URL}/api/health`)
        .then(response => ({ status: response.status, success: true, index: i }))
        .catch(error => ({ 
          status: error.response?.status || 0, 
          success: false, 
          index: i,
          message: error.response?.data?.error || error.message
        }))
    );
  }
  
  const results = await Promise.all(requests);
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  const successful = results.filter(r => r.success);
  const rateLimited = results.filter(r => r.status === 429);
  const errors = results.filter(r => !r.success && r.status !== 429);
  
  log(`Total requests: ${results.length}`);
  log(`Successful: ${successful.length}`);
  log(`Rate limited (429): ${rateLimited.length}`);
  log(`Other errors: ${errors.length}`);
  log(`Duration: ${duration.toFixed(2)}s`);
  
  // Check if rate limiting worked
  const rateLimitWorked = rateLimited.length > 0;
  logResult(rateLimitWorked, `Rate limiting ${rateLimitWorked ? 'working' : 'not working'}`);
  
  if (rateLimited.length > 0) {
    log(`First rate limit message: ${rateLimited[0].message}`, 'yellow');
  }
  
  return rateLimitWorked;
}

async function testCustomerRateLimiting() {
  logTest('Customer Rate Limiting');
  
  const requests = [];
  
  // Test daily scan limit (10 scans)
  for (let i = 0; i < 15; i++) {
    requests.push(
      axios.post(`${BASE_URL}/api/loyalty/scan`, {
        qrToken: QR_TOKEN,
        itemName: 'Test Coffee',
        customerId: CUSTOMER_ID
      })
      .then(response => ({ status: response.status, success: true, index: i }))
      .catch(error => ({ 
        status: error.response?.status || 0, 
        success: false, 
        index: i,
        message: error.response?.data?.error || error.message
      }))
    );
  }
  
  const results = await Promise.all(requests);
  const successful = results.filter(r => r.success);
  const rateLimited = results.filter(r => r.status === 429);
  
  log(`Total scan attempts: ${results.length}`);
  log(`Successful: ${successful.length}`);
  log(`Rate limited: ${rateLimited.length}`);
  
  // Check if customer rate limiting worked
  const customerLimitWorked = rateLimited.length > 0;
  logResult(customerLimitWorked, `Customer rate limiting ${customerLimitWorked ? 'working' : 'not working'}`);
  
  if (rateLimited.length > 0) {
    log(`First rate limit message: ${rateLimited[0].message}`, 'yellow');
  }
  
  return customerLimitWorked;
}

async function testJWTQRTokens() {
  logTest('JWT QR Token Generation');
  
  // Wait a moment to avoid rate limiting from previous tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    // Register a new user
    const registerResponse = await axios.post(`${BASE_URL}/api/register`, {
      fullName: 'Test User',
      username: 'testuser' + Date.now(),
      email: 'test' + Date.now() + '@example.com',
      password: 'password123',
      birthday: '1990-01-01',
      gender: 'Other'
    });
    
    const user = registerResponse.data.user;
    const qrToken = user.qrToken;
    
    log(`QR Token: ${qrToken.substring(0, 50)}...`);
    log(`QR Token length: ${qrToken.length}`);
    
    // Verify it's a JWT
    try {
      const decoded = jwt.decode(qrToken);
      const isJWT = decoded && decoded.type === 'qr_loyalty';
      
      logResult(isJWT, `QR token is a valid JWT`);
      log(`Token type: ${decoded.type}`);
      log(`User ID: ${decoded.userId}`);
      log(`Expires at: ${new Date(decoded.exp * 1000).toISOString()}`);
      
      return isJWT;
    } catch (error) {
      logResult(false, `QR token is not a valid JWT: ${error.message}`);
      return false;
    }
  } catch (error) {
    logResult(false, `Failed to register user: ${error.message}`);
    return false;
  }
}

async function testSecurityHeaders() {
  logTest('Security Headers');
  
  // Wait a moment to avoid rate limiting from previous tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    const headers = response.headers;
    
    const securityHeaders = {
      'x-content-type-options': headers['x-content-type-options'],
      'x-frame-options': headers['x-frame-options'],
      'x-xss-protection': headers['x-xss-protection'],
      'referrer-policy': headers['referrer-policy'],
      'permissions-policy': headers['permissions-policy']
    };
    
    log('Security headers found:');
    Object.entries(securityHeaders).forEach(([key, value]) => {
      const present = value !== undefined;
      log(`  ${key}: ${present ? value : 'NOT SET'}`, present ? 'green' : 'red');
    });
    
    const headersPresent = Object.values(securityHeaders).some(value => value !== undefined);
    logResult(headersPresent, `Security headers ${headersPresent ? 'present' : 'missing'}`);
    
    return headersPresent;
  } catch (error) {
    logResult(false, `Failed to check security headers: ${error.message}`);
    return false;
  }
}

async function testCORSConfiguration() {
  logTest('CORS Configuration');
  
  // Wait a moment to avoid rate limiting from previous tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    const response = await axios.options(`${BASE_URL}/api/health`, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    const headers = response.headers;
    const corsHeaders = {
      'access-control-allow-origin': headers['access-control-allow-origin'],
      'access-control-allow-methods': headers['access-control-allow-methods'],
      'access-control-allow-headers': headers['access-control-allow-headers'],
      'access-control-allow-credentials': headers['access-control-allow-credentials']
    };
    
    log('CORS headers found:');
    Object.entries(corsHeaders).forEach(([key, value]) => {
      const present = value !== undefined;
      log(`  ${key}: ${present ? value : 'NOT SET'}`, present ? 'green' : 'red');
    });
    
    const corsConfigured = corsHeaders['access-control-allow-origin'] !== undefined;
    logResult(corsConfigured, `CORS ${corsConfigured ? 'configured' : 'not configured'}`);
    
    return corsConfigured;
  } catch (error) {
    logResult(false, `Failed to check CORS: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  log('🚀 Starting Security Tests for Mobile Client Backend', 'magenta');
  log('='.repeat(60), 'magenta');
  
  const results = {
    serverHealth: false,
    ipRateLimiting: false,
    customerRateLimiting: false,
    jwtQRTokens: false,
    securityHeaders: false,
    corsConfiguration: false
  };
  
  // Test server health first
  results.serverHealth = await testServerHealth();
  
  if (!results.serverHealth) {
    log('\n❌ Server is not running. Please start the mobile client backend first:', 'red');
    log('   cd 02-mobile-client/mobile-backend', 'yellow');
    log('   npm start', 'yellow');
    return;
  }
  
  // Run all tests
  results.ipRateLimiting = await testIPRateLimiting();
  results.customerRateLimiting = await testCustomerRateLimiting();
  results.jwtQRTokens = await testJWTQRTokens();
  results.securityHeaders = await testSecurityHeaders();
  results.corsConfiguration = await testCORSConfiguration();
  
  // Summary
  log('\n📊 Test Results Summary', 'magenta');
  log('='.repeat(60), 'magenta');
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? 'green' : 'red';
    log(`${status}: ${test.replace(/([A-Z])/g, ' $1').toLowerCase()}`, color);
  });
  
  log(`\nOverall: ${passedTests}/${totalTests} tests passed`, passedTests === totalTests ? 'green' : 'yellow');
  
  if (passedTests === totalTests) {
    log('\n🎉 All security features are working correctly!', 'green');
  } else {
    log('\n⚠️  Some tests failed. Check the logs above for details.', 'yellow');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testServerHealth,
  testIPRateLimiting,
  testCustomerRateLimiting,
  testJWTQRTokens,
  testSecurityHeaders,
  testCORSConfiguration,
  runAllTests
};
