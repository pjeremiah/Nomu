const mongoose = require('mongoose');

const TempSignupSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  birthday: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Prefer not to say']
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for automatic cleanup of expired signup data
TempSignupSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 60 }); // Auto-delete after 30 minutes

// Index for efficient lookups
TempSignupSchema.index({ email: 1, ipAddress: 1 });

module.exports = mongoose.model('TempSignup', TempSignupSchema);
