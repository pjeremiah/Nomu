#!/usr/bin/env node

/**
 * Role Standardization Migration Script
 * 
 * This script fixes the role field inconsistency where some users have 'customer' 
 * (lowercase) and others have 'Customer' (capital C). It standardizes all to 'Customer'.
 * 
 * Usage: node run_role_migration.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nomu_cafe', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema for migration
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
  password: String,
  qrToken: String,
  createdAt: { type: Date, default: Date.now },
  points: { type: Number, default: 0 },
  reviewPoints: { type: Number, default: 0 },
  lastOrder: { type: String, default: '' },
  pastOrders: Array,
  profilePicture: String,
  rewardsHistory: Array,
}, { strict: false });

const User = mongoose.model('User', userSchema);

async function fixRoleCasing() {
  try {
    console.log('🔄 Starting role standardization migration...');
    
    // Find all users with lowercase 'customer' role
    const usersWithLowercaseRole = await User.find({ role: 'customer' });
    console.log(`📊 Found ${usersWithLowercaseRole.length} users with lowercase 'customer' role`);
    
    if (usersWithLowercaseRole.length === 0) {
      console.log('✅ No users need role standardization. All roles are already properly formatted.');
      return;
    }
    
    // Update all users with lowercase 'customer' to 'Customer'
    const updateResult = await User.updateMany(
      { role: 'customer' },
      { 
        $set: { 
          role: 'Customer',
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`✅ Successfully updated ${updateResult.modifiedCount} users`);
    
    // Verify the changes
    const remainingLowercaseUsers = await User.find({ role: 'customer' });
    const totalCustomerUsers = await User.find({ role: 'Customer' });
    
    console.log('\n📊 Verification Results:');
    console.log(`✅ Users with 'Customer' role: ${totalCustomerUsers.length}`);
    console.log(`❌ Users with 'customer' role: ${remainingLowercaseUsers.length}`);
    
    if (remainingLowercaseUsers.length === 0) {
      console.log('\n🎉 Role standardization completed successfully!');
      console.log('All customer accounts now have consistent role formatting.');
    } else {
      console.log('\n⚠️ Some users still have lowercase roles. Please check manually.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the migration
fixRoleCasing();
