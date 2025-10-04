const mongoose = require('mongoose');

const VALID_MOVEMENT_TYPES = [
  'purchase',      // Stock received from supplier
  'sale',          // Stock sold to customer
  'adjustment',    // Manual stock adjustment
  'waste',         // Stock discarded due to spoilage
  'transfer',      // Stock moved between locations
  'return',        // Stock returned from customer
  'production',    // Stock used in production
  'inventory'      // Stock counted during inventory
];

const VALID_REASONS = [
  'received_order',     // Received from supplier
  'customer_sale',      // Sold to customer
  'manual_adjustment',  // Manual correction
  'spoiled',           // Item expired/spoiled
  'damaged',           // Item damaged
  'theft',             // Item stolen
  'transfer_in',       // Transferred in
  'transfer_out',      // Transferred out
  'customer_return',   // Customer returned item
  'production_use',    // Used in production
  'inventory_count',   // Counted during inventory
  'other'              // Other reason
];

const StockMovementSchema = new mongoose.Schema(
  {
    // Item Reference
    inventoryItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
      index: true
    },
    
    // Movement Details
    movementType: {
      type: String,
      required: true,
      enum: VALID_MOVEMENT_TYPES,
      index: true
    },
    reason: {
      type: String,
      required: true,
      enum: VALID_REASONS
    },
    quantity: {
      type: Number,
      required: true
    },
    
    // Stock Levels
    previousStock: {
      type: Number,
      required: true,
      min: 0
    },
    newStock: {
      type: Number,
      required: true,
      min: 0
    },
    
    // Reference Information
    referenceNumber: {
      type: String,
      default: ''
    },
    supplier: {
      type: String,
      default: ''
    },
    customer: {
      type: String,
      default: ''
    },
    
    // Location Information
    fromLocation: {
      type: String,
      default: ''
    },
    toLocation: {
      type: String,
      default: ''
    },
    
    // Additional Details
    notes: {
      type: String,
      default: ''
    },
    batchNumber: {
      type: String,
      default: ''
    },
    expirationDate: {
      type: Date,
      default: null
    },
    
    // Audit Information
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for movement direction
StockMovementSchema.virtual('isInbound').get(function() {
  return ['purchase', 'return', 'transfer', 'adjustment'].includes(this.movementType);
});

// Virtual for movement description
StockMovementSchema.virtual('description').get(function() {
  const typeMap = {
    'purchase': 'Stock Received',
    'sale': 'Stock Sold',
    'adjustment': 'Stock Adjusted',
    'waste': 'Stock Discarded',
    'transfer': 'Stock Transferred',
    'return': 'Stock Returned',
    'production': 'Stock Used in Production',
    'inventory': 'Inventory Count'
  };
  return typeMap[this.movementType] || 'Stock Movement';
});

// Index for efficient queries
StockMovementSchema.index({ inventoryItem: 1, createdAt: -1 });
StockMovementSchema.index({ movementType: 1, createdAt: -1 });
StockMovementSchema.index({ createdBy: 1, createdAt: -1 });
StockMovementSchema.index({ createdAt: -1 });

module.exports = mongoose.model('StockMovement', StockMovementSchema);
