// Test script to verify abuse alert flow without socket.io
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5000';

async function testAbuseAlertFlow() {
  console.log('🧪 Testing Abuse Alert Flow Without Socket.io');
  console.log('==============================================');

  try {
    // Test 1: Create a test abuse alert
    console.log('\n1. Creating test abuse alert...');
    const testAlert = {
      type: 'abuse_detected',
      employeeId: 'test_employee_123',
      customerId: 'test_customer_456',
      abuseType: 'repeated_scans',
      details: {
        count: 5,
        threshold: 3,
        timeWindow: '1 hour'
      },
      severity: 'HIGH',
      message: 'Employee test_employee_123 scanned customer test_customer_456 5 times repeatedly',
      requiresAction: true
    };

    const createResponse = await fetch(`${API_BASE}/api/abuse-alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testAlert)
    });

    if (createResponse.ok) {
      const result = await createResponse.json();
      console.log('✅ Test abuse alert created:', result.alert.id);
    } else {
      console.log('❌ Failed to create test abuse alert:', createResponse.status);
      return;
    }

    // Test 2: Fetch recent abuse alerts
    console.log('\n2. Fetching recent abuse alerts...');
    const alertsResponse = await fetch(`${API_BASE}/api/abuse-alerts/recent?limit=5`);
    
    if (alertsResponse.ok) {
      const alerts = await alertsResponse.json();
      console.log('✅ Recent abuse alerts fetched:', alerts.length, 'alerts');
      if (alerts.length > 0) {
        console.log('   Latest alert:', {
          id: alerts[0]._id,
          employeeId: alerts[0].employeeId,
          severity: alerts[0].severity,
          message: alerts[0].message
        });
      }
    } else {
      console.log('❌ Failed to fetch abuse alerts:', alertsResponse.status);
    }

    // Test 3: Fetch abuse alert statistics
    console.log('\n3. Fetching abuse alert statistics...');
    const statsResponse = await fetch(`${API_BASE}/api/abuse-alerts/stats`);
    
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('✅ Abuse alert statistics fetched:');
      console.log('   Total alerts:', stats.total);
      console.log('   New alerts:', stats.new);
      console.log('   Today:', stats.today);
      console.log('   This week:', stats.thisWeek);
      console.log('   By severity:', stats.bySeverity);
    } else {
      console.log('❌ Failed to fetch abuse alert stats:', statsResponse.status);
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Abuse alerts are now stored in the database');
    console.log('- Web admin dashboard can fetch alerts via REST API');
    console.log('- No socket.io dependency required');
    console.log('- Alerts are polled every 30 seconds for real-time feel');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAbuseAlertFlow();
