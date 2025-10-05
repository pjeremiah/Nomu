const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const authMiddleware = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');
const ActivityService = require('../services/activityService');

// Import security middleware
const { sanitizeInput, validateInput, createRateLimiter } = require('../middleware/securityMiddleware');

// Rate limiters for admin operations
const adminListRateLimiter = createRateLimiter(15 * 60 * 1000, 50, 'Too many admin list requests');
const adminCreateRateLimiter = createRateLimiter(60 * 60 * 1000, 5, 'Too many admin creation attempts');
const adminUpdateRateLimiter = createRateLimiter(15 * 60 * 1000, 20, 'Too many admin update attempts');
const adminDeleteRateLimiter = createRateLimiter(60 * 60 * 1000, 3, 'Too many admin deletion attempts');
const passwordResetRateLimiter = createRateLimiter(15 * 60 * 1000, 5, 'Too many password reset attempts');

// Middleware to check if user is superadmin
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied: Super Admin privileges required' });
  }
  next();
};

// Middleware to check if user is admin or higher
const requireAdmin = (req, res, next) => {
  if (!['superadmin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied: Admin privileges required' });
  }
  next();
};

// GET /api/admins - List all admins (admin+ can view)
router.get('/', adminListRateLimiter, authMiddleware, requireAdmin, async (req, res) => {
  try {
    // Enhanced security: Only return necessary fields, exclude sensitive data
    const admins = await Admin.find({}).select('-password -rememberUntil -firstLoginCompleted').sort({ createdAt: -1 });
    
    // Additional security: Sanitize admin data before sending
    const sanitizedAdmins = admins.map(admin => ({
      _id: admin._id,
      fullName: admin.fullName,
      email: admin.email, // Keep email for functionality but consider masking in frontend
      role: admin.role,
      status: admin.status,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      lastLoginAt: admin.lastLoginAt
    }));
    
    res.status(200).json(sanitizedAdmins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ message: 'Server error' }); // Don't expose error details
  }
});

// POST /api/admins - Create new admin (superadmin only)
router.post('/', 
  adminCreateRateLimiter,
  authMiddleware, 
  requireSuperAdmin, 
  sanitizeInput,
  [
    body('fullName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Full name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Full name can only contain letters and spaces'),
    
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
    body('role')
      .isIn(['superadmin', 'manager', 'staff'])
      .withMessage('Invalid role'),
    
    body('status')
      .optional()
      .isIn(['active', 'inactive'])
      .withMessage('Status must be either active or inactive')
  ],
  validateInput,
  async (req, res) => {
    try {
      const { fullName, email, password, role, status } = req.body;

      // Additional server-side validation
      if (!fullName || !email || !password || !role) {
        return res.status(400).json({ message: 'Full name, email, password, and role are required' });
      }

      // Validate role
      if (!['superadmin', 'manager', 'staff'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Check for any documents with null email (cleanup)
    const nullEmailAdmin = await Admin.findOne({ email: null });
    if (nullEmailAdmin) {
      await Admin.deleteOne({ _id: nullEmailAdmin._id });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    const newAdmin = new Admin({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      status: status || 'inactive'  // Default to inactive until admin logs in
    });

    await newAdmin.save();

    // Log activity
    await ActivityService.logAdminActivity(
      req.user.userId,
      `Created new admin account: "${newAdmin.fullName}"`,
      newAdmin,
      `Role: ${newAdmin.role}, Status: ${newAdmin.status}`
    );

    // Return admin without password
    const adminResponse = newAdmin.toObject();
    delete adminResponse.password;

    res.status(201).json({
      message: 'Admin created successfully',
      admin: adminResponse
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/admins/:id - Update admin details (superadmin can update all, manager can update staff)
router.put('/:id', adminUpdateRateLimiter, authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, role, status } = req.body;
    const currentUser = req.user;

    // Find the admin to update
    const adminToUpdate = await Admin.findById(id);
    if (!adminToUpdate) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Role-based restrictions
    if (currentUser.role === 'manager') {
      // Managers can only update staff members
      if (adminToUpdate.role !== 'staff') {
        return res.status(403).json({ message: 'Managers can only update staff members' });
      }
      // Managers cannot change roles to manager or superadmin
      if (role && ['manager', 'superadmin'].includes(role)) {
        return res.status(403).json({ message: 'Managers cannot promote staff to manager or superadmin' });
      }
    }

    // Superadmins can update anyone except themselves (to prevent self-demotion)
    if (currentUser.role === 'superadmin' && currentUser.userId === id) {
      if (role && role !== 'superadmin') {
        return res.status(403).json({ message: 'Super Admin cannot demote themselves' });
      }
    }

    // Build update object
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;

    // Check if email is being changed and if it already exists
    if (email && email !== adminToUpdate.email) {
      const existingAdmin = await Admin.findOne({ email: email.toLowerCase(), _id: { $ne: id } });
      if (existingAdmin) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    // Log activity
    await ActivityService.logAdminActivity(
      req.user.userId,
      `Updated admin account: "${updatedAdmin.fullName}"`,
      updatedAdmin,
      `Role: ${updatedAdmin.role}, Status: ${updatedAdmin.status}`
    );

    res.status(200).json({
      message: 'Admin updated successfully',
      admin: updatedAdmin
    });
  } catch (error) {

    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/admins/:id/reset-password - Reset admin password (superadmin only)
router.post('/:id/reset-password', 
  passwordResetRateLimiter,
  authMiddleware, 
  requireSuperAdmin,
  sanitizeInput,
  [
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
  ],
  validateInput,
  async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await Admin.findByIdAndUpdate(id, { password: hashedPassword });

    // Log activity
    await ActivityService.logAdminActivity(
      req.user.userId,
      `Reset password for admin: "${admin.fullName}"`,
      admin,
      `Role: ${admin.role}`
    );

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {

    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/admins/:id - Delete admin account (superadmin only)
router.delete('/:id', adminDeleteRateLimiter, authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Prevent self-deletion
    if (currentUser.userId === id) {
      return res.status(403).json({ message: 'Cannot delete your own account' });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Check if trying to delete another superadmin
    if (admin.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot delete another Super Admin' });
    }

    // Log activity before deletion
    await ActivityService.logAdminActivity(
      req.user.userId,
      `Deleted admin account: "${admin.fullName}"`,
      admin,
      `Role: ${admin.role}`
    );

    // Actually delete the admin account from the database
    await Admin.findByIdAndDelete(id);

    res.status(200).json({ message: 'Admin deleted successfully' });
  } catch (error) {

    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PATCH /api/admins/:id/status - Toggle admin status (superadmin only)
router.patch('/:id/status', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const currentUser = req.user;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Status must be either active or inactive' });
    }

    // Prevent self-deactivation
    if (currentUser.userId === id) {
      return res.status(403).json({ message: 'Cannot deactivate your own account' });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Check if trying to deactivate another superadmin
    if (admin.role === 'superadmin' && status === 'inactive') {
      return res.status(403).json({ message: 'Cannot deactivate another Super Admin' });
    }

    const oldStatus = admin.status;
    const updatedAdmin = await Admin.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).select('-password');

    // Log activity
    await ActivityService.logAdminActivity(
      req.user.userId,
      `${status === 'active' ? 'Activated' : 'Deactivated'} admin account: "${updatedAdmin.fullName}"`,
      updatedAdmin,
      `Status changed from ${oldStatus} to ${status}, Role: ${updatedAdmin.role}`
    );

    res.status(200).json({
      message: `Admin ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      admin: updatedAdmin
    });
  } catch (error) {

    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/admins/:id - Get specific admin details (admin+ can view)
// This must be placed AFTER all specific routes like /:id/status, /:id/reset-password, etc.
router.get('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id).select('-password');
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    res.status(200).json(admin);
  } catch (error) {
    console.error('Error fetching admin:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
