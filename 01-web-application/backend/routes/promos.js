const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const Promo = require('../models/Promo');
const authMiddleware = require('../middleware/authMiddleware');
const ActivityService = require('../services/activityService');
const { promoUpload } = require('../config/gridfs');

const PROMO_IMAGE_PREFIX = '/api/images/promo/';

const extractPromoImageId = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  if (!imageUrl.startsWith(PROMO_IMAGE_PREFIX)) return null;
  return imageUrl.slice(PROMO_IMAGE_PREFIX.length);
};

const deletePromoImageById = async (req, imageId) => {
  if (!imageId || !req.app.locals.gfsPromo) return;
  try {
    await req.app.locals.gfsPromo.delete(new mongoose.Types.ObjectId(imageId));
  } catch (gfsErr) {
    console.warn('GridFS promo image delete (non-fatal):', gfsErr.message);
  }
};

// Get all promos (admin only)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const promos = await Promo.find()
      .populate('createdBy', 'FullName')
      .populate('updatedBy', 'FullName')
      .sort({ createdAt: -1 });
    
    // Automatically update expired promos based on end date
    const now = new Date();
    const updatePromises = promos.map(async (promo) => {
      // Only update if promo is currently marked as Active but has expired
      if (promo.status === 'Active' && promo.endDate < now) {
        await promo.updateStatus();
      }
      // Also update if promo is Scheduled but should be Active
      else if (promo.status === 'Scheduled' && promo.startDate <= now && promo.endDate >= now && promo.isActive) {
        await promo.updateStatus();
      }
    });
    
    await Promise.all(updatePromises);
    
    res.json(promos);
  } catch (error) {
    console.error('Error fetching promos:', error);
    res.status(500).json({ message: 'Error fetching promos' });
  }
});

// Get active promos (public endpoint for home page)
router.get('/active', async (req, res) => {
  try {
    const promos = await Promo.getActivePromos();
    res.json(promos);
  } catch (error) {
    console.error('Error fetching active promos:', error);
    res.status(500).json({ message: 'Error fetching active promos' });
  }
});

// Get single promo by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const promo = await Promo.findById(req.params.id)
      .populate('createdBy', 'FullName')
      .populate('updatedBy', 'FullName');
    
    if (!promo) {
      return res.status(404).json({ message: 'Promo not found' });
    }
    
    res.json(promo);
  } catch (error) {
    console.error('Error fetching promo:', error);
    res.status(500).json({ message: 'Error fetching promo' });
  }
});

// Create new promo (owner and manager only; staff is view-only)
router.post('/', authMiddleware, promoUpload.single('image'), async (req, res) => {
  try {
    const { role } = req.user;
    if (!['superadmin', 'manager'].includes(role)) {
      return res.status(403).json({ message: 'Access denied. Only Owner or Manager can create promos. Staff has view-only access.' });
    }

    const {
      title,
      description,
      promoType,
      discountValue,
      minOrderAmount,
      startDate,
      endDate,
      usageLimit,
      status
    } = req.body;


    // Validate required fields
    if (!title || !description || !promoType || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Only validate discountValue if promo type is not "Free Item"
    if (promoType !== "Free Item" && (!discountValue || discountValue <= 0)) {
      return res.status(400).json({ message: 'Discount value is required for this promo type' });
    }

    // Parse dates (expect ISO strings so exact admin time is preserved)
    const parseDate = (str) => {
      if (!str || typeof str !== 'string') return null;
      const d = new Date(str);
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!start || !end) {
      return res.status(400).json({ message: 'Invalid start or end date format; use ISO date/time.' });
    }
    if (start >= end) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    const processedMinOrderAmount = minOrderAmount ? parseFloat(minOrderAmount) : 0;
    
    const promoData = {
      title,
      description,
      promoType,
      discountValue: promoType === "Free Item" ? 0 : parseFloat(discountValue),
      minOrderAmount: processedMinOrderAmount,
      startDate: start,
      endDate: end,
      usageLimit: usageLimit ? parseInt(usageLimit) : null,
      status: status || 'Active',
      createdBy: new mongoose.Types.ObjectId(req.user.userId)
    };

    // Add image URL if uploaded (GridFS provides file ID)
    if (req.file) {
      promoData.imageUrl = `/api/images/promo/${req.file.id}`; // GridFS file ID for serving images
    }

    const promo = new Promo(promoData);
    await promo.save();

    // Update status based on dates
    await promo.updateStatus();
    
    // Log activity
    await ActivityService.logPromoActivity(
      req.user.userId,
      `Created new promotion: "${promo.title}"`,
      promo,
      `Type: ${promo.promoType}, Status: ${promo.status}`
    );
    
    res.status(201).json(promo);
  } catch (error) {
    console.error('Error creating promo:', error);
    res.status(500).json({ message: 'Error creating promo', error: error.message });
  }
});

// Update promo (owner and manager only; staff is view-only)
router.put('/:id', authMiddleware, promoUpload.single('image'), async (req, res) => {
  let oldImageId = null;
  const newImageId = req.file ? String(req.file.id) : null;
  let promoSaved = false;
  try {
    const { role } = req.user;
    if (!['superadmin', 'manager'].includes(role)) {
      return res.status(403).json({ message: 'Access denied. Only Owner or Manager can update promos. Staff has view-only access.' });
    }

    const {
      title,
      description,
      promoType,
      discountValue,
      minOrderAmount,
      startDate,
      endDate,
      usageLimit,
      status
    } = req.body;

    const promo = await Promo.findById(req.params.id);
    if (!promo) {
      if (newImageId) {
        await deletePromoImageById(req, newImageId);
      }
      return res.status(404).json({ message: 'Promo not found' });
    }
    oldImageId = extractPromoImageId(promo.imageUrl);

    // Parse and validate dates: expect ISO strings (with Z or offset) so exact admin time is preserved
    const parseDate = (str) => {
      if (!str || typeof str !== 'string') return null;
      const d = new Date(str);
      return Number.isNaN(d.getTime()) ? null : d;
    };
    if (startDate && endDate) {
      const start = parseDate(startDate);
      const end = parseDate(endDate);
      if (!start || !end) {
        return res.status(400).json({ message: 'Invalid start or end date format; use ISO date/time.' });
      }
      if (start >= end) {
        return res.status(400).json({ message: 'End date must be after start date' });
      }
    }

    // Update fields
    if (title) promo.title = title;
    if (description) promo.description = description;
    if (promoType) {
      promo.promoType = promoType;
      // Handle discount value based on promo type
      if (promoType === "Free Item") {
        promo.discountValue = 0;
      } else if (discountValue) {
        promo.discountValue = parseFloat(discountValue);
      }
    } else if (discountValue) {
      promo.discountValue = parseFloat(discountValue);
    }
    if (minOrderAmount !== undefined) promo.minOrderAmount = parseFloat(minOrderAmount);
    if (startDate) {
      const parsed = parseDate(startDate);
      if (parsed) promo.startDate = parsed;
    }
    if (endDate) {
      const parsed = parseDate(endDate);
      if (parsed) promo.endDate = parsed;
    }
    if (usageLimit !== undefined) promo.usageLimit = usageLimit ? parseInt(usageLimit) : null;
    if (status) promo.status = status;
    
    promo.updatedBy = new mongoose.Types.ObjectId(req.user.userId);

    // Update image if new one uploaded
    if (req.file) {
      promo.imageUrl = `/api/images/promo/${req.file.id}`; // GridFS file ID for serving images
    }

    await promo.save();
    promoSaved = true;
    if (newImageId && oldImageId && oldImageId !== newImageId) {
      await deletePromoImageById(req, oldImageId);
    }
    
    // Update status based on dates
    await promo.updateStatus();

    // Log activity
    await ActivityService.logPromoActivity(
      req.user.userId,
      `Updated promotion: "${promo.title}"`,
      promo,
      `Type: ${promo.promoType}, Status: ${promo.status}`
    );

    res.json(promo);
  } catch (error) {
    if (newImageId && !promoSaved) {
      await deletePromoImageById(req, newImageId);
    }
    console.error('Error updating promo:', error);
    res.status(500).json({ message: 'Error updating promo' });
  }
});

// Delete promo (owner and manager only; staff is view-only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;
    if (!['superadmin', 'manager'].includes(role)) {
      return res.status(403).json({ message: 'Access denied. Only Owner or Manager can delete promos. Staff has view-only access.' });
    }

    const promo = await Promo.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ message: 'Promo not found' });
    }

    // Delete image from database (GridFS) if exists - admin images are stored in DB, not local storage
    if (promo.imageUrl) {
      const imageId = extractPromoImageId(promo.imageUrl);
      await deletePromoImageById(req, imageId);
    }

    // Log activity before deletion
    await ActivityService.logPromoActivity(
      req.user.userId,
      `Deleted promotion: "${promo.title}"`,
      promo,
      `Type: ${promo.promoType}, Status: ${promo.status}`
    );

    await Promo.findByIdAndDelete(req.params.id);
    res.json({ message: 'Promo deleted successfully' });
  } catch (error) {
    console.error('Error deleting promo:', error);
    res.status(500).json({ message: 'Error deleting promo' });
  }
});

// Toggle promo status (owner and manager only; staff is view-only)
router.patch('/:id/toggle-status', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;
    if (!['superadmin', 'manager'].includes(role)) {
      return res.status(403).json({ message: 'Access denied. Only Owner or Manager can change promo status. Staff has view-only access.' });
    }

    const promo = await Promo.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ message: 'Promo not found' });
    }

    const oldStatus = promo.isActive ? 'Active' : 'Inactive';
    promo.isActive = !promo.isActive;
    await promo.updateStatus();
    
    // Log activity
    const newStatus = promo.isActive ? 'Active' : 'Inactive';
    await ActivityService.logPromoActivity(
      req.user.userId,
      `${newStatus === 'Active' ? 'Activated' : 'Deactivated'} promotion: "${promo.title}"`,
      promo,
      `Status changed from ${oldStatus} to ${newStatus}`
    );
    
    res.json(promo);
  } catch (error) {
    console.error('Error toggling promo status:', error);
    res.status(500).json({ message: 'Error toggling promo status' });
  }
});

// Update all promo statuses based on dates (cron job endpoint)
router.post('/update-statuses', async (req, res) => {
  try {
    const promos = await Promo.find({ isActive: true });
    
    for (const promo of promos) {
      await promo.updateStatus();
    }
    
    res.json({ message: 'All promo statuses updated successfully' });
  } catch (error) {
    console.error('Error updating promo statuses:', error);
    res.status(500).json({ message: 'Error updating promo statuses' });
  }
});

module.exports = router;
