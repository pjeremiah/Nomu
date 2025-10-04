// models/Feedback.js
const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'replied'],
    default: 'pending'
  },
  reply: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  repliedAt: {
    type: Date,
    default: null
  }
});

// Force field order in MongoDB documents
FeedbackSchema.pre('save', function(next) {
  const orderedDoc = {};
  orderedDoc._id = this._id;
  orderedDoc.name = this.name;
  orderedDoc.email = this.email;
  orderedDoc.message = this.message;
  orderedDoc.status = this.status;
  orderedDoc.reply = this.reply;
  orderedDoc.createdAt = this.createdAt;
  orderedDoc.repliedAt = this.repliedAt;
  orderedDoc.__v = this.__v;
  
  // Replace the document with ordered version
  Object.keys(this._doc).forEach(key => {
    delete this._doc[key];
  });
  Object.assign(this._doc, orderedDoc);
  
  next();
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
