const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const UserSchema = new mongoose.Schema({
  // Field order as requested for MongoDB Atlas display
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['Customer', 'admin', 'super_admin'],
    default: 'Customer'
  },
  birthday: {
    type: String, // Store as YYYY-MM-DD string for simplicity
    required: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Prefer not to say'],
    required: true
  },
  employmentStatus: {
    type: String,
    enum: ['Student', 'Employed', 'Unemployed', 'Prefer not to say'],
    default: 'Prefer not to say'
  },
  profilePicture: {
    type: String,
    default: ''
  },
  password: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    default: 0
  },
  currentCycle: {
    type: Number,
    default: 1
  },
  reviewPoints: {
    type: Number,
    default: 0
  },
  lastOrder: {
    type: String,
    default: ''
  },
  qrToken: {
    type: String,
    unique: true,
    default: () => uuidv4()
  },
  pastOrders: [{
    drink: String,
    quantity: {
      type: Number,
      default: 1
    },
    date: { 
      type: Date, 
      default: Date.now 
    }
  }],
  rewardsHistory: [{
    reward: String,
    pointsUsed: Number,
    date: { 
      type: Date, 
      default: Date.now 
    },
    type: String,
    cycle: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to update timestamp
UserSchema.pre('save', function(next) {
  // Update timestamp
  this.updatedAt = new Date();
  
  next();
});

// Indexes for better performance
// Note: Email, Username, and QrToken indexes are already created by 'unique: true' in schema
UserSchema.index({ createdAt: -1 }); // For sorting by creation date

module.exports = mongoose.model('User', UserSchema);
