const mongoose = require('mongoose');

const adminActivitySchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: false
  },
  adminName: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  entityType: {
    type: String,
    required: true,
    enum: ['promo', 'menu', 'user', 'admin', 'feedback', 'reward']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  entityName: {
    type: String,
    required: false
  },
  details: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
adminActivitySchema.index({ timestamp: -1 });
adminActivitySchema.index({ adminId: 1, timestamp: -1 });
adminActivitySchema.index({ entityType: 1, timestamp: -1 });

module.exports = mongoose.model('AdminActivity', adminActivitySchema);
