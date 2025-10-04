const mongoose = require('mongoose');

const FailedAttemptSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    default: ''
  },
  attemptCount: {
    type: Number,
    default: 1,
    min: 1
  },
  lastAttemptAt: {
    type: Date,
    default: Date.now
  },
  lockedUntil: {
    type: Date,
    default: null
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ['login', 'signup', 'otp'],
    default: 'login'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient lookups
FailedAttemptSchema.index({ email: 1, ipAddress: 1 });
FailedAttemptSchema.index({ lockedUntil: 1 });
FailedAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 }); // Auto-delete after 24 hours

// Static method to check if user is locked
FailedAttemptSchema.statics.isUserLocked = async function(email, ipAddress) {
  const attempt = await this.findOne({
    email: email.toLowerCase(),
    ipAddress: ipAddress,
    isLocked: true,
    lockedUntil: { $gt: new Date() }
  });
  
  return attempt;
};

// Static method to record failed attempt
FailedAttemptSchema.statics.recordFailedAttempt = async function(email, ipAddress, userAgent = '', type = 'login') {
  const now = new Date();
  const lockDuration = 15 * 60 * 1000; // 15 minutes lockout
  
  // Find existing attempt record
  let attempt = await this.findOne({
    email: email.toLowerCase(),
    ipAddress: ipAddress,
    type: type
  });
  
  if (attempt) {
    // Update existing record
    attempt.attemptCount += 1;
    attempt.lastAttemptAt = now;
    attempt.userAgent = userAgent;
    
    // Lock user after 5 failed attempts
    if (attempt.attemptCount >= 5) {
      attempt.isLocked = true;
      attempt.lockedUntil = new Date(now.getTime() + lockDuration);
    }
    
    await attempt.save();
  } else {
    // Create new record
    attempt = new this({
      email: email.toLowerCase(),
      ipAddress: ipAddress,
      userAgent: userAgent,
      attemptCount: 1,
      lastAttemptAt: now,
      type: type
    });
    
    await attempt.save();
  }
  
  return attempt;
};

// Static method to clear failed attempts (on successful login)
FailedAttemptSchema.statics.clearFailedAttempts = async function(email, ipAddress, type = 'login') {
  await this.deleteMany({
    email: email.toLowerCase(),
    ipAddress: ipAddress,
    type: type
  });
};

// Static method to get remaining lock time
FailedAttemptSchema.statics.getRemainingLockTime = async function(email, ipAddress, type = 'login') {
  const attempt = await this.findOne({
    email: email.toLowerCase(),
    ipAddress: ipAddress,
    type: type,
    isLocked: true,
    lockedUntil: { $gt: new Date() }
  });
  
  if (attempt) {
    return Math.max(0, attempt.lockedUntil - new Date());
  }
  
  return 0;
};

module.exports = mongoose.model('FailedAttempt', FailedAttemptSchema);
