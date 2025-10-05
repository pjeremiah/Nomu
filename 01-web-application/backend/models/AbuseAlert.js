const mongoose = require('mongoose');

const abuseAlertSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['abuse_detected', 'abuse_escalation']
  },
  employeeId: {
    type: String,
    required: true
  },
  customerId: {
    type: String,
    required: false // Not always available for escalation alerts
  },
  abuseType: {
    type: String,
    required: false,
    enum: ['repeated_scans', 'rapid_fire', 'unusual_hours', 'unknown']
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  severity: {
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  message: {
    type: String,
    required: true
  },
  violationCount: {
    type: Number,
    required: false
  },
  timeWindow: {
    type: String,
    required: false
  },
  requiresAction: {
    type: Boolean,
    default: true
  },
  requiresImmediateAction: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['new', 'acknowledged', 'resolved', 'dismissed'],
    default: 'new'
  },
  acknowledgedBy: {
    type: String,
    required: false
  },
  acknowledgedAt: {
    type: Date,
    required: false
  },
  resolvedAt: {
    type: Date,
    required: false
  },
  source: {
    type: String,
    default: 'mobile_barista'
  }
}, {
  timestamps: true
});

// Index for efficient querying
abuseAlertSchema.index({ createdAt: -1 });
abuseAlertSchema.index({ status: 1 });
abuseAlertSchema.index({ severity: 1 });
abuseAlertSchema.index({ employeeId: 1 });

module.exports = mongoose.model('AbuseAlert', abuseAlertSchema);
