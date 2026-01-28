const mongoose = require('mongoose');

const promoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  promoType: {
    type: String,
    required: true,
    enum: ['Percentage Discount', 'Fixed Amount Discount', 'Buy One Get One', 'Free Item', 'Loyalty Points Bonus']
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  minOrderAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  usageLimit: {
    type: Number,
    default: null, // null means unlimited
    min: 1
  },
  status: {
    type: String,
    required: true,
    enum: ['Active', 'Inactive', 'Scheduled', 'Expired'],
    default: 'Active'
  },
  imageUrl: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
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

// Index for efficient queries
promoSchema.index({ status: 1, isActive: 1, startDate: 1, endDate: 1 });
promoSchema.index({ createdAt: -1 });

// Virtual for checking if promo is currently active based on dates
promoSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.isActive && 
         this.status === 'Active' && 
         this.startDate <= now && 
         this.endDate >= now;
});

// Method to update status based on dates
promoSchema.methods.updateStatus = function() {
  const now = new Date();
  
  if (!this.isActive) {
    this.status = 'Inactive';
  } else if (this.endDate < now) {
    this.status = 'Expired';
  } else if (this.startDate > now) {
    this.status = 'Scheduled';
  } else {
    this.status = 'Active';
  }
  
  return this.save();
};

// Static method to get active promos for public display
promoSchema.statics.getActivePromos = function() {
  const now = new Date();
  return this.find({
    isActive: true,
    status: 'Active',
    startDate: { $lte: now },
    endDate: { $gte: now }
  }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Promo', promoSchema);
