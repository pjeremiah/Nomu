const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nomu', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  migrateRewardCycles();
})
.catch(err => console.error('❌ MongoDB connection error:', err));

// RewardClaim model (same as in server.js)
const rewardClaimSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: String, // 'donut' or 'coffee'
  description: String,
  date: { type: Date, default: Date.now },
  cycle: { type: Number, default: 0 }, // Track which cycle this reward was claimed in
  pointsAtClaim: { type: Number, default: 0 } // Track points at the time of claim
});

const RewardClaim = mongoose.model('RewardClaim', rewardClaimSchema);

// User model (simplified)
const userSchema = new mongoose.Schema({
  points: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);

async function migrateRewardCycles() {
  try {
    console.log('🔄 Starting reward cycle migration...');
    
    // Get all reward claims that don't have cycle information
    const claimsToUpdate = await RewardClaim.find({
      $or: [
        { cycle: { $exists: false } },
        { cycle: 0 },
        { pointsAtClaim: { $exists: false } },
        { pointsAtClaim: 0 }
      ]
    });
    
    console.log(`📊 Found ${claimsToUpdate.length} reward claims to update`);
    
    let updatedCount = 0;
    
    for (const claim of claimsToUpdate) {
      try {
        // Get the user to check their current points
        const user = await User.findById(claim.userId);
        if (!user) {
          console.log(`⚠️  User not found for claim ${claim._id}, skipping`);
          continue;
        }
        
        // For donut claims, we need to estimate the cycle
        // Since donut claims don't reset points, we'll use a conservative approach
        let estimatedCycle = 1;
        let estimatedPointsAtClaim = 5; // Minimum points for donut claim
        
        if (claim.type === 'donut') {
          // For donut claims, estimate based on current points and claim date
          // This is a simplified estimation - in practice, you might want more sophisticated logic
          estimatedCycle = Math.floor(user.points / 5);
          estimatedPointsAtClaim = Math.max(5, user.points - 1); // Assume they had at least 5 points
        } else if (claim.type === 'coffee') {
          // Coffee claims reset points to 0, so they were claimed at 10+ points
          estimatedCycle = Math.floor(10 / 5); // 10 points = cycle 2
          estimatedPointsAtClaim = 10;
        }
        
        // Update the claim with estimated values
        await RewardClaim.findByIdAndUpdate(claim._id, {
          cycle: estimatedCycle,
          pointsAtClaim: estimatedPointsAtClaim
        });
        
        updatedCount++;
        console.log(`✅ Updated claim ${claim._id} (${claim.type}) - cycle: ${estimatedCycle}, points: ${estimatedPointsAtClaim}`);
        
      } catch (error) {
        console.error(`❌ Error updating claim ${claim._id}:`, error.message);
      }
    }
    
    console.log(`🎉 Migration completed! Updated ${updatedCount} reward claims`);
    
    // Verify the migration
    const remainingClaims = await RewardClaim.find({
      $or: [
        { cycle: { $exists: false } },
        { cycle: 0 },
        { pointsAtClaim: { $exists: false } },
        { pointsAtClaim: 0 }
      ]
    });
    
    console.log(`📊 Remaining claims without cycle data: ${remainingClaims.length}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}
