const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  employmentStatus: {
    type: String,
    enum: ['Employed', 'Student', 'Unemployed', 'Prefer not to say'],
    required: false
  },
  items: [{
    name: String,
    quantity: {
      type: Number,
      default: 1
    },
    price: Number
  }],
  totalAmount: {
    type: Number,
    required: false
  },
  transactionTotal: {
    type: Number,
    required: false
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  strict: false
});

// Indexes for better performance
OrderSchema.index({ userId: 1 });
OrderSchema.index({ orderDate: -1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ employmentStatus: 1 });

module.exports = mongoose.model('Order', OrderSchema);
