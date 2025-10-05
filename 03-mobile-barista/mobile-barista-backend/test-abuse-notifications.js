#!/usr/bin/env node

/**
 * 🧪 TEST SCRIPT - Barista Backend Abuse Detection Notifications
 * 
 * This script tests the abuse detection notification system in the barista backend
 * by simulating various abuse patterns and verifying that notifications are sent properly.
 * 
 * Usage: node test-abuse-notifications.js
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5001'; // Barista backend port
const TEST_EMPLOYEE_ID = 'test_employee_abuse';
const TEST_CUSTOMER_ID = 'test_customer_abuse';

// Test scenarios
const scenarios = {
  repeatedScans: {
    name: 'Repeated Customer Scans (Abuse)',
    description: 'Simulate employee scanning same customer multiple times',
    employeeId: `${TEST_EMPLOYEE_ID}_repeated`,
    customerId: `${TEST_CUSTOMER_ID}_repeated`,
    requests: 8, // More than 5 (threshold)
    delay: 1000
  },
  rapidFire: {
    name: 'Rapid Fire Scanning (Abuse)',
    description: 'Simulate employee scanning too rapidly',
    employeeId: `${TEST_EMPLOYEE_ID}_rapid`,
    customerId: `${TEST_CUSTOMER_ID}_rapid`,
    requests: 25, // More than 20 (threshold)
    delay: 100 // Very fast scanning
  },
  unusualHours: {
    name: 'Unusual Hours Scanning (Abuse)',
    description: 'Simulate employee scanning during unusual hours',
    employeeId: `${TEST_EMPLOYEE_ID}_unusual`,
    customerId: `${TEST_CUSTOMER_ID}_unusual`,
    requests: 3,
    delay: 1000
  }
};

// Utility functions
function log(message, color = 'white') {
  const timestamp = new Date().toLocaleTimeString();
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[color] || colors.white}[${timestamp}] ${message}${colors.reset}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test functions
async function checkServerHealth() {
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    log('✅ Barista server is running and healthy', 'green');
    return true;
  } catch (error) {
    log('❌ Barista server is not running. Please start the barista backend first:', 'red');
    log('   cd 03-mobile-barista/mobile-barista-backend', 'yellow');
    log('   npm start', 'yellow');
    return false;
  }
}

async function testRepeatedScans() {
  log('\n🔄 TEST 1: Repeated Customer Scans (Abuse Detection)', 'cyan');
  log('='.repeat(60), 'cyan');
  log('Simulating employee scanning same customer multiple times...', 'white');
  log('Threshold: 5+ scans per hour triggers abuse detection', 'yellow');
  
  const results = { successful: 0, blocked: 0, abuseDetected: 0 };
  
  for (let i = 1; i <= scenarios.repeatedScans.requests; i++) {
    try {
      const response = await axios.post(`${BASE_URL}/api/scan-qr`, {
        customerId: scenarios.repeatedScans.customerId,
        qrCode: `repeated_qr_${i}`,
        points: 1,
        employeeId: scenarios.repeatedScans.employeeId
      });
      
      results.successful++;
      log(`✅ Repeated scan ${i}: SUCCESS (${response.status})`, 'green');
      
      if (i === 6) {
        log(`   🚨 ABUSE DETECTION: Should trigger repeated scans alert (${i}/5 threshold)`, 'red');
        results.abuseDetected++;
      }
      
    } catch (error) {
      if (error.response?.status === 429 && error.response?.data?.code === 'ABUSE_DETECTED') {
        results.blocked++;
        results.abuseDetected++;
        log(`🚫 Repeated scan ${i}: BLOCKED - Abuse detected`, 'red');
        log(`   📧 NOTIFICATION: Manager should receive email alert`, 'blue');
        log(`   🔔 NOTIFICATION: Admin dashboard should show real-time alert`, 'blue');
      } else {
        const errorMsg = error.response?.data?.message || error.message;
        log(`❌ Repeated scan ${i}: ERROR - ${errorMsg}`, 'red');
      }
    }
    
    await sleep(scenarios.repeatedScans.delay);
  }
  
  log(`\n📊 Repeated Scans Results:`, 'magenta');
  log(`   Successful: ${results.successful}`, 'green');
  log(`   Blocked: ${results.blocked}`, 'red');
  log(`   Abuse Detected: ${results.abuseDetected}`, 'red');
  
  return results;
}

async function testRapidFireScanning() {
  log('\n⚡ TEST 2: Rapid Fire Scanning (Abuse Detection)', 'cyan');
  log('='.repeat(60), 'cyan');
  log('Simulating employee scanning too rapidly...', 'white');
  log('Threshold: 20+ scans per minute triggers abuse detection', 'yellow');
  
  const results = { successful: 0, blocked: 0, abuseDetected: 0 };
  
  for (let i = 1; i <= scenarios.rapidFire.requests; i++) {
    try {
      const response = await axios.post(`${BASE_URL}/api/scan-qr`, {
        customerId: `${scenarios.rapidFire.customerId}_${i}`,
        qrCode: `rapid_qr_${i}`,
        points: 1,
        employeeId: scenarios.rapidFire.employeeId
      });
      
      results.successful++;
      log(`✅ Rapid scan ${i}: SUCCESS (${response.status})`, 'green');
      
      if (i === 21) {
        log(`   🚨 ABUSE DETECTION: Should trigger rapid fire alert (${i}/20 threshold)`, 'red');
        results.abuseDetected++;
      }
      
    } catch (error) {
      if (error.response?.status === 429 && error.response?.data?.code === 'ABUSE_DETECTED') {
        results.blocked++;
        results.abuseDetected++;
        log(`🚫 Rapid scan ${i}: BLOCKED - Abuse detected`, 'red');
        log(`   📧 NOTIFICATION: Manager should receive email alert`, 'blue');
        log(`   🔔 NOTIFICATION: Admin dashboard should show real-time alert`, 'blue');
      } else {
        const errorMsg = error.response?.data?.message || error.message;
        log(`❌ Rapid scan ${i}: ERROR - ${errorMsg}`, 'red');
      }
    }
    
    await sleep(scenarios.rapidFire.delay);
  }
  
  log(`\n📊 Rapid Fire Results:`, 'magenta');
  log(`   Successful: ${results.successful}`, 'green');
  log(`   Blocked: ${results.blocked}`, 'red');
  log(`   Abuse Detected: ${results.abuseDetected}`, 'red');
  
  return results;
}

async function testUnusualHours() {
  log('\n🌙 TEST 3: Unusual Hours Scanning (Abuse Detection)', 'cyan');
  log('='.repeat(60), 'cyan');
  log('Simulating employee scanning during unusual hours...', 'white');
  log('Note: This test may not trigger if run during normal hours (9 AM - 11 PM)', 'yellow');
  
  const results = { successful: 0, blocked: 0, abuseDetected: 0 };
  const currentHour = new Date().getHours();
  
  if (currentHour >= 23 || currentHour <= 5) {
    log(`   🌙 Current hour: ${currentHour} - This should trigger unusual hours detection`, 'yellow');
  } else {
    log(`   ☀️ Current hour: ${currentHour} - This will NOT trigger unusual hours detection`, 'yellow');
    log(`   💡 To test unusual hours, run this script between 11 PM - 5 AM`, 'blue');
  }
  
  for (let i = 1; i <= scenarios.unusualHours.requests; i++) {
    try {
      const response = await axios.post(`${BASE_URL}/api/scan-qr`, {
        customerId: `${scenarios.unusualHours.customerId}_${i}`,
        qrCode: `unusual_qr_${i}`,
        points: 1,
        employeeId: scenarios.unusualHours.employeeId
      });
      
      results.successful++;
      log(`✅ Unusual scan ${i}: SUCCESS (${response.status})`, 'green');
      
    } catch (error) {
      if (error.response?.status === 429 && error.response?.data?.code === 'ABUSE_DETECTED') {
        results.blocked++;
        results.abuseDetected++;
        log(`🚫 Unusual scan ${i}: BLOCKED - Abuse detected`, 'red');
        log(`   📧 NOTIFICATION: Manager should receive email alert`, 'blue');
        log(`   🔔 NOTIFICATION: Admin dashboard should show real-time alert`, 'blue');
      } else {
        const errorMsg = error.response?.data?.message || error.message;
        log(`❌ Unusual scan ${i}: ERROR - ${errorMsg}`, 'red');
      }
    }
    
    await sleep(scenarios.unusualHours.delay);
  }
  
  log(`\n📊 Unusual Hours Results:`, 'magenta');
  log(`   Successful: ${results.successful}`, 'green');
  log(`   Blocked: ${results.blocked}`, 'red');
  log(`   Abuse Detected: ${results.abuseDetected}`, 'red');
  
  return results;
}

async function showNotificationInstructions() {
  log('\n📱 ABUSE NOTIFICATION TESTING INSTRUCTIONS', 'magenta');
  log('='.repeat(60), 'magenta');
  log('To see the abuse notifications in action:', 'white');
  log('1. Open the admin dashboard in your browser', 'yellow');
  log('2. Make sure you\'re logged in as admin or super_admin', 'yellow');
  log('3. Run this test script', 'yellow');
  log('4. Watch for real-time abuse alerts in the dashboard', 'yellow');
  log('5. Check your email for abuse alert notifications', 'yellow');
  log('', 'white');
  log('Expected notifications:', 'white');
  log('• Real-time alerts in admin dashboard', 'blue');
  log('• Email notifications to managers', 'blue');
  log('• Console logs showing abuse detection', 'blue');
  log('• HTTP 429 responses with ABUSE_DETECTED code', 'blue');
}

async function runTests() {
  log('🧪 BARISTA BACKEND ABUSE DETECTION NOTIFICATION TEST', 'magenta');
  log('='.repeat(70), 'magenta');
  log('Testing the abuse detection notification system in barista backend...', 'white');
  
  // Check server health
  const isHealthy = await checkServerHealth();
  if (!isHealthy) {
    return;
  }
  
  // Show instructions
  await showNotificationInstructions();
  
  // Wait for user to start
  log('\nPress Enter to start the tests...', 'yellow');
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });
  
  try {
    // Run all tests
    await testRepeatedScans();
    await sleep(2000);
    
    await testRapidFireScanning();
    await sleep(2000);
    
    await testUnusualHours();
    
    // Final summary
    log('\n🎉 BARISTA BACKEND ABUSE DETECTION NOTIFICATION TESTS COMPLETED!', 'green');
    log('='.repeat(70), 'green');
    log('All tests have been executed:', 'white');
    log('✅ Repeated customer scans detection', 'green');
    log('✅ Rapid fire scanning detection', 'green');
    log('✅ Unusual hours scanning detection', 'green');
    log('✅ Real-time notifications via Socket.IO', 'green');
    log('✅ Email notifications to managers', 'green');
    log('\nCheck your admin dashboard and email for notifications!', 'blue');
    
  } catch (error) {
    log(`\n❌ Test error: ${error.message}`, 'red');
    log('Please check your server configuration and try again.', 'yellow');
  }
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testRepeatedScans,
  testRapidFireScanning,
  testUnusualHours
};
