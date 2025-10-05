const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nomu_cafe', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema (current mobile app schema)
const userSchema = new mongoose.Schema({
  fullName: String,
  username: { type: String, unique: true },
  email: { type: String, unique: true },
  birthday: String,
  gender: String,
  employmentStatus: String,
  role: { 
    type: String, 
    enum: ['Customer', 'admin', 'super_admin'],
    default: 'Customer' 
  },
  source: {
    type: String,
    enum: ['web', 'mobile'],
    default: 'web'
  },
  password: String,
  qrToken: String,
  createdAt: { type: Date, default: Date.now },
  points: { type: Number, default: 0 },
  reviewPoints: { type: Number, default: 0 },
  lastOrder: { type: String, default: '' },
  pastOrders: [
    {
      orderId: String, // Unique identifier for this order
      items: [
        {
          itemName: String,
          itemType: String, // 'drink', 'food', 'pastry', 'pizza', 'pasta', 'calzone', 'donut'
          category: String, // More specific category like 'coffee', 'milk_tea', 'pizza', 'croissant', etc.
          price: Number,
          quantity: { type: Number, default: 1 }
        }
      ],
      totalPrice: Number,
      date: { type: Date, default: Date.now }
    }
  ],
  profilePicture: String,
  rewardsHistory: [
    {
      type: String,
      description: String,
      date: { type: Date, default: Date.now }
    }
  ],
}, { strict: false }); // Allow additional fields

const User = mongoose.model('User', userSchema);

async function migrateDatabase() {
  try {
    console.log('🔄 Starting database migration...');
    
    // Get all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users to migrate`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        const updates = {};
        let needsUpdate = false;
        
        // 1. Standardize to fullName only
        if (!user.fullName && user.fullname) {
          updates.fullName = user.fullname;
          needsUpdate = true;
          console.log(`📝 Converting fullname to fullName for user: ${user.email}`);
        }
        
        // 2. Standardize to role only
        if (user.userType && !user.role) {
          updates.role = user.userType;
          needsUpdate = true;
          console.log(`📝 Converting userType to role for user: ${user.email}`);
        }
        
        // 2.1. Standardize role casing to 'Customer'
        if (user.role && user.role.toLowerCase() === 'customer') {
          updates.role = 'Customer';
          needsUpdate = true;
          console.log(`📝 Standardizing role to 'Customer' for user: ${user.email}`);
        }
        
        // 2.2. Add source field for existing users (default to 'web' for existing users)
        if (!user.source) {
          updates.source = 'web';
          needsUpdate = true;
          console.log(`📝 Adding default source field for user: ${user.email}`);
        }
        
        // 3. Standardize gender capitalization
        if (user.gender) {
          const standardizedGender = user.gender.toLowerCase();
          if (standardizedGender === 'male') {
            updates.gender = 'Male';
            needsUpdate = true;
            console.log(`📝 Standardizing gender to 'Male' for user: ${user.email}`);
          } else if (standardizedGender === 'female') {
            updates.gender = 'Female';
            needsUpdate = true;
            console.log(`📝 Standardizing gender to 'Female' for user: ${user.email}`);
          } else if (standardizedGender === 'prefer not to say') {
            updates.gender = 'Prefer not to say';
            needsUpdate = true;
            console.log(`📝 Standardizing gender to 'Prefer not to say' for user: ${user.email}`);
          }
        }
        
        // 4. Ensure employmentStatus has a default value
        if (!user.employmentStatus) {
          updates.employmentStatus = 'Prefer not to say';
          needsUpdate = true;
          console.log(`📝 Adding default employmentStatus for user: ${user.email}`);
        }
        
        // 5. Ensure all required fields exist
        if (!user.points && user.points !== 0) {
          updates.points = 0;
          needsUpdate = true;
        }
        
        if (!user.reviewPoints && user.reviewPoints !== 0) {
          updates.reviewPoints = 0;
          needsUpdate = true;
        }
        
        if (!user.lastOrder) {
          updates.lastOrder = '';
          needsUpdate = true;
        }
        
        if (!user.pastOrders) {
          updates.pastOrders = [];
          needsUpdate = true;
        }
        
        if (!user.rewardsHistory) {
          updates.rewardsHistory = [];
          needsUpdate = true;
        }
        
        if (!user.profilePicture) {
          updates.profilePicture = '';
          needsUpdate = true;
        }
        
        // 6. Add updatedAt timestamp
        updates.updatedAt = new Date();
        
        // Apply updates if needed
        if (needsUpdate) {
          await User.findByIdAndUpdate(user._id, { $set: updates });
          updatedCount++;
          console.log(`✅ Updated user: ${user.email || user.username}`);
        }
        
        // Remove duplicate fields to clean up data structure
        const fieldsToRemove = {};
        if (user.fullname) fieldsToRemove.fullname = 1;
        if (user.userType) fieldsToRemove.userType = 1;
        
        if (Object.keys(fieldsToRemove).length > 0) {
          await User.findByIdAndUpdate(user._id, { $unset: fieldsToRemove });
          console.log(`🗑️ Removed duplicate fields for user: ${user.email || user.username}`);
        }
        
      } catch (error) {
        console.error(`❌ Error updating user ${user.email || user.username}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully updated: ${updatedCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log(`📈 Total processed: ${users.length} users`);
    
    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const sampleUsers = await User.find({}).limit(3);
    console.log('Sample user data after migration:');
    sampleUsers.forEach((user, index) => {
      console.log(`\nUser ${index + 1}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  FullName: ${user.fullName}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Gender: ${user.gender}`);
      console.log(`  Employment Status: ${user.employmentStatus}`);
      console.log(`  Points: ${user.points}`);
    });
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run migration
migrateDatabase();
