const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  rewardType: {
    type: String,
    required: true,
    enum: ['Loyalty Bonus'],
    default: 'Loyalty Bonus'
  },
  pointsRequired: {
    type: Number,
    required: function() {
      return this.rewardType === 'Loyalty Bonus';
    },
    min: 0,
    default: 0
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  usageLimit: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  currentUsage: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    required: true,
    enum: ['Active', 'Inactive', 'Scheduled', 'Expired'],
    default: 'Active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Index for better query performance
rewardSchema.index({ status: 1, startDate: 1, endDate: 1 });
rewardSchema.index({ rewardType: 1 });
rewardSchema.index({ createdBy: 1 });

// Virtual for checking if reward is currently valid
rewardSchema.virtual('isCurrentlyValid').get(function() {
  const now = new Date();
  return this.status === 'Active' && 
         this.startDate <= now && 
         this.endDate >= now && 
         this.currentUsage < this.usageLimit;
});

// Method to check if reward can be used
rewardSchema.methods.canBeUsed = function() {
  const now = new Date();
  return this.status === 'Active' && 
         this.startDate <= now && 
         this.endDate >= now && 
         this.currentUsage < this.usageLimit;
};

// Method to use the reward (increment usage)
rewardSchema.methods.useReward = function() {
  if (this.canBeUsed()) {
    this.currentUsage += 1;
    return this.save();
  }
  throw new Error('Reward cannot be used');
};

// Pre-save middleware to update status based on dates
rewardSchema.pre('save', function(next) {
  const now = new Date();
  
  if (this.endDate < now) {
    this.status = 'Expired';
  } else if (this.startDate > now) {
    this.status = 'Scheduled';
  } else if (this.status === 'Scheduled' && this.startDate <= now) {
    this.status = 'Active';
  }
  
  next();
});

// Static method to get active rewards
rewardSchema.statics.getActiveRewards = function() {
  const now = new Date();
  return this.find({
    status: 'Active',
    startDate: { $lte: now },
    endDate: { $gte: now }
  }).sort({ createdAt: -1 });
};

// Static method to get rewards by type
rewardSchema.statics.getRewardsByType = function(type) {
  return this.find({ rewardType: type }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Reward', rewardSchema);
