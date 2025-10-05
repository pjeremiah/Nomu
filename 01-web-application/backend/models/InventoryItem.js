const mongoose = require('mongoose');

const VALID_CATEGORIES = ['Donuts', 'Drinks', 'Pastries', 'Pizzas'];
const VALID_STATUS = ['active', 'inactive', 'discontinued'];

const InventoryItemSchema = new mongoose.Schema(
  {
    // Reference to the actual menu item (optional for standalone inventory items)
    menuItem: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'MenuItem', 
      required: false,
      index: true
    },
    
    // Basic Information (denormalized for performance)
    name: { 
      type: String, 
      required: true, 
      trim: true,
      index: true 
    },
    description: { 
      type: String, 
      default: '' 
    },
    category: { 
      type: String, 
      required: true, 
      enum: VALID_CATEGORIES,
      index: true 
    },
    sku: { 
      type: String, 
      unique: true, 
      sparse: true,
      trim: true 
    },
    barcode: { 
      type: String, 
      unique: true, 
      sparse: true,
      trim: true 
    },
    
    // Stock Information
    currentStock: { 
      type: Number, 
      required: true, 
      min: 0,
      default: 0 
    },
    minimumThreshold: { 
      type: Number, 
      required: true, 
      min: 0,
      default: 10 
    },
    maximumThreshold: { 
      type: Number, 
      required: true, 
      min: 0,
      default: 100 
    },
    
    
    // Supplier Information
    supplier: {
      name: { type: String, default: '' },
      contact: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' }
    },
    
    // Storage Information
    storageLocation: { 
      type: String, 
      default: 'Main Storage' 
    },
    shelfLife: { 
      type: Number, 
      default: 0 // in days, 0 means no expiration
    },
    requiresRefrigeration: { 
      type: Boolean, 
      default: false 
    },
    
    // Status and Metadata
    status: { 
      type: String, 
      enum: VALID_STATUS, 
      default: 'active' 
    },
    imageUrl: { 
      type: String, 
      default: '' 
    },
    notes: { 
      type: String, 
      default: '' 
    },
    
    // Audit Fields
    lastRestocked: { 
      type: Date, 
      default: null 
    },
    lastSold: { 
      type: Date, 
      default: null 
    },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Admin' 
    },
    updatedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Admin' 
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for stock status
InventoryItemSchema.virtual('stockStatus').get(function() {
  if (this.currentStock === 0) return 'out_of_stock';
  if (this.currentStock <= this.minimumThreshold) return 'low_stock';
  if (this.currentStock >= this.maximumThreshold) return 'overstocked';
  return 'in_stock';
});


// Method to reduce stock when item is sold
InventoryItemSchema.methods.reduceStock = async function(quantity = 1, adminId = null) {
  if (this.currentStock < quantity) {
    throw new Error(`Insufficient stock. Available: ${this.currentStock}, Requested: ${quantity}`);
  }
  
  this.currentStock -= quantity;
  this.lastSold = new Date();
  this.lastSoldBy = adminId;
  
  // Update stock status
  if (this.currentStock === 0) {
    this.status = 'out_of_stock';
  } else if (this.currentStock <= this.minimumThreshold) {
    this.status = 'low_stock';
  }
  
  await this.save();
  
  // Log the stock movement
  const StockMovement = mongoose.model('StockMovement');
  await StockMovement.create({
    item: this._id,
    itemName: this.name,
    change: -quantity,
    type: 'sale',
    oldStock: this.currentStock + quantity,
    newStock: this.currentStock,
    admin: adminId,
    notes: `Sold ${quantity} ${this.name} through loyalty system`
  });
  
  return this;
};

// Method to add stock (restock)
InventoryItemSchema.methods.addStock = async function(quantity, adminId = null, notes = '') {
  this.currentStock += quantity;
  this.lastRestocked = new Date();
  this.lastRestockedBy = adminId;
  
  // Update stock status
  if (this.currentStock > this.minimumThreshold) {
    this.status = 'active';
  }
  
  await this.save();
  
  // Log the stock movement
  const StockMovement = mongoose.model('StockMovement');
  await StockMovement.create({
    item: this._id,
    itemName: this.name,
    change: quantity,
    type: 'restock',
    oldStock: this.currentStock - quantity,
    newStock: this.currentStock,
    admin: adminId,
    notes: notes || `Restocked ${quantity} ${this.name}`
  });
  
  return this;
};


// Index for efficient queries
InventoryItemSchema.index({ category: 1, status: 1 });
InventoryItemSchema.index({ currentStock: 1 });
InventoryItemSchema.index({ stockStatus: 1 });

module.exports = mongoose.model('InventoryItem', InventoryItemSchema);
