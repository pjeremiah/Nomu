// routes/feedback.js
const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const authMiddleware = require('../middleware/authMiddleware');
const ActivityService = require('../services/activityService');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// POST /api/feedback → Save feedback from client
router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ 
        message: 'Name, email, and message are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Please provide a valid email address' 
      });
    }

    // Create new feedback
    const feedback = new Feedback({
      name,
      email,
      message
    });

    await feedback.save();

    // Log activity for customer feedback submission
    await ActivityService.logActivity({
      adminId: null, // No admin involved in customer submission
      action: `Customer feedback received from ${feedback.name}`,
      entityType: 'feedback',
      entityId: feedback._id,
      entityName: feedback.name,
      details: `Status: ${feedback.status}`
    });

    res.status(201).json({ 
      message: 'Feedback submitted successfully',
      feedback: {
        id: feedback._id,
        name: feedback.name,
        email: feedback.email,
        message: feedback.message,
        status: feedback.status,
        createdAt: feedback.createdAt
      }
    });

  } catch (err) {

    res.status(500).json({ 
      message: 'Failed to submit feedback', 
      error: err.message 
    });
  }
});

// GET /api/feedback → Return all feedback for admin dashboard (protected)
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (!['staff', 'manager', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied: Admin privileges required' 
      });
    }

    const feedback = await Feedback.find()
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json(feedback);

  } catch (err) {

    res.status(500).json({ 
      message: 'Failed to fetch feedback', 
      error: err.message 
    });
  }
});

// POST /api/feedback/reply/:id → Admin reply to feedback
router.post('/reply/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    // Check if user is admin
    if (!['staff', 'manager', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied: Admin privileges required' 
      });
    }

    // Validate reply
    if (!reply || reply.trim().length === 0) {
      return res.status(400).json({ 
        message: 'Reply message is required' 
      });
    }

    // Find feedback
    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({ 
        message: 'Feedback not found' 
      });
    }

    // Check if already replied
    if (feedback.status === 'replied') {
      return res.status(400).json({ 
        message: 'Feedback has already been replied to' 
      });
    }

    // Update feedback
    feedback.reply = reply.trim();
    feedback.status = 'replied';
    feedback.repliedAt = new Date();
    await feedback.save();

    // Log activity for admin reply
    await ActivityService.logActivity({
      adminId: req.user.userId,
      action: `Replied to feedback from ${feedback.name}`,
      entityType: 'feedback',
      entityId: feedback._id,
      entityName: feedback.name,
      details: `Status: ${feedback.status}`
    });

    // Send email to customer
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: feedback.email,
      subject: 'Reply to your feedback at Nomu Café',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #003087, #0056b3); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">☕ Nomu Café</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Thank you for your feedback!</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e9ecef; border-top: none;">
            <p style="font-size: 16px; color: #333;">Hi <strong>${feedback.name}</strong>,</p>
            
            <p style="color: #666; line-height: 1.6;">
              Thank you for taking the time to share your feedback with us. We appreciate your input and would like to respond:
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #003087; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0; font-style: italic; color: #333; line-height: 1.6;">"${reply}"</p>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #1976d2; font-size: 14px;">
                <strong>Your original feedback:</strong><br>
                <em>"${feedback.message}"</em>
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              If you have any further questions or concerns, please don't hesitate to reach out to us.
            </p>
            
            <p style="color: #333;">
              Best regards,<br>
              <strong>The Nomu Café Team</strong>
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 0 0 10px 10px; text-align: center;">
            <p style="font-size: 12px; color: #6c757d; margin: 0;">
              This is an automated response to your feedback submitted on ${new Date(feedback.createdAt).toLocaleDateString()}.
            </p>
            <p style="font-size: 12px; color: #6c757d; margin: 5px 0 0 0;">
              © 2024 Nomu Café. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);

    } catch (emailError) {

      // Don't fail the request if email fails, just log it
    }

    res.json({
      message: 'Reply sent successfully',
      feedback: {
        id: feedback._id,
        name: feedback.name,
        email: feedback.email,
        message: feedback.message,
        status: feedback.status,
        reply: feedback.reply,
        createdAt: feedback.createdAt,
        repliedAt: feedback.repliedAt
      }
    });

  } catch (err) {

    res.status(500).json({ 
      message: 'Failed to send reply', 
      error: err.message 
    });
  }
});

module.exports = router;
