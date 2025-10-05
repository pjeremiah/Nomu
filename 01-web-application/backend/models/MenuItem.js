const mongoose = require('mongoose');

const VALID_CATEGORIES = ['Donuts', 'Drinks', 'Pastries', 'Pizzas'];

const MenuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    secondPrice: { 
      type: Number, 
      min: 0
    },
    category: { type: String, required: true, enum: VALID_CATEGORIES },
    imageUrl: { type: String, default: '' },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MenuItem', MenuItemSchema);


