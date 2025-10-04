const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nomuwebapp', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Test reward creation directly
async function testRewardCreation() {
  console.log('🧪 Testing reward creation validation directly...\n');
  
  try {
    await connectDB();
    
    // Import the Reward model
    const Reward = require('./models/Reward');
    
    // Test cases
    const testCases = [
      {
        name: 'Valid reward data',
        data: {
          title: 'Test Free Coffee',
          description: 'Earn 5 points to claim free coffee',
          rewardType: 'Loyalty Bonus',
          pointsRequired: 5,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          usageLimit: 1,
          status: 'Active',
          createdBy: new mongoose.Types.ObjectId()
        },
        shouldPass: true
      },
      {
        name: 'Missing title',
        data: {
          description: 'Earn 5 points to claim free coffee',
          rewardType: 'Loyalty Bonus',
          pointsRequired: 5,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          usageLimit: 1,
          status: 'Active',
          createdBy: new mongoose.Types.ObjectId()
        },
        shouldPass: false
      },
      {
        name: 'Missing pointsRequired',
        data: {
          title: 'Test Free Coffee',
          description: 'Earn 5 points to claim free coffee',
          rewardType: 'Loyalty Bonus',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          usageLimit: 1,
          status: 'Active',
          createdBy: new mongoose.Types.ObjectId()
        },
        shouldPass: false
      },
      {
        name: 'Empty string title',
        data: {
          title: '',
          description: 'Earn 5 points to claim free coffee',
          rewardType: 'Loyalty Bonus',
          pointsRequired: 5,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          usageLimit: 1,
          status: 'Active',
          createdBy: new mongoose.Types.ObjectId()
        },
        shouldPass: false
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n🔍 Testing: ${testCase.name}`);
      console.log('Data:', JSON.stringify(testCase.data, null, 2));
      
      try {
        const reward = new Reward(testCase.data);
        await reward.validate();
        
        if (testCase.shouldPass) {
          console.log('✅ Validation passed (expected)');
        } else {
          console.log('❌ Validation passed but should have failed');
        }
      } catch (error) {
        if (testCase.shouldPass) {
          console.log('❌ Validation failed but should have passed');
          console.log('Error:', error.message);
        } else {
          console.log('✅ Validation failed (expected)');
          console.log('Error:', error.message);
        }
      }
    }
    
    // Test the actual creation
    console.log('\n🎯 Testing actual reward creation...');
    const validReward = new Reward({
      title: 'Test Free Coffee',
      description: 'Earn 5 points to claim free coffee',
      rewardType: 'Loyalty Bonus',
      pointsRequired: 5,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usageLimit: 1,
      status: 'Active',
      createdBy: new mongoose.Types.ObjectId()
    });
    
    const savedReward = await validReward.save();
    console.log('✅ Reward created successfully!');
    console.log('Created reward:', {
      id: savedReward._id,
      title: savedReward.title,
      rewardType: savedReward.rewardType,
      pointsRequired: savedReward.pointsRequired
    });
    
    // Clean up - delete the test reward
    await Reward.findByIdAndDelete(savedReward._id);
    console.log('🧹 Test reward cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the test
testRewardCreation();
