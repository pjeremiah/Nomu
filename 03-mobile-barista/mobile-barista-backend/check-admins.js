const mongoose = require('mongoose');
require('dotenv').config();

// Admin Schema
const adminSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true },
  role: { type: String, enum: ['superadmin', 'manager', 'staff'] },
  password: String,
  status: { type: String, default: 'inactive' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: Date.now },
  firstLoginCompleted: { type: Boolean, default: true },
});

const Admin = mongoose.model('Admin', adminSchema);

async function checkAdmins() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n📋 Checking all admin accounts...');
    const admins = await Admin.find({});
    
    if (admins.length === 0) {
      console.log('❌ No admin accounts found in database');
    } else {
      console.log(`✅ Found ${admins.length} admin account(s):\n`);
      
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. Admin Account:`);
        console.log(`   📧 Email: ${admin.email}`);
        console.log(`   👤 Name: ${admin.fullName}`);
        console.log(`   🔑 Role: ${admin.role}`);
        console.log(`   📊 Status: ${admin.status}`);
        console.log(`   📅 Created: ${admin.createdAt}`);
        console.log(`   🔄 Last Login: ${admin.lastLoginAt}`);
        console.log('   ' + '─'.repeat(50));
      });
    }

    console.log('\n🔍 Checking for specific emails...');
    const testEmails = [
      'nomucafe1@gmail.com',
      'nomucafeph1@gmail.com',
      'nomucafe@gmail.com'
    ];

    for (const email of testEmails) {
      const admin = await Admin.findOne({ 
        email: { $regex: new RegExp(`^${email}$`, 'i') } 
      });
      
      if (admin) {
        console.log(`✅ Found admin with email: ${email}`);
        console.log(`   Role: ${admin.role}, Status: ${admin.status}`);
      } else {
        console.log(`❌ No admin found with email: ${email}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkAdmins();
