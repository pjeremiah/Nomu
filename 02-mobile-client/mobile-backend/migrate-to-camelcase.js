require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema (flexible to see all fields)
const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

async function migrateToCamelCase() {
  try {
    console.log('🔄 Starting PascalCase to camelCase migration...');
    
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users to migrate`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        const updates = {};
        let needsUpdate = false;
        
        // Convert all PascalCase fields to camelCase
        const fieldMappings = {
          'FullName': 'fullName',
          'Username': 'username',
          'Email': 'email',
          'Role': 'role',
          'Birthday': 'birthday',
          'Gender': 'gender',
          'EmploymentStatus': 'employmentStatus',
          'ProfilePicture': 'profilePicture',
          'Password': 'password',
          'Points': 'points',
          'ReviewPoints': 'reviewPoints',
          'LastOrder': 'lastOrder',
          'QrToken': 'qrToken',
          'PastOrders': 'pastOrders',
          'RewardsHistory': 'rewardsHistory',
          'CreatedAt': 'createdAt',
          'UpdatedAt': 'updatedAt'
        };
        
        // Map all fields to camelCase
        for (const [pascalField, camelField] of Object.entries(fieldMappings)) {
          if (user[pascalField] !== undefined && user[camelField] === undefined) {
            updates[camelField] = user[pascalField];
            needsUpdate = true;
            console.log(`📝 Converting ${pascalField} to ${camelField} for user: ${user.Email || user.email || 'unknown'}`);
          }
        }
        
        if (needsUpdate) {
          // Remove old PascalCase fields
          const unsetFields = {};
          for (const pascalField of Object.keys(fieldMappings)) {
            if (user[pascalField] !== undefined) {
              unsetFields[pascalField] = 1;
            }
          }
          
          // Update the user with new camelCase fields and remove old ones
          await User.updateOne(
            { _id: user._id },
            { 
              $set: updates,
              $unset: unsetFields
            }
          );
          
          updatedCount++;
          console.log(`✅ Updated user: ${user.Email || user.email || user._id}`);
        }
        
      } catch (userError) {
        console.error(`❌ Error updating user ${user._id}:`, userError.message);
        errorCount++;
      }
    }
    
    console.log('\n🎉 Migration completed!');
    console.log(`✅ Successfully updated: ${updatedCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    
    if (errorCount > 0) {
      console.log('\n⚠️ Some users had errors during migration. Please check the logs above.');
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the migration
migrateToCamelCase();
