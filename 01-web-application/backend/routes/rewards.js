const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Reward = require('../models/Reward');
const authMiddleware = require('../middleware/authMiddleware');
const ActivityService = require('../services/activityService');

// Get all rewards (admin only)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;
    
    // Check if user has admin privileges
    if (!['superadmin', 'manager', 'staff'].includes(role)) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const rewards = await Reward.find({})
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email')
      .sort({ createdAt: -1 });
    
    res.json(rewards);
  } catch (error) {
    console.error('Error fetching rewards:', error);
    res.status(500).json({ message: 'Error fetching rewards', error: error.message });
  }
});

// Get active rewards (public endpoint for customer-facing features)
router.get('/active', async (req, res) => {
  try {
    const rewards = await Reward.getActiveRewards();
    res.json(rewards);
  } catch (error) {
    console.error('Error fetching active rewards:', error);
    res.status(500).json({ message: 'Error fetching active rewards', error: error.message });
  }
});

// Get reward by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (!['superadmin', 'manager', 'staff'].includes(role)) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid reward ID' });
    }

    const reward = await Reward.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email');
    
    if (!reward) {
      return res.status(404).json({ message: 'Reward not found' });
    }
    
    res.json(reward);
  } catch (error) {
    console.error('Error fetching reward:', error);
    res.status(500).json({ message: 'Error fetching reward', error: error.message });
  }
});

// Create new reward
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { role, userId } = req.user;
    
    if (!['superadmin', 'manager', 'staff'].includes(role)) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    
    const {
      title,
      description,
      rewardType,
      pointsRequired,
      startDate,
      endDate,
      usageLimit,
      status
    } = req.body;


    // Validate required fields (check for empty strings too)
    if (!title || !description || !rewardType || !startDate || !endDate || !usageLimit || 
        title.trim() === '' || description.trim() === '' || usageLimit.toString().trim() === '') {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Prepare reward data
    const rewardData = {
      title: title.trim(),
      description: description.trim(),
      rewardType,
      pointsRequired: pointsRequired ? parseInt(pointsRequired) : 0,
      startDate: start,
      endDate: end,
      usageLimit: parseInt(usageLimit),
      status: status || 'Active',
      createdBy: userId
    };


    const reward = new Reward(rewardData);
    await reward.save();

    // Log activity
    await ActivityService.logActivity({
      adminId: userId,
      action: 'CREATE_REWARD',
      details: `Created reward: ${reward.title}`,
      metadata: {
        rewardId: reward._id,
        rewardType: reward.rewardType
      }
    });

    res.status(201).json(reward);
  } catch (error) {
    console.error('Error creating reward:', error);
    res.status(500).json({ message: 'Error creating reward', error: error.message });
  }
});

// Update reward
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { role, userId } = req.user;
    
    if (!['superadmin', 'manager', 'staff'].includes(role)) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid reward ID' });
    }

    const reward = await Reward.findById(req.params.id);
    if (!reward) {
      return res.status(404).json({ message: 'Reward not found' });
    }

    const {
      title,
      description,
      rewardType,
      pointsRequired,
      startDate,
      endDate,
      usageLimit,
      status
    } = req.body;

    // Update fields
    if (title) reward.title = title.trim();
    if (description) reward.description = description.trim();
    if (rewardType) reward.rewardType = rewardType;
    if (pointsRequired !== undefined) reward.pointsRequired = parseInt(pointsRequired);
    if (startDate) reward.startDate = new Date(startDate);
    if (endDate) reward.endDate = new Date(endDate);
    if (usageLimit !== undefined) reward.usageLimit = parseInt(usageLimit);
    if (status) reward.status = status;
    
    reward.updatedBy = userId;


    await reward.save();

    // Log activity
    await ActivityService.logActivity({
      adminId: userId,
      action: 'UPDATE_REWARD',
      details: `Updated reward: ${reward.title}`,
      metadata: {
        rewardId: reward._id,
        rewardType: reward.rewardType
      }
    });

    res.json(reward);
  } catch (error) {
    console.error('Error updating reward:', error);
    res.status(500).json({ message: 'Error updating reward', error: error.message });
  }
});

// Delete reward (hard delete)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { role, userId } = req.user;
    
    if (!['superadmin', 'manager', 'staff'].includes(role)) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid reward ID' });
    }

    const reward = await Reward.findById(req.params.id);
    if (!reward) {
      return res.status(404).json({ message: 'Reward not found' });
    }

    // Store reward info for logging before deletion
    const rewardInfo = {
      title: reward.title,
      rewardType: reward.rewardType,
      rewardId: reward._id
    };

    // Hard delete - completely remove from database
    await Reward.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityService.logActivity({
      adminId: userId,
      action: 'DELETE_REWARD',
      details: `Permanently deleted reward: ${rewardInfo.title}`,
      metadata: {
        rewardId: rewardInfo.rewardId,
        rewardType: rewardInfo.rewardType
      }
    });

    res.json({ message: 'Reward permanently deleted successfully' });
  } catch (error) {
    console.error('Error deleting reward:', error);
    res.status(500).json({ message: 'Error deleting reward', error: error.message });
  }
});

// Toggle reward status
router.patch('/:id/toggle-status', authMiddleware, async (req, res) => {
  try {
    const { role, userId } = req.user;
    
    if (!['superadmin', 'manager', 'staff'].includes(role)) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid reward ID' });
    }

    const reward = await Reward.findById(req.params.id);
    if (!reward) {
      return res.status(404).json({ message: 'Reward not found' });
    }

    // Toggle between Active and Inactive
    reward.status = reward.status === 'Active' ? 'Inactive' : 'Active';
    reward.updatedBy = userId;
    await reward.save();

    // Log activity
    await ActivityService.logActivity({
      adminId: userId,
      action: 'TOGGLE_REWARD_STATUS',
      details: `Toggled reward status to ${reward.status}: ${reward.title}`,
      metadata: {
        rewardId: reward._id,
        rewardType: reward.rewardType,
        newStatus: reward.status
      }
    });

    res.json({ message: `Reward status updated to ${reward.status}`, reward });
  } catch (error) {
    console.error('Error toggling reward status:', error);
    res.status(500).json({ message: 'Error toggling reward status', error: error.message });
  }
});

// Get rewards by type
router.get('/type/:type', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (!['superadmin', 'manager', 'staff'].includes(role)) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { type } = req.params;
    const validTypes = ['Loyalty Bonus'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid reward type' });
    }

    const rewards = await Reward.getRewardsByType(type);
    res.json(rewards);
  } catch (error) {
    console.error('Error fetching rewards by type:', error);
    res.status(500).json({ message: 'Error fetching rewards by type', error: error.message });
  }
});

// Use reward (for customer redemption)
router.post('/:id/use', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid reward ID' });
    }

    const reward = await Reward.findById(req.params.id);
    if (!reward) {
      return res.status(404).json({ message: 'Reward not found' });
    }

    if (!reward.canBeUsed()) {
      return res.status(400).json({ message: 'Reward cannot be used at this time' });
    }

    await reward.useReward();
    res.json({ message: 'Reward used successfully', reward });
  } catch (error) {
    console.error('Error using reward:', error);
    res.status(500).json({ message: 'Error using reward', error: error.message });
  }
});

module.exports = router;
