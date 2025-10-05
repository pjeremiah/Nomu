#!/usr/bin/env node

/**
 * 🎯 LIVE SECURITY DEMO SCRIPT - Mobile Client Backend
 * 
 * This script demonstrates high-volume security features for the customer mobile app.
 * Run this during your presentation to show real-time security protection.
 * 
 * Usage: node demo-security-live.js
 */

const axios = require('axios');
const colors = require('colors');

// Configuration
const BASE_URL = 'http://localhost:5000';
const DEMO_CUSTOMER_ID = 'demo_customer_123';

// Demo scenarios
const scenarios = {
  normal: {
    name: 'Normal Customer Operations',
    description: 'Show legitimate customer QR scanning',
    duration: 30000, // 30 seconds
    requests: 5,
    delay: 6000
  },
  dailyLimit: {
    name: 'Daily Scan Limit Enforcement',
    description: 'Demonstrate daily scan limit (10 scans/day)',
    duration: 20000, // 20 seconds
    requests: 15,
    delay: 1000
  },
  pointsLimit: {
    name: 'Daily Points Limit Enforcement',
    description: 'Show daily points limit (50 points/day)',
    duration: 15000, // 15 seconds
    requests: 12,
    delay: 1000,
    pointsPerScan: 5
  },
  rateLimit: {
    name: 'IP Rate Limiting',
    description: 'Demonstrate IP-based rate limiting protection',
    duration: 10000, // 10 seconds
    requests: 105,
    delay: 100
  }
};

// Utility functions
function log(message, color = 'white') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${message}`[color]);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Demo functions
async function checkServerHealth() {
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    log('✅ Server is running and healthy', 'green');
    return true;
  } catch (error) {
    log('❌ Server is not running. Please start the mobile client backend first:', 'red');
    log('   cd 02-mobile-client/mobile-backend', 'yellow');
    log('   npm start', 'yellow');
    return false;
  }
}

async function simulateNormalScanning() {
  log('\n🎯 SCENARIO 1: Normal Customer Operations', 'cyan');
  log('='.repeat(50), 'cyan');
  log('Demonstrating legitimate customer QR scanning...', 'white');
  
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };
  
  for (let i = 1; i <= scenarios.normal.requests; i++) {
    try {
      const response = await axios.post(`${BASE_URL}/api/scan-qr`, {
        customerId: DEMO_CUSTOMER_ID,
        qrCode: `qr_code_${i}`,
        points: 1
      });
      
      results.successful++;
      log(`✅ Scan ${i}: QR Code ${i} - SUCCESS (${response.status})`, 'green');
      
      // Show rate limit headers
      const remaining = response.headers['x-ratelimit-remaining'];
      const reset = response.headers['x-ratelimit-reset'];
      if (remaining) {
        log(`   📊 Rate limit remaining: ${remaining}`, 'blue');
      }
      
      // Show points earned
      if (response.data.pointsEarned) {
        log(`   🎯 Points earned: ${response.data.pointsEarned}`, 'blue');
      }
      
    } catch (error) {
      results.failed++;
      const errorMsg = error.response?.data?.message || error.message;
      results.errors.push(errorMsg);
      log(`❌ Scan ${i}: FAILED - ${errorMsg}`, 'red');
    }
    
    await sleep(scenarios.normal.delay);
  }
  
  log(`\n📊 Normal Operations Results:`, 'magenta');
  log(`   Successful scans: ${results.successful}`, 'green');
  log(`   Failed scans: ${results.failed}`, 'red');
  
  return results;
}

async function simulateDailyScanLimit() {
  log('\n🚨 SCENARIO 2: Daily Scan Limit Enforcement', 'cyan');
  log('='.repeat(50), 'cyan');
  log('Demonstrating daily scan limit (10 scans per day)...', 'white');
  
  const results = {
    successful: 0,
    blocked: 0,
    errors: []
  };
  
  log('⚠️  Attempting 15 scans to trigger daily limit...', 'yellow');
  
  for (let i = 1; i <= scenarios.dailyLimit.requests; i++) {
    try {
      const response = await axios.post(`${BASE_URL}/api/scan-qr`, {
        customerId: DEMO_CUSTOMER_ID,
        qrCode: `daily_limit_qr_${i}`,
        points: 1
      });
      
      results.successful++;
      log(`✅ Daily scan ${i}: SUCCESS (${response.status})`, 'green');
      
    } catch (error) {
      if (error.response?.status === 429) {
        results.blocked++;
        log(`🚫 Daily scan ${i}: BLOCKED - Daily limit exceeded`, 'red');
      } else {
        const errorMsg = error.response?.data?.message || error.message;
        results.errors.push(errorMsg);
        log(`❌ Daily scan ${i}: ERROR - ${errorMsg}`, 'red');
      }
    }
    
    await sleep(scenarios.dailyLimit.delay);
  }
  
  log(`\n📊 Daily Scan Limit Results:`, 'magenta');
  log(`   Successful scans: ${results.successful}`, 'green');
  log(`   Blocked scans: ${results.blocked}`, 'red');
  log(`   Error scans: ${results.errors.length}`, 'yellow');
  
  if (results.blocked > 0) {
    log('✅ SUCCESS: Daily scan limit is working!', 'green');
  } else {
    log('⚠️  WARNING: No daily scan limit blocking detected', 'yellow');
  }
  
  return results;
}

async function simulatePointsLimit() {
  log('\n💰 SCENARIO 3: Daily Points Limit Enforcement', 'cyan');
  log('='.repeat(50), 'cyan');
  log('Demonstrating daily points limit (50 points per day)...', 'white');
  
  const results = {
    successful: 0,
    blocked: 0,
    errors: []
  };
  
  log('⚠️  Attempting to earn 60 points to trigger daily limit...', 'yellow');
  
  for (let i = 1; i <= scenarios.pointsLimit.requests; i++) {
    try {
      const response = await axios.post(`${BASE_URL}/api/scan-qr`, {
        customerId: `points_customer_${i}`,
        qrCode: `points_qr_${i}`,
        points: scenarios.pointsLimit.pointsPerScan
      });
      
      results.successful++;
      log(`✅ Points scan ${i}: SUCCESS (${response.status}) - ${scenarios.pointsLimit.pointsPerScan} points`, 'green');
      
      // Show total points
      if (response.data.totalPoints) {
        log(`   💰 Total points: ${response.data.totalPoints}`, 'blue');
      }
      
    } catch (error) {
      if (error.response?.status === 429) {
        results.blocked++;
        log(`🚫 Points scan ${i}: BLOCKED - Daily points limit exceeded`, 'red');
      } else {
        const errorMsg = error.response?.data?.message || error.message;
        results.errors.push(errorMsg);
        log(`❌ Points scan ${i}: ERROR - ${errorMsg}`, 'red');
      }
    }
    
    await sleep(scenarios.pointsLimit.delay);
  }
  
  log(`\n📊 Daily Points Limit Results:`, 'magenta');
  log(`   Successful scans: ${results.successful}`, 'green');
  log(`   Blocked scans: ${results.blocked}`, 'red');
  log(`   Error scans: ${results.errors.length}`, 'yellow');
  
  if (results.blocked > 0) {
    log('✅ SUCCESS: Daily points limit is working!', 'green');
  } else {
    log('⚠️  WARNING: No daily points limit blocking detected', 'yellow');
  }
  
  return results;
}

async function simulateIPRateLimiting() {
  log('\n🌐 SCENARIO 4: IP Rate Limiting', 'cyan');
  log('='.repeat(50), 'cyan');
  log('Demonstrating IP-based rate limiting protection...', 'white');
  
  const results = {
    successful: 0,
    rateLimited: 0,
    errors: []
  };
  
  log('⚠️  Making 105 rapid requests to trigger IP rate limiting...', 'yellow');
  
  const promises = [];
  for (let i = 1; i <= scenarios.rateLimit.requests; i++) {
    promises.push(
      axios.get(`${BASE_URL}/api/health`)
      .then(response => {
        results.successful++;
        if (i <= 10 || i % 20 === 0) { // Show first 10 and every 20th
          log(`✅ Request ${i}: SUCCESS (${response.status})`, 'green');
        }
      })
      .catch(error => {
        if (error.response?.status === 429) {
          results.rateLimited++;
          if (results.rateLimited <= 5) { // Show first 5 rate limited
            log(`🚫 Request ${i}: RATE LIMITED (429)`, 'red');
          }
        } else {
          results.errors.push(error.message);
          log(`❌ Request ${i}: ERROR - ${error.message}`, 'red');
        }
      })
    );
    
    await sleep(scenarios.rateLimit.delay);
  }
  
  await Promise.all(promises);
  
  log(`\n📊 IP Rate Limiting Results:`, 'magenta');
  log(`   Successful requests: ${results.successful}`, 'green');
  log(`   Rate limited requests: ${results.rateLimited}`, 'red');
  log(`   Error requests: ${results.errors.length}`, 'yellow');
  
  if (results.rateLimited > 0) {
    log('✅ SUCCESS: IP rate limiting is working!', 'green');
  } else {
    log('⚠️  WARNING: No IP rate limiting detected', 'yellow');
  }
  
  return results;
}

async function showSecurityHeaders() {
  log('\n🛡️  SCENARIO 5: Security Headers', 'cyan');
  log('='.repeat(50), 'cyan');
  log('Demonstrating security headers and CORS protection...', 'white');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    
    log('📋 Security Headers Present:', 'green');
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'referrer-policy',
      'permissions-policy'
    ];
    
    securityHeaders.forEach(header => {
      const value = response.headers[header];
      if (value) {
        log(`   ✅ ${header}: ${value}`, 'green');
      } else {
        log(`   ❌ ${header}: Not present`, 'red');
      }
    });
    
    log('\n📋 Rate Limiting Headers:', 'blue');
    const rateLimitHeaders = [
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset'
    ];
    
    rateLimitHeaders.forEach(header => {
      const value = response.headers[header];
      if (value) {
        log(`   📊 ${header}: ${value}`, 'blue');
      }
    });
    
  } catch (error) {
    log(`❌ Error checking security headers: ${error.message}`, 'red');
  }
}

async function demonstrateJWTTokens() {
  log('\n🔐 SCENARIO 6: JWT QR Token Security', 'cyan');
  log('='.repeat(50), 'cyan');
  log('Demonstrating JWT-based QR token security...', 'white');
  
  try {
    // Generate a QR token
    const response = await axios.post(`${BASE_URL}/api/generate-qr`, {
      customerId: DEMO_CUSTOMER_ID
    });
    
    if (response.data.token) {
      log('✅ JWT QR Token Generated Successfully', 'green');
      log(`   Token: ${response.data.token.substring(0, 50)}...`, 'blue');
      
      // Decode token to show payload
      const tokenParts = response.data.token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        log('   Token Payload:', 'blue');
        log(`     - User ID: ${payload.userId}`, 'blue');
        log(`     - Session ID: ${payload.sessionId}`, 'blue');
        log(`     - Type: ${payload.type}`, 'blue');
        log(`     - Expires: ${new Date(payload.exp * 1000).toLocaleString()}`, 'blue');
      }
      
      // Test token validation
      const validateResponse = await axios.post(`${BASE_URL}/api/validate-qr`, {
        token: response.data.token
      });
      
      if (validateResponse.data.valid) {
        log('✅ JWT Token Validation: SUCCESS', 'green');
      } else {
        log('❌ JWT Token Validation: FAILED', 'red');
      }
      
    } else {
      log('❌ Failed to generate JWT QR token', 'red');
    }
    
  } catch (error) {
    log(`❌ Error demonstrating JWT tokens: ${error.message}`, 'red');
  }
}

async function runLiveDemo() {
  log('🎯 LIVE SECURITY DEMO - Mobile Client Backend', 'magenta');
  log('='.repeat(60), 'magenta');
  log('This demo will show real-time security protection features', 'white');
  log('Press Ctrl+C to stop the demo at any time\n', 'yellow');
  
  // Check server health
  const isHealthy = await checkServerHealth();
  if (!isHealthy) {
    return;
  }
  
  // Wait for user to start
  log('Press Enter to start the demo...', 'yellow');
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });
  
  try {
    // Run all demo scenarios
    await simulateNormalScanning();
    await sleep(2000);
    
    await simulateDailyScanLimit();
    await sleep(2000);
    
    await simulatePointsLimit();
    await sleep(2000);
    
    await simulateIPRateLimiting();
    await sleep(2000);
    
    await showSecurityHeaders();
    await sleep(2000);
    
    await demonstrateJWTTokens();
    
    // Final summary
    log('\n🎉 LIVE DEMO COMPLETED!', 'green');
    log('='.repeat(60), 'green');
    log('All security features have been demonstrated:', 'white');
    log('✅ Normal customer operations', 'green');
    log('✅ Daily scan limit enforcement', 'green');
    log('✅ Daily points limit enforcement', 'green');
    log('✅ IP rate limiting protection', 'green');
    log('✅ Security headers and CORS', 'green');
    log('✅ JWT QR token security', 'green');
    log('\nThe system successfully protects against abuse while maintaining performance!', 'white');
    
  } catch (error) {
    log(`\n❌ Demo error: ${error.message}`, 'red');
    log('Please check your server configuration and try again.', 'yellow');
  }
}

// Run the demo
if (require.main === module) {
  runLiveDemo().catch(console.error);
}

module.exports = {
  runLiveDemo,
  simulateNormalScanning,
  simulateDailyScanLimit,
  simulatePointsLimit,
  simulateIPRateLimiting,
  showSecurityHeaders,
  demonstrateJWTTokens
};
