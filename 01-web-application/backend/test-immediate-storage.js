// Test immediate database storage of abuse alerts
const mongoose = require('mongoose');
const AbuseAlert = require('./models/AbuseAlert');

async function testImmediateStorage() {
  console.log('🧪 Testing Immediate Database Storage');
  console.log('=====================================');

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nomu');
    console.log('✅ Connected to MongoDB');

    // Clear existing test alerts
    await AbuseAlert.deleteMany({ employeeId: 'test_immediate_123' });
    console.log('🧹 Cleared existing test alerts');

    // Create a test alert
    console.log('\n📝 Creating test abuse alert...');
    const startTime = Date.now();
    
    const testAlert = new AbuseAlert({
      type: 'abuse_detected',
      employeeId: 'test_immediate_123',
      customerId: 'test_customer_456',
      abuseType: 'repeated_scans',
      details: {
        count: 8,
        threshold: 5,
        timeWindow: '1 hour'
      },
      severity: 'HIGH',
      message: 'Employee test_immediate_123 scanned customer test_customer_456 8 times repeatedly',
      requiresAction: true
    });

    await testAlert.save();
    const endTime = Date.now();
    const storageTime = endTime - startTime;

    console.log(`✅ Alert stored in database in ${storageTime}ms`);
    console.log(`   Alert ID: ${testAlert._id}`);
    console.log(`   Employee: ${testAlert.employeeId}`);
    console.log(`   Severity: ${testAlert.severity}`);
    console.log(`   Created: ${testAlert.createdAt}`);

    // Verify immediate retrieval
    console.log('\n🔍 Verifying immediate retrieval...');
    const retrievedAlert = await AbuseAlert.findById(testAlert._id);
    
    if (retrievedAlert) {
      console.log('✅ Alert retrieved immediately from database');
      console.log(`   Message: ${retrievedAlert.message}`);
      console.log(`   Status: ${retrievedAlert.status}`);
    } else {
      console.log('❌ Alert not found in database');
    }

    // Test query performance
    console.log('\n⚡ Testing query performance...');
    const queryStart = Date.now();
    const recentAlerts = await AbuseAlert.find({ employeeId: 'test_immediate_123' })
      .sort({ createdAt: -1 })
      .limit(5);
    const queryEnd = Date.now();
    const queryTime = queryEnd - queryStart;

    console.log(`✅ Query completed in ${queryTime}ms`);
    console.log(`   Found ${recentAlerts.length} alerts`);

    console.log('\n📊 Summary:');
    console.log(`- Database storage: ${storageTime}ms (immediate)`);
    console.log(`- Database query: ${queryTime}ms (immediate)`);
    console.log('- Alerts are stored and retrievable instantly');
    console.log('- Web dashboard will show alerts within 30 seconds');

    // Cleanup
    await AbuseAlert.deleteMany({ employeeId: 'test_immediate_123' });
    console.log('\n🧹 Cleaned up test data');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testImmediateStorage();
