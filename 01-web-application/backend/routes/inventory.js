const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const InventoryItem = require('../models/InventoryItem');
const authMiddleware = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');
const { sanitizeInput, validateInput } = require('../middleware/securityMiddleware');
const ActivityService = require('../services/activityService');
const { inventoryUpload } = require('../config/gridfs');

// Middleware to check if user is admin or higher
const requireAdmin = (req, res, next) => {
  if (!['superadmin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied: Admin privileges required' });
  }
  next();
};

// Middleware to check if user is manager or higher
const requireManager = (req, res, next) => {
  if (!['superadmin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied: Manager privileges required' });
  }
  next();
};

// Max upload size (in MB) - increased for inventory images
const MAX_UPLOAD_MB = 50; // 50MB limit for inventory images

// GET /api/inventory - Get all inventory items with filters
router.get('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { 
      category, 
      status, 
      stockStatus, 
      search, 
      page = 1, 
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // Handle stock status filtering
    if (stockStatus && stockStatus !== 'all') {
      switch (stockStatus) {
        case 'in_stock':
          filter.$expr = {
            $and: [
              { $gt: ['$currentStock', '$minimumThreshold'] },
              { $lt: ['$currentStock', '$maximumThreshold'] }
            ]
          };
          break;
        case 'low_stock':
          filter.$expr = {
            $and: [
              { $gt: ['$currentStock', 0] },
              { $lte: ['$currentStock', '$minimumThreshold'] }
            ]
          };
          break;
        case 'out_of_stock':
          filter.currentStock = 0;
          break;
        case 'overstocked':
          filter.$expr = {
            $gte: ['$currentStock', '$maximumThreshold']
          };
          break;
      }
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const items = await InventoryItem.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'fullName')
      .populate('updatedBy', 'fullName');

    const total = await InventoryItem.countDocuments(filter);

    res.status(200).json({
      items,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/inventory/dashboard - Get inventory dashboard data
router.get('/dashboard', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [
      totalItems,
      lowStockItems,
      outOfStockItems,
      categoryBreakdown
    ] = await Promise.all([
      InventoryItem.countDocuments({ status: 'active' }),
      InventoryItem.countDocuments({ 
        status: 'active',
        $expr: { $lte: ['$currentStock', '$minimumThreshold'] }
      }),
      InventoryItem.countDocuments({ 
        status: 'active',
        currentStock: 0
      }),
      InventoryItem.aggregate([
        { $match: { status: 'active' } },
        { $group: { 
          _id: '$category', 
          count: { $sum: 1 },
          lowStock: {
            $sum: {
              $cond: [
                { $lte: ['$currentStock', '$minimumThreshold'] },
                1,
                0
              ]
            }
          }
        }},
        { $sort: { _id: 1 } }
      ])
    ]);

    res.status(200).json({
      totalItems,
      lowStockItems,
      outOfStockItems,
      categoryBreakdown
    });
  } catch (error) {
    console.error('Error fetching inventory dashboard:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/inventory/:id - Get specific inventory item
router.get('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id)
      .populate('createdBy', 'fullName')
      .populate('updatedBy', 'fullName');

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    res.status(200).json({
      item
    });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/inventory - Create new inventory item
router.post('/', 
  authMiddleware, 
  requireAdmin,
  sanitizeInput,
  inventoryUpload.single('image'),
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    
    body('category')
      .isIn(['Donuts', 'Drinks', 'Pastries', 'Pizzas'])
      .withMessage('Invalid category. Must be one of: Donuts, Drinks, Pastries, Pizzas'),
    
     body('currentStock')
       .custom((value) => {
         // Allow empty values, they will be converted to 0
         if (value && value !== '') {
           const num = parseFloat(value);
           if (isNaN(num) || num < 0) {
             throw new Error('Current stock must be a non-negative number');
           }
         }
         return true;
       }),
    
     body('minimumThreshold')
       .custom((value) => {
         // Allow empty values, they will be converted to 0
         if (value && value !== '') {
           const num = parseFloat(value);
           if (isNaN(num) || num < 0) {
             throw new Error('Minimum threshold must be a non-negative number');
           }
         }
         return true;
       }),
    
  ],
  validateInput,
  async (req, res) => {
    try {
      // Handle multer errors
      if (req.fileError) {
        if (req.fileError.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: `File too large. Max ${MAX_UPLOAD_MB}MB` });
        }
        return res.status(400).json({ message: req.fileError.message || 'Upload error' });
      }

      const {
        name,
        category,
        currentStock,
        minimumThreshold
      } = req.body;

      // Get image URL if file was uploaded
      const imageUrl = req.file ? `/api/images/inventory/${req.file.id}` : ''; // GridFS file ID for serving images

      const newItem = new InventoryItem({
        name,
        category,
        currentStock: parseFloat(currentStock) || 0,
        minimumThreshold: parseFloat(minimumThreshold) || 0,
        imageUrl,
        status: 'active',
        createdBy: req.user.userId,
        updatedBy: req.user.userId
      });

      await newItem.save();

      // Log activity
      await ActivityService.logAdminActivity(
        req.user.userId,
        `Created inventory item: "${newItem.name}"`,
        newItem,
        `Category: ${newItem.category}, Stock: ${newItem.currentStock}`
      );

      res.status(201).json({
        message: 'Inventory item created successfully',
        item: newItem
      });
    } catch (error) {
      console.error('Error creating inventory item:', error);
      res.status(500).json({ message: error.message || 'Server error occurred' });
    }
  }
);

// PUT /api/inventory/:id - Update inventory item
router.put('/:id', 
  authMiddleware, 
  requireAdmin,
  sanitizeInput,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    
    body('currentStock')
      .optional()
      .isNumeric()
      .isFloat({ min: 0 })
      .withMessage('Current stock must be a non-negative number'),
    
  ],
  validateInput,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Remove fields that shouldn't be updated directly
      delete updateData.createdBy;
      delete updateData.createdAt;
      delete updateData.updatedAt;
      
      // Add updatedBy
      updateData.updatedBy = req.user.userId;

      const updatedItem = await InventoryItem.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedItem) {
        return res.status(404).json({ message: 'Inventory item not found' });
      }

      // Log activity
      await ActivityService.logAdminActivity(
        req.user.userId,
        `Updated inventory item: "${updatedItem.name}"`,
        updatedItem,
        `Category: ${updatedItem.category}`
      );

      res.status(200).json({
        message: 'Inventory item updated successfully',
        item: updatedItem
      });
    } catch (error) {
      console.error('Error updating inventory item:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// DELETE /api/inventory/:id - Delete inventory item
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const item = await InventoryItem.findById(id);
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // Store item data for logging before deletion
    const itemData = {
      name: item.name,
      category: item.category,
      currentStock: item.currentStock,
      imageUrl: item.imageUrl
    };

    // Hard delete - completely remove from database
    await InventoryItem.findByIdAndDelete(id);

    // Log activity
    await ActivityService.logAdminActivity(
      req.user.userId,
      `Permanently deleted inventory item: "${itemData.name}"`,
      { _id: id, ...itemData },
      `Category: ${itemData.category}, Stock: ${itemData.currentStock}`
    );

    res.status(200).json({ message: 'Inventory item permanently deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
