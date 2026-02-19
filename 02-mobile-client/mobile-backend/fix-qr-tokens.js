require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nomu', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

// Generate QR token function (same as in securityMiddleware)
function generateQrToken(userId) {
  return jwt.sign(
    {
      userId: userId,
      sessionId: uuidv4(),
      type: 'qr_loyalty',
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

async function fixQrTokens() {
  try {
    console.log('🔍 Finding users with empty or missing qrToken...');
    
    // Find all users with empty or missing qrToken
    const usersWithoutToken = await User.find({
      $or: [
        { qrToken: '' },
        { qrToken: { $exists: false } },
        { qrToken: null }
      ]
    });
    
    console.log(`Found ${usersWithoutToken.length} users without qrToken`);
    
    if (usersWithoutToken.length === 0) {
      console.log('✅ All users already have qrToken');
      process.exit(0);
    }
    
    let fixed = 0;
    let errors = 0;
    
    for (const user of usersWithoutToken) {
      try {
        const qrToken = generateQrToken(user._id);
        user.qrToken = qrToken;
        await user.save();
        console.log(`✅ Fixed qrToken for user: ${user.email || user.username || user._id}`);
        fixed++;
      } catch (error) {
        console.error(`❌ Error fixing user ${user._id}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Fixed: ${fixed}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📋 Total processed: ${usersWithoutToken.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

fixQrTokens();

