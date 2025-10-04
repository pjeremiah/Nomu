const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['superadmin', 'manager', 'staff'],
    default: 'staff'
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'inactive'  // Default to inactive until admin logs in
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  firstLoginCompleted: {
    type: Boolean,
    default: false
  },
  rememberUntil: {
    type: Date,
    default: null
  }
});

// Force field order in MongoDB documents
AdminSchema.pre('save', function(next) {
  // Ensure fields are saved in the correct order
  const orderedDoc = {};
  orderedDoc._id = this._id;
  orderedDoc.fullName = this.fullName;
  orderedDoc.email = this.email;
  orderedDoc.password = this.password;
  orderedDoc.role = this.role;
  orderedDoc.status = this.status;
  orderedDoc.createdAt = this.createdAt;
  orderedDoc.updatedAt = Date.now();
  orderedDoc.lastLoginAt = this.lastLoginAt;
  orderedDoc.firstLoginCompleted = this.firstLoginCompleted;
  orderedDoc.rememberUntil = this.rememberUntil;
  orderedDoc.__v = this.__v;
  
  // Replace the document with ordered version
  Object.keys(this._doc).forEach(key => {
    delete this._doc[key];
  });
  Object.assign(this._doc, orderedDoc);
  
  next();
});

// Update the updatedAt field before updating
AdminSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

module.exports = mongoose.model('Admin', AdminSchema);



