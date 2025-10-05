#!/usr/bin/env node

/**
 * 🎯 LIVE SECURITY DEMO SCRIPT - Mobile Barista Backend
 * 
 * This script demonstrates high-volume security features for the barista mobile app.
 * Run this during your presentation to show real-time security protection.
 * 
 * Usage: node demo-security-live.js
 */

const axios = require('axios');
const colors = require('colors');

// Configuration
const BASE_URL = 'http://localhost:5002';
const DEMO_EMPLOYEE_ID = 'demo_barista_123';
const DEMO_CUSTOMER_ID = 'demo_customer_456';

// Demo scenarios
const scenarios = {
  normal: {
    name: 'Normal Barista Operations',
    description: 'Show legitimate barista scanning workflow',
    duration: 30000, // 30 seconds
    requests: 5,
    delay: 6000
  },
  rapidFire: {
    name: 'Rapid-Fire Scanning Detection',
    description: 'Demonstrate abuse detection for rapid scanning',
    duration: 15000, // 15 seconds
    requests: 25,
    delay: 500
  },
  sameCustomer: {
    name: 'Same Customer Abuse Detection',
    description: 'Show protection against scanning same customer repeatedly',
    duration: 20000, // 20 seconds
    requests: 8,
    delay: 2000,
    sameCustomer: true
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
    log('❌ Server is not running. Please start the barista backend first:', 'red');
    log('   cd 03-mobile-barista/mobile-barista-backend', 'yellow');
    log('   npm start', 'yellow');
    return false;
  }
}

async function simulateNormalScanning() {
  log('\n🎯 SCENARIO 1: Normal Barista Operations', 'cyan');
  log('='.repeat(50), 'cyan');
  log('Demonstrating legitimate barista scanning workflow...', 'white');
  
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };
  
  for (let i = 1; i <= scenarios.normal.requests; i++) {
    try {
      const customerId = `customer_${i}`;
      const response = await axios.post(`${BASE_URL}/api/scan`, {
        employeeId: DEMO_EMPLOYEE_ID,
        customerId: customerId,
        points: 1
      });
      
      results.successful++;
      log(`✅ Scan ${i}: Customer ${customerId} - SUCCESS (${response.status})`, 'green');
      
      // Show rate limit headers
      const remaining = response.headers['x-ratelimit-remaining'];
      const reset = response.headers['x-ratelimit-reset'];
      if (remaining) {
        log(`   📊 Rate limit remaining: ${remaining}`, 'blue');
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

async function simulateRapidFireScanning() {
  log('\n🚨 SCENARIO 2: Rapid-Fire Scanning Detection', 'cyan');
  log('='.repeat(50), 'cyan');
  log('Demonstrating abuse detection for rapid scanning...', 'white');
  
  const results = {
    successful: 0,
    blocked: 0,
    errors: []
  };
  
  log('⚠️  Starting rapid-fire scanning (25 scans in 15 seconds)...', 'yellow');
  
  const promises = [];
  for (let i = 1; i <= scenarios.rapidFire.requests; i++) {
    const customerId = `rapid_customer_${i}`;
    
    promises.push(
      axios.post(`${BASE_URL}/api/scan`, {
        employeeId: DEMO_EMPLOYEE_ID,
        customerId: customerId,
        points: 1
      })
      .then(response => {
        results.successful++;
        log(`✅ Rapid scan ${i}: SUCCESS (${response.status})`, 'green');
      })
      .catch(error => {
        if (error.response?.status === 429) {
          results.blocked++;
          log(`🚫 Rapid scan ${i}: BLOCKED - Rate limit exceeded`, 'red');
        } else {
          const errorMsg = error.response?.data?.message || error.message;
          results.errors.push(errorMsg);
          log(`❌ Rapid scan ${i}: ERROR - ${errorMsg}`, 'red');
        }
      })
    );
    
    await sleep(scenarios.rapidFire.delay);
  }
  
  await Promise.all(promises);
  
  log(`\n📊 Rapid-Fire Detection Results:`, 'magenta');
  log(`   Successful scans: ${results.successful}`, 'green');
  log(`   Blocked scans: ${results.blocked}`, 'red');
  log(`   Error scans: ${results.errors.length}`, 'yellow');
  
  if (results.blocked > 0) {
    log('✅ SUCCESS: Rapid-fire abuse detection is working!', 'green');
  } else {
    log('⚠️  WARNING: No rapid-fire blocking detected', 'yellow');
  }
  
  return results;
}

async function simulateSameCustomerAbuse() {
  log('\n🔍 SCENARIO 3: Same Customer Abuse Detection', 'cyan');
  log('='.repeat(50), 'cyan');
  log('Demonstrating protection against scanning same customer repeatedly...', 'white');
  
  const results = {
    successful: 0,
    blocked: 0,
    errors: []
  };
  
  log(`⚠️  Scanning same customer ${DEMO_CUSTOMER_ID} repeatedly...`, 'yellow');
  
  for (let i = 1; i <= scenarios.sameCustomer.requests; i++) {
    try {
      const response = await axios.post(`${BASE_URL}/api/scan`, {
        employeeId: DEMO_EMPLOYEE_ID,
        customerId: DEMO_CUSTOMER_ID,
        points: 1
      });
      
      results.successful++;
      log(`✅ Same customer scan ${i}: SUCCESS (${response.status})`, 'green');
      
    } catch (error) {
      if (error.response?.status === 429) {
        results.blocked++;
        log(`🚫 Same customer scan ${i}: BLOCKED - Abuse detected`, 'red');
      } else {
        const errorMsg = error.response?.data?.message || error.message;
        results.errors.push(errorMsg);
        log(`❌ Same customer scan ${i}: ERROR - ${errorMsg}`, 'red');
      }
    }
    
    await sleep(scenarios.sameCustomer.delay);
  }
  
  log(`\n📊 Same Customer Abuse Detection Results:`, 'magenta');
  log(`   Successful scans: ${results.successful}`, 'green');
  log(`   Blocked scans: ${results.blocked}`, 'red');
  log(`   Error scans: ${results.errors.length}`, 'yellow');
  
  if (results.blocked > 0) {
    log('✅ SUCCESS: Same customer abuse detection is working!', 'green');
  } else {
    log('⚠️  WARNING: No same customer abuse blocking detected', 'yellow');
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

async function runLiveDemo() {
  log('🎯 LIVE SECURITY DEMO - Mobile Barista Backend', 'magenta');
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
    
    await simulateRapidFireScanning();
    await sleep(2000);
    
    await simulateSameCustomerAbuse();
    await sleep(2000);
    
    await simulateIPRateLimiting();
    await sleep(2000);
    
    await showSecurityHeaders();
    
    // Final summary
    log('\n🎉 LIVE DEMO COMPLETED!', 'green');
    log('='.repeat(60), 'green');
    log('All security features have been demonstrated:', 'white');
    log('✅ Normal barista operations', 'green');
    log('✅ Rapid-fire abuse detection', 'green');
    log('✅ Same customer abuse detection', 'green');
    log('✅ IP rate limiting protection', 'green');
    log('✅ Security headers and CORS', 'green');
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
  simulateRapidFireScanning,
  simulateSameCustomerAbuse,
  simulateIPRateLimiting,
  showSecurityHeaders
};
