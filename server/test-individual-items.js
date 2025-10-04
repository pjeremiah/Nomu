const mongoose = require('mongoose');
require('dotenv').config();

// Import the User model
const User = require('./models/User');

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Try to use the same connection string as the main server
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/nomu-cafe';
    console.log('🔗 Attempting to connect to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    console.log('💡 Make sure to set MONGO_URI environment variable or run from the same directory as your main server');
    process.exit(1);
  }
};

// Test analytics aggregation with individual items
const testAnalytics = async () => {
  try {
    console.log('🧪 Testing analytics with individual items...');
    
    // Test the same aggregation pipeline used in the analytics endpoint
    const bestSellers = await User.aggregate([
      { $match: { role: 'Customer' } },
      { $unwind: '$pastOrders' },
      { 
        $group: { 
          _id: '$pastOrders.drink',
          totalOrders: { $sum: 1 },
          totalQuantity: { $sum: '$pastOrders.quantity' },
          uniqueCustomers: { $addToSet: '$_id' }
        } 
      },
      { 
        $project: { 
          itemName: '$_id',
          totalOrders: 1,
          totalQuantity: 1,
          uniqueCustomers: { $size: '$uniqueCustomers' },
          _id: 0
        } 
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);

    console.log('\n📊 Best Sellers Results:');
    console.log('========================');
    
    if (bestSellers.length === 0) {
      console.log('No data found. This might be expected if no orders exist yet.');
    } else {
      bestSellers.forEach((item, index) => {
        console.log(`${index + 1}. ${item.itemName}`);
        console.log(`   - Orders: ${item.totalOrders}`);
        console.log(`   - Quantity: ${item.totalQuantity}`);
        console.log(`   - Unique Customers: ${item.uniqueCustomers}`);
        console.log('');
      });
    }

    // Test with a sample grouped order to see how it would be split
    console.log('\n🔬 Testing order splitting:');
    console.log('===========================');
    
    const sampleOrder = "Americano, Cheese, Dark Chocolate with Sprinkles";
    const splitItems = sampleOrder.split(',').map(item => item.trim()).filter(item => item.length > 0);
    
    console.log(`Original order: "${sampleOrder}"`);
    console.log('Split into individual items:');
    splitItems.forEach((item, index) => {
      console.log(`  ${index + 1}. "${item}"`);
    });
    
  } catch (error) {
    console.error('❌ Test error:', error);
    throw error;
  }
};

// Run test
const runTest = async () => {
  try {
    await connectDB();
    await testAnalytics();
    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  runTest();
}

module.exports = { testAnalytics };
