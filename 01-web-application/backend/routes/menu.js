const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const MenuItem = require('../models/MenuItem');
const authMiddleware = require('../middleware/authMiddleware');
const { sanitizeInput, validateFileUpload } = require('../middleware/securityMiddleware');
const ActivityService = require('../services/activityService');
const { menuUpload } = require('../config/gridfs');

const router = express.Router();
const MAX_UPLOAD_MB = 50; // 50MB limit for menu images

// POST /api/menu → Add item
router.post('/', authMiddleware, sanitizeInput, (req, res) => {
  menuUpload.single('image')(req, res, async (err) => {
    if (err) {

      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: `File too large. Max ${MAX_UPLOAD_MB}MB` });
      }
      return res.status(400).json({ message: err.message || 'Upload error' });
    }
    try {
      const { name, price, category, description, secondPrice } = req.body;
      if (!name || !price || !category) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      const numericPrice = Number(price);
      if (Number.isNaN(numericPrice)) {
        return res.status(400).json({ message: 'Price must be a number' });
      }
      
      // For drinks, validate second price only if provided
      if (category === 'Drinks' && secondPrice && Number(secondPrice) <= 0) {
        return res.status(400).json({ message: 'Second price must be a valid number' });
      }
      
      const numericSecondPrice = secondPrice ? Number(secondPrice) : undefined;
      if (secondPrice && Number.isNaN(numericSecondPrice)) {
        return res.status(400).json({ message: 'Second price must be a number' });
      }
      
      const imageUrl = req.file ? `/api/images/menu/${req.file.id}` : ''; // GridFS file ID for serving images

      const itemData = { name, description, price: numericPrice, category, imageUrl };
      if (category === 'Drinks' && numericSecondPrice) {
        itemData.secondPrice = numericSecondPrice;
      }

      const item = await MenuItem.create(itemData);

      // Log activity
      const priceInfo = item.category === 'Drinks' && item.secondPrice 
        ? `Price: ₱${item.price}/${item.secondPrice}` 
        : `Price: ₱${item.price}`;
      await ActivityService.logMenuActivity(
        req.user.userId,
        `Added new menu item: "${item.name}"`,
        item,
        `Category: ${item.category}, ${priceInfo}`
      );

      return res.status(201).json(item);
    } catch (e) {

      return res.status(500).json({ message: e.message || 'Failed to create item' });
    }
  });
});

// GET /api/menu → Fetch all items (admin view)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const items = await MenuItem.find().sort({ createdAt: -1 });

    return res.json(items);
  } catch (err) {

    return res.status(500).json({ message: 'Failed to fetch items' });
  }
});

// GET /api/menu/client → Fetch only active items (client view)
router.get('/client', async (req, res) => {
  try {
    const items = await MenuItem.find({ status: 'active' }).sort({ createdAt: -1 });
    return res.json(items);
  } catch (err) {

    return res.status(500).json({ message: 'Failed to fetch items' });
  }
});

// PUT /api/menu/:id → Edit item
router.put('/:id', authMiddleware, sanitizeInput, (req, res) => {
  menuUpload.single('image')(req, res, async (err) => {
    if (err) {

      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: `File too large. Max ${MAX_UPLOAD_MB}MB` });
      }
      return res.status(400).json({ message: err.message || 'Upload error' });
    }
    try {
      const { id } = req.params;
      const { name, price, category, description, secondPrice } = req.body;
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (price !== undefined) {
        const numericPrice = Number(price);
        if (Number.isNaN(numericPrice)) {
          return res.status(400).json({ message: 'Price must be a number' });
        }
        updates.price = numericPrice;
      }
      if (category !== undefined) {
        updates.category = category;
        // If changing to drinks, validate second price only if provided
        if (category === 'Drinks' && secondPrice && Number(secondPrice) <= 0) {
          return res.status(400).json({ message: 'Second price must be a valid number' });
        }
      }
      if (secondPrice !== undefined) {
        if (secondPrice === '' || secondPrice === null) {
          // Remove secondPrice field if empty by setting it to null
          updates.$unset = { secondPrice: 1 };
        } else {
          const numericSecondPrice = Number(secondPrice);
          if (Number.isNaN(numericSecondPrice)) {
            return res.status(400).json({ message: 'Second price must be a number' });
          }
          updates.secondPrice = numericSecondPrice;
        }
      }

      const existing = await MenuItem.findById(id);
      if (!existing) return res.status(404).json({ message: 'Item not found' });

      // Handle new image upload
      if (req.file) {
        // Note: GridFS doesn't require explicit old file deletion as it's handled by MongoDB
        updates.imageUrl = `/api/images/menu/${req.file.id}`;
      }

      // Handle second price removal separately
      let updateQuery = updates;
      if (updates.$unset) {
        // If we need to unset secondPrice, do it in a separate operation
        await MenuItem.findByIdAndUpdate(id, { $unset: { secondPrice: 1 } });
        delete updates.$unset; // Remove $unset from regular updates
      }

      const updated = await MenuItem.findByIdAndUpdate(id, updates, { new: true });
      
      // Log activity
      const priceInfo = updated.category === 'Drinks' && updated.secondPrice 
        ? `Price: ₱${updated.price}/${updated.secondPrice}` 
        : `Price: ₱${updated.price}`;
      await ActivityService.logMenuActivity(
        req.user.userId,
        `Updated menu item: "${updated.name}"`,
        updated,
        `Category: ${updated.category}, ${priceInfo}`
      );
      
      return res.json(updated);
    } catch (e) {

      return res.status(500).json({ message: e.message || 'Failed to update item' });
    }
  });
});

// PATCH /api/menu/:id/status → Toggle item status
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['active', 'disabled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be "active" or "disabled"' });
    }
    
    const existing = await MenuItem.findById(id);
    if (!existing) return res.status(404).json({ message: 'Item not found' });
    
    const oldStatus = existing.status;
    existing.status = status;
    await existing.save();
    
    // Log activity
    await ActivityService.logMenuActivity(
      req.user.userId,
      `${status === 'active' ? 'Activated' : 'Deactivated'} menu item: "${existing.name}"`,
      existing,
      `Status changed from ${oldStatus} to ${status}`
    );
    
    return res.json(existing);
  } catch (err) {

    return res.status(500).json({ message: 'Failed to toggle status' });
  }
});

// DELETE /api/menu/:id → Delete item
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await MenuItem.findById(id);
    if (!existing) return res.status(404).json({ message: 'Item not found' });
    
    // Log activity before deletion
    await ActivityService.logMenuActivity(
      req.user.userId,
      `Deleted menu item: "${existing.name}"`,
      existing,
      `Category: ${existing.category}, Price: ₱${existing.price}`
    );
    
    // Note: GridFS images are automatically managed by MongoDB
    // No need to manually delete files as GridFS handles cleanup
    await existing.deleteOne();
    return res.json({ message: 'Item deleted' });
  } catch (err) {

    return res.status(500).json({ message: 'Failed to delete item' });
  }
});

module.exports = router;


