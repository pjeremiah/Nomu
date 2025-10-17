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

// Function to split grouped orders into individual items
const splitGroupedOrders = (drinkString) => {
  if (!drinkString || typeof drinkString !== 'string') {
    return [drinkString];
  }
  
  // Split by comma and clean up each item
  return drinkString
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
};

// Main migration function
const migrateGroupedOrders = async () => {
  try {
    console.log('🔄 Starting migration of grouped orders...');
    
    // Find all users with past orders
    const users = await User.find({ 
      pastOrders: { $exists: true, $not: { $size: 0 } },
      role: 'Customer'
    });
    
    console.log(`📊 Found ${users.length} users with past orders`);
    
    let totalProcessed = 0;
    let totalSplit = 0;
    
    for (const user of users) {
      let hasChanges = false;
      const newPastOrders = [];
      
      for (const order of user.pastOrders) {
        const items = splitGroupedOrders(order.drink);
        
        if (items.length > 1) {
          // This was a grouped order, split it
          console.log(`🔀 Splitting order for user ${user.email}: "${order.drink}" -> ${items.length} items`);
          totalSplit++;
          
          // Add each item as a separate order
          items.forEach(item => {
            newPastOrders.push({
              drink: item,
              quantity: order.quantity || 1,
              date: order.date || new Date()
            });
          });
          hasChanges = true;
        } else {
          // Single item, keep as is
          newPastOrders.push(order);
        }
      }
      
      if (hasChanges) {
        user.pastOrders = newPastOrders;
        await user.save();
        totalProcessed++;
        console.log(`✅ Updated user ${user.email} with ${newPastOrders.length} individual orders`);
      }
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`- Users processed: ${totalProcessed}`);
    console.log(`- Grouped orders split: ${totalSplit}`);
    console.log(`- Total users checked: ${users.length}`);
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
};

// Run migration
const runMigration = async () => {
  try {
    await connectDB();
    await migrateGroupedOrders();
    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('💥 Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { migrateGroupedOrders, splitGroupedOrders };
