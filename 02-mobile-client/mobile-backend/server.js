require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'EMAIL_USER', 'EMAIL_PASS'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('❌ Please check your .env file');
  process.exit(1);
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const dialogflow = require('dialogflow');
const path = require('path');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const os = require('os');
const nodemailer = require('nodemailer');
const socketIo = require('socket.io');
const http = require('http');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const ActivityService = require('./services/activityService');
const morgan = require('morgan');
const Grid = require('gridfs-stream');
const { 
  ipRateLimit, 
  checkEmployeeLimits, 
  recordEmployeeScan, 
  checkCustomerLimits, 
  recordCustomerScan, 
  detectAbuse, 
  generateQrToken, 
  validateJwtToken, 
  securityHeaders, 
  corsSecurity,
  config,
  initializeNotifications,
  notifyCustomerScanLimit,
  notifyCustomerApproachingLimit
} = require('./middleware/securityMiddleware');

// Real-time notifications are handled via Socket.IO

// Function to get local IP address
function getLocalIP() {
  // Check if a specific IP is set in environment variables
  if (process.env.SERVER_IP) {
    return process.env.SERVER_IP;
  }
  
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost';
}

const app = express();

// Old rate limiters removed - using security middleware instead

// Apply high-volume security middleware
app.use(securityHeaders);
app.use(corsSecurity);
app.use(ipRateLimit);

// Rate limit reset endpoint for testing (remove in production)
app.post('/api/reset-rate-limit', (req, res) => {
  try {
    // Reset rate limit for the requesting IP
    const clientIP = req.ip || req.connection.remoteAddress;
    // Note: Security middleware uses in-memory storage, so this is mainly for logging
    console.log(`🔄 Rate limit reset requested for IP: ${clientIP}`);
    res.json({ 
      success: true, 
      message: 'Rate limit reset requested (security middleware uses in-memory storage)',
      ip: clientIP 
    });
  } catch (error) {
    console.error('Error resetting rate limit:', error);
    res.status(500).json({ error: 'Failed to reset rate limit' });
  }
});

// CORS middleware with explicit configuration
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: false
}));

// JSON parsing middleware
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use(morgan('combined'));

// Debug middleware for CORS and requests
app.use((req, res, next) => {
  console.log(`🔍 [DEBUG] ${req.method} ${req.url}`);
  console.log(`🔍 [DEBUG] Origin: ${req.headers.origin || 'No origin'}`);
  console.log(`🔍 [DEBUG] User-Agent: ${req.headers['user-agent'] || 'No user-agent'}`);
  next();
});

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ message: 'JWT secret not configured' });
  }
  
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next(); // Skip authentication if no secret configured
    }
    
    jwt.verify(token, jwtSecret, (err, user) => {
      if (!err) {
        req.user = user;
      }
    });
  }
  next();
};

// Create HTTP server
const server = http.createServer(app);

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize security notification system
initializeNotifications(io);

// Email transporter setup with verification
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify transporter at startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter error:", error);
    console.error("❌ Check your EMAIL_USER and EMAIL_PASS environment variables");
    console.error("❌ Make sure you're using an App Password for Gmail, not your regular password");
  } else {
    console.log("✅ Email transporter is ready");
    console.log(`📧 Using email: ${process.env.EMAIL_USER}`);
  }
});

// Store OTP codes temporarily (in production, use Redis)
const otpStore = new Map();

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP email
async function sendOTPEmail(email, otp) {
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('❌ [EMAIL] Invalid email format:', email);
    return false;
  }

  // Check if email credentials are set
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ [EMAIL] Email credentials not configured');
    console.error('❌ [EMAIL] Please set EMAIL_USER and EMAIL_PASS environment variables');
    return false;
  }

  const mailOptions = {
    from: `"Nomu Cafe OTP Verification" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Nomu Cafe - Email Verification OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4a5568;">Nomu Cafe Email Verification</h2>
        <p>Your verification code is:</p>
        <h1 style="color: #2d3748; font-size: 48px; text-align: center; letter-spacing: 8px; background: #f7fafc; padding: 20px; border-radius: 8px;">${otp}</h1>
        <p>This code will expire in 3 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr style="margin: 20px 0;">
        <p style="color: #718096; font-size: 12px;">Nomu Cafe - Your Coffee Journey Starts Here</p>
      </div>
    `
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ [EMAIL] Email sent successfully to: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ [EMAIL] Email sending error:', error);
    console.error('❌ [EMAIL] Error code:', error.code);
    console.error('❌ [EMAIL] Error response:', error.response);
    
    // Provide specific error messages
    if (error.code === 'EAUTH') {
      console.error('❌ [EMAIL] Authentication failed - check your email credentials');
    } else if (error.code === 'ECONNECTION') {
      console.error('❌ [EMAIL] Connection failed - check your internet connection');
    } else if (error.responseCode === 535) {
      console.error('❌ [EMAIL] Authentication failed - use App Password for Gmail');
    }
    
    return false;
  }
}

// Send loyalty points notification email
async function sendLoyaltyPointsEmail(email, name, points, drink, isRewardEligible = false) {
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('❌ [LOYALTY EMAIL] Invalid email format:', email);
    return false;
  }

  // Check if email credentials are set
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ [LOYALTY EMAIL] Email credentials not configured');
    return false;
  }

  let subject, htmlContent;
  
  if (isRewardEligible) {
    // Special email for when user reaches 5 or 10 points (reward eligible)
    subject = '🎉 Congratulations! You\'ve earned a reward at Nomu Cafe!';
    htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 15px;">
        <div style="background: white; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: #2d3748; margin-bottom: 20px;">🎉 Congratulations ${name}!</h1>
          <div style="background: #f7fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h2 style="color: #4a5568; margin: 0;">You now have ${points} loyalty points!</h2>
            <p style="color: #718096; margin: 10px 0 0 0;">Your order: <strong>${drink}</strong></p>
          </div>
          <div style="background: #e6fffa; border: 2px solid #38b2ac; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #2c7a7b; margin: 0 0 10px 0;">🎁 You're eligible for a reward!</h3>
            <p style="color: #2c7a7b; margin: 0;">Visit any Nomu Cafe location to claim your free drink!</p>
          </div>
          <p style="color: #4a5568; margin: 20px 0;">Thank you for being a loyal customer. We can't wait to serve you again!</p>
          <hr style="margin: 20px 0;">
          <p style="color: #718096; font-size: 12px;">Nomu Cafe - Your Coffee Journey Continues</p>
        </div>
      </div>
    `;
  } else {
    // Regular email for points earned
    subject = '☕ Loyalty Points Earned at Nomu Cafe!';
    htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 15px;">
        <div style="background: white; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: #2d3748; margin-bottom: 20px;">☕ Great choice, ${name}!</h1>
          <div style="background: #f7fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h2 style="color: #4a5568; margin: 0;">You earned 1 loyalty point!</h2>
            <p style="color: #718096; margin: 10px 0 0 0;">Your order: <strong>${drink}</strong></p>
            <p style="color: #4a5568; margin: 10px 0 0 0;">Total points: <strong>${points}</strong></p>
          </div>
          <div style="background: #fff5f5; border: 1px solid #fed7d7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #c53030; margin: 0; font-size: 14px;">
              <strong>${10 - points} more points</strong> until your next reward!
            </p>
          </div>
          <p style="color: #4a5568; margin: 20px 0;">Keep visiting us to earn more points and unlock amazing rewards!</p>
          <hr style="margin: 20px 0;">
          <p style="color: #718096; font-size: 12px;">Nomu Cafe - Your Coffee Journey Continues</p>
        </div>
      </div>
    `;
  }

  const mailOptions = {
    from: `"Nomu Cafe Loyalty Program" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: subject,
    html: htmlContent
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ [LOYALTY EMAIL] Email sent successfully to: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ [LOYALTY EMAIL] Email sending error:', error);
    return false;
  }
}

// Send reward claim notification email
async function sendRewardClaimEmail(email, name, rewardType, description, remainingPoints) {
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('❌ [REWARD EMAIL] Invalid email format:', email);
    return false;
  }

  // Check if email credentials are set
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ [REWARD EMAIL] Email credentials not configured');
    return false;
  }

  const rewardEmoji = rewardType === 'coffee' ? '☕' : '🍩';
  const rewardName = rewardType === 'coffee' ? 'Free Coffee' : 'Free Donut';
  
  const subject = `🎉 Reward Claimed! ${rewardEmoji} ${rewardName} at Nomu Cafe`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 15px;">
      <div style="background: white; padding: 30px; border-radius: 10px; text-align: center;">
        <h1 style="color: #2d3748; margin-bottom: 20px;">🎉 Congratulations ${name}!</h1>
        <div style="background: #e6fffa; border: 2px solid #38b2ac; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h2 style="color: #2c7a7b; margin: 0 0 10px 0;">${rewardEmoji} You've claimed your ${rewardName}!</h2>
          <p style="color: #2c7a7b; margin: 0;">${description}</p>
        </div>
        <div style="background: #f7fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #4a5568; margin: 0 0 10px 0;">Your Reward Details</h3>
          <p style="color: #718096; margin: 5px 0;"><strong>Reward Type:</strong> ${rewardName}</p>
          <p style="color: #718096; margin: 5px 0;"><strong>Description:</strong> ${description}</p>
          <p style="color: #718096; margin: 5px 0;"><strong>Remaining Points:</strong> ${remainingPoints}</p>
        </div>
        <div style="background: #fff5f5; border: 1px solid #fed7d7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #c53030; margin: 0; font-size: 14px;">
            <strong>How to redeem:</strong> Show this email or your loyalty card to any Nomu Cafe barista to claim your reward!
          </p>
        </div>
        <p style="color: #4a5568; margin: 20px 0;">Thank you for being a loyal customer. Enjoy your reward!</p>
        <hr style="margin: 20px 0;">
        <p style="color: #718096; font-size: 12px;">Nomu Cafe - Your Coffee Journey Continues</p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: `"Nomu Cafe Rewards" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: subject,
    html: htmlContent
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ [REWARD EMAIL] Email sent successfully to: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ [REWARD EMAIL] Email sending error:', error);
    return false;
  }
}

// Send welcome/success email function
async function sendWelcomeEmail(email, name) {
  try {
    const mailOptions = {
      from: `"Nomu Cafe" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Nomu Cafe! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to Nomu Cafe!</h1>
            <p style="color: white; margin: 10px 0; font-size: 16px;">Your account has been successfully created</p>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Hello ${name}! 👋</h2>
            <p style="color: #666; text-align: center; margin-bottom: 20px; line-height: 1.6;">
              Thank you for joining Nomu Cafe! Your account has been successfully created and verified.
            </p>
            <div style="background: #fff; border: 2px solid #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
              <h3 style="color: #667eea; margin: 0 0 15px 0;">What's Next?</h3>
              <ul style="color: #666; text-align: left; margin: 0; padding-left: 20px;">
                <li>🎯 Start earning loyalty points with every purchase</li>
                <li>☕ Explore our delicious menu</li>
                <li>🎁 Unlock exclusive rewards and offers</li>
              </ul>
            </div>
            <p style="color: #666; text-align: center; margin-bottom: 20px; line-height: 1.6;">
              We're excited to have you as part of our community! If you have any questions, feel free to reach out to our support team.
            </p>
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #999; font-size: 14px;">Best regards,<br>The Nomu Cafe Team</p>
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent successfully to: ${email}`);
    return true;
  } catch (error) {
    console.error('Welcome email sending error:', error);
    return false;
  }
}

// Send password change confirmation email
async function sendPasswordChangeEmail(email, name) {
  try {
    const mailOptions = {
      from: `"Nomu Cafe Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔒 Password Changed Successfully - Nomu Cafe',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🔒 Password Updated!</h1>
            <p style="color: white; margin: 10px 0; font-size: 16px;">Your password has been successfully changed</p>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Hello ${name}! 👋</h2>
            <p style="color: #666; text-align: center; margin-bottom: 20px; line-height: 1.6;">
              We're writing to confirm that your Nomu Cafe account password was successfully changed.
            </p>
            <div style="background: #fff; border: 2px solid #28a745; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
              <h3 style="color: #28a745; margin: 0 0 15px 0;">✅ Password Change Confirmed</h3>
              <p style="color: #666; margin: 0; line-height: 1.6;">
                <strong>Time:</strong> ${new Date().toLocaleString()}<br>
                <strong>Status:</strong> Successfully Updated<br>
                <strong>Account:</strong> ${email}
              </p>
            </div>
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h4 style="color: #856404; margin: 0 0 15px 0;">🔐 Security Reminder</h4>
              <ul style="color: #856404; margin: 0; padding-left: 20px; text-align: left;">
                <li>Keep your new password secure and don't share it</li>
                <li>Use a strong, unique password</li>
                <li>If you didn't make this change, contact support immediately</li>
              </ul>
            </div>
            <p style="color: #666; text-align: center; margin-bottom: 20px; line-height: 1.6;">
              Your account security is important to us. If you have any questions or concerns, please don't hesitate to contact our support team.
            </p>
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #999; font-size: 14px;">Best regards,<br>The Nomu Cafe Security Team</p>
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password change confirmation email sent successfully to: ${email}`);
    return true;
  } catch (error) {
    console.error('Password change email sending error:', error);
    return false;
  }
}

// Send password reset confirmation email
async function sendPasswordResetEmail(email, name) {
  try {
    const mailOptions = {
      from: `"Nomu Cafe Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔓 Password Reset Successfully - Nomu Cafe',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #17a2b8 0%, #6f42c1 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🔓 Password Reset!</h1>
            <p style="color: white; margin: 10px 0; font-size: 16px;">Your password has been successfully reset</p>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Hello ${name}! 👋</h2>
            <p style="color: #666; text-align: center; margin-bottom: 20px; line-height: 1.6;">
              We're writing to confirm that your Nomu Cafe account password was successfully reset.
            </p>
            <div style="background: #fff; border: 2px solid #17a2b8; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
              <h3 style="color: #17a2b8; margin: 0 0 15px 0;">✅ Password Reset Confirmed</h3>
              <p style="color: #666; margin: 0; line-height: 1.6;">
                <strong>Time:</strong> ${new Date().toLocaleString()}<br>
                <strong>Status:</strong> Successfully Reset<br>
                <strong>Account:</strong> ${email}
              </p>
            </div>
            <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h4 style="color: #0c5460; margin: 0 0 15px 0;">🔐 Security Reminder</h4>
              <ul style="color: #0c5460; margin: 0; padding-left: 20px; text-align: left;">
                <li>Your new password is now active</li>
                <li>Keep your new password secure and don't share it</li>
                <li>Use a strong, unique password</li>
                <li>If you didn't request this reset, contact support immediately</li>
              </ul>
            </div>
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h4 style="color: #856404; margin: 0 0 15px 0;">⚠️ Important Notice</h4>
              <p style="color: #856404; margin: 0; line-height: 1.6;">
                For security reasons, we recommend changing your password again after logging in, 
                especially if you suspect your account may have been compromised.
              </p>
            </div>
            <p style="color: #666; text-align: center; margin-bottom: 20px; line-height: 1.6;">
              Your account security is important to us. If you have any questions or concerns, please don't hesitate to contact our support team.
            </p>
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #999; font-size: 14px;">Best regards,<br>The Nomu Cafe Security Team</p>
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset confirmation email sent successfully to: ${email}`);
    return true;
  } catch (error) {
    console.error('Password reset email sending error:', error);
    return false;
  }
}


// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// GridFS instances
let gfs;
let profileGfs;

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✅ Connected to MongoDB');
    // Initialize GridFS
    gfs = Grid(mongoose.connection.db, mongoose.mongo);
    gfs.collection('promo_images');
    console.log('✅ GridFS initialized for promo images');
    
    // Initialize GridFS for profile pictures
    profileGfs = Grid(mongoose.connection.db, mongoose.mongo);
    profileGfs.collection('profile_images');
    console.log('✅ GridFS initialized for profile pictures');
    
    // Initialize GridFS storage for multer
    initializeGridFSStorage();
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  fullName: String,
  username: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true },
  role: { 
    type: String, 
    enum: ['Customer', 'admin', 'super_admin'],
    default: 'Customer' 
  },
  source: {
    type: String,
    enum: ['web', 'mobile'],
    default: 'web'
  },
  birthday: String,
  gender: { type: String, default: 'male' },
  employmentStatus: { type: String, default: 'Prefer not to say' },
  profilePicture: String,
  password: String,
  points: { type: Number, default: 0 },
  currentCycle: { type: Number, default: 1 },
  reviewPoints: { type: Number, default: 0 },
  lastOrder: { type: String, default: '' },
  qrToken: String,
  pastOrders: [
    {
      orderId: String, // Unique identifier for this order
      items: [
        {
          itemName: String,
          itemType: String, // 'drink', 'food', 'pastry', 'pizza', 'pasta', 'calzone', 'donut'
          category: String, // More specific category like 'coffee', 'milk_tea', 'pizza', 'croissant', etc.
          price: Number,
          quantity: { type: Number, default: 1 }
        }
      ],
      totalPrice: Number,
      date: { type: Date, default: Date.now }
    }
  ],
  rewardsHistory: [
    {
      type: String,
      description: String,
      date: { type: Date, default: Date.now },
      cycle: Number
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  __v: { type: Number, default: 0 }
}); // Using explicit createdAt and updatedAt fields

// Pre-save middleware to update updatedAt field and validate required fields
userSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  
  // Ensure username is never null or empty
  if (this.username === null || this.username === undefined || this.username === '') {
    return next(new Error('Username cannot be null, undefined, or empty'));
  }
  
  // Ensure email is never null or empty
  if (this.email === null || this.email === undefined || this.email === '') {
    return next(new Error('Email cannot be null, undefined, or empty'));
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(this.email)) {
    return next(new Error('Invalid email format'));
  }
  
  next();
});

const User = mongoose.model('User', userSchema);


// Customer collection removed - using only User collection

// Chat Schema
const chatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  messages: [
    {
      sender: String, // 'user' or 'ai'
      text: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const Chat = mongoose.model('Chat', chatSchema);

// RewardClaim model for reward history
const rewardClaimSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: String, // 'donut' or 'coffee'
  description: String,
  date: { type: Date, default: Date.now },
  cycle: { type: Number, default: 0 }, // Track which cycle this reward was claimed in
  pointsAtClaim: { type: Number, default: 0 } // Track points at the time of claim
});
const RewardClaim = mongoose.model('RewardClaim', rewardClaimSchema);

// Promo Schema
const promoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  promoType: { type: String, required: true },
  discountValue: { type: Number, required: true },
  minOrderAmount: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  usageLimit: { type: Number, required: true },
  status: { type: String, enum: ['Active', 'Inactive', 'Expired'], default: 'Active' },
  imageUrl: { type: String }, // Keep for backward compatibility
  imageId: { type: String }, // GridFS file ID
  imageFilename: { type: String }, // GridFS filename
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Promo = mongoose.model('Promo', promoSchema);

// Rewards Schema for dynamic reward banners
const rewardsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  pointsRequired: { type: Number, required: true },
  rewardType: { type: String, required: true, enum: ['donut', 'coffee', 'pastry', 'special'] },
  bannerColor: { type: String, default: '#FFD700' }, // Hex color for banner background
  iconName: { type: String, default: 'emoji_events' }, // Material icon name
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 0 }, // Higher number = higher priority
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  maxClaimsPerUser: { type: Number, default: 1 }, // How many times a user can claim this reward
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Rewards = mongoose.model('Rewards', rewardsSchema);

// Create indexes for better query performance
Promo.createIndexes([
  { status: 1, isActive: 1, startDate: 1, endDate: 1 }, // Compound index for active promo queries
  { createdAt: -1 }, // Index for sorting by creation date
  { status: 1 }, // Index for status filtering
  { isActive: 1 } // Index for active filtering
]).catch(err => console.log('Index creation warning:', err.message));

// Multer setup for profile pictures using GridFS
const { GridFsStorage } = require('multer-gridfs-storage');

// Initialize GridFS storage after MongoDB connection
let storage;

// Function to initialize GridFS storage
function initializeGridFSStorage() {
  if (mongoose.connection.readyState === 1) {
    storage = new GridFsStorage({
      db: mongoose.connection,
      file: (req, file) => {
        return {
          bucketName: 'profile_images',
          filename: `avatar_${req.params.id}_${Date.now()}_${file.originalname}`,
          metadata: {
            userId: req.params.id,
            originalName: file.originalname,
            uploadDate: new Date(),
            contentType: file.mimetype
          }
        };
      }
    });
    
    // Create GridFS multer configuration
    profileGridFSUpload = multer({
      storage: storage,
      fileFilter: profileFileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1 // Only one file at a time
      }
    });
    
    console.log('✅ GridFS storage and multer configuration initialized for profile images');
  } else {
    console.log('⚠️ MongoDB not connected, GridFS storage will be initialized later');
  }
}

// GridFS storage for promo images
const promoStorage = new GridFsStorage({
  db: mongoose.connection,
  file: (req, file) => {
    return {
      bucketName: 'promo_images',
      filename: `promo_${req.params.id}_${Date.now()}_${file.originalname}`,
      metadata: {
        promoId: req.params.id,
        originalName: file.originalname,
        uploadDate: new Date(),
        contentType: file.mimetype
      }
    };
  }
});

// GridFS storage for generic image uploads
const genericImageStorage = new GridFsStorage({
  db: mongoose.connection,
  file: (req, file) => {
    const imageType = req.body.imageType || 'unknown';
    // Use profile_pictures collection for profile images to match existing setup
    const bucketName = imageType === 'profile' ? 'profile_pictures' : `${imageType}_images`;
    
    console.log('✅ [GRIDFS STORAGE] File configuration:', {
      imageType: imageType,
      bucketName: bucketName,
      originalname: file.originalname,
      mimetype: file.mimetype
    });
    
    return {
      bucketName: bucketName,
      filename: `${imageType}_${Date.now()}_${file.originalname}`,
      metadata: {
        imageType: imageType,
        originalName: file.originalname,
        uploadDate: new Date(),
        contentType: file.mimetype
      }
    };
  }
});

// Simplified file validation for GridFS
function validateImageFile(buffer, originalname, req = null) {
  try {
    // Basic file size check (10MB max for all images)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (buffer.length > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      return { 
        isValid: false, 
        error: `File too large. Maximum size is ${maxSizeMB}MB` 
      };
    }

    // Check file extension
    const allowedExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif', 
      '.svg', '.ico', '.icon', '.avif', '.heic', '.heif', '.xbm', '.xpm', 
      '.ppm', '.pgm', '.pbm', '.pnm', '.pcx', '.tga', '.psd', '.raw', 
      '.cr2', '.nef', '.orf', '.sr2', '.arw', '.dng', '.rw2', '.pef', 
      '.srw', '.3fr', '.mef', '.mos', '.mrw', '.raf', '.x3f', '.dcr', 
      '.kdc', '.erf', '.mdc', '.nrw'
    ];
    
    const fileExtension = originalname.toLowerCase().substring(originalname.lastIndexOf('.'));
    
    // For profile pictures, be more lenient with file types
    if (!allowedExtensions.includes(fileExtension)) {
      // Check if it's a profile picture upload by checking the request context
      const isProfileUpload = req && req.body && req.body.imageType === 'profile';
      
      if (isProfileUpload) {
        console.log('⚠️ [PROFILE UPLOAD] Unsupported file type, but allowing for profile picture:', fileExtension);
        // Allow unsupported file types for profile pictures but add a warning
        return { 
          isValid: true, 
          fileType: fileExtension,
          warning: `Unsupported file type (${fileExtension}) uploaded as profile picture. This may not display properly in all browsers. Consider using JPEG or PNG for better compatibility.`
        };
      } else {
        return { 
          isValid: false, 
          error: `Unsupported file type: ${fileExtension}. Supported types: JPEG, PNG, GIF, WebP, BMP, TIFF, SVG, ICO, AVIF, HEIC, HEIF, and various RAW formats.` 
        };
      }
    }

    // Generate warning for formats that may need conversion
    let warning = null;
    const rawFormats = ['.raw', '.cr2', '.nef', '.orf', '.sr2', '.arw', '.dng', '.rw2', '.pef', '.srw', '.3fr', '.mef', '.mos', '.mrw', '.raf', '.x3f', '.dcr', '.kdc', '.erf', '.mdc', '.nrw'];
    const heicFormats = ['.heic', '.heif'];
    const legacyFormats = ['.xbm', '.xpm', '.ppm', '.pgm', '.pbm', '.pnm', '.pcx', '.tga', '.psd'];
    
    if (rawFormats.includes(fileExtension)) {
      warning = `RAW camera file (${fileExtension}) uploaded. This format cannot be directly displayed in web browsers and may not appear as your profile picture without server-side conversion.`;
    } else if (heicFormats.includes(fileExtension)) {
      warning = `Modern image format (${fileExtension}) uploaded. This may not display properly in all web browsers or older devices. Consider using JPEG or PNG for broader compatibility.`;
    } else if (legacyFormats.includes(fileExtension)) {
      warning = `Legacy image format (${fileExtension}) uploaded. This format may not be fully supported across all platforms. Consider using JPEG or PNG for better compatibility.`;
    }

    return { 
      isValid: true, 
      fileType: fileExtension,
      warning: warning
    };

  } catch (error) {
    console.error('❌ [FILE VALIDATION] Error:', error);
    return { isValid: false, error: 'File validation failed' };
  }
}

// File filter to accept all common image types
const fileFilter = (req, file, cb) => {
  // Basic MIME type check first
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    console.log(`❌ [MULTER] File is not an image: ${file.mimetype}`);
    cb(new Error('Only image files are allowed.'), false);
  }
};

// File filter for profile pictures - accepts ANY file type
const profileFileFilter = (req, file, cb) => {
  console.log(`✅ [PROFILE MULTER] Accepting file: ${file.originalname} (${file.mimetype})`);
  cb(null, true); // Accept all files
};

// Multer configuration with file size limit and type validation
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only one file at a time
  }
});

// Regular file storage for profile pictures (no GridFS)
const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile_${uniqueSuffix}_${file.originalname}`);
  }
});

// Multer configuration for profile pictures - accepts ANY file type
const profileUpload = multer({ 
  storage: profileStorage, // Use regular file storage as fallback
  fileFilter: profileFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only one file at a time
  }
});

// GridFS multer configuration (will be initialized after MongoDB connection)
let profileGridFSUpload;

// Storage for promo images (using regular file storage for now)
const promoImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads', 'promos'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    cb(null, `promo_${timestamp}${ext}`);
  },
});

// Multer configuration for promo images
const promoImageUpload = multer({
  storage: promoImageStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  }
});

// Multer configuration for promo images using GridFS
const promoGridFSUpload = multer({
  storage: promoStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  }
});

// Multer configuration for generic image uploads using GridFS
const genericImageUpload = multer({
  storage: genericImageStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only one file at a time
  }
});

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Nomu Cafe API is running',
    cors: 'enabled',
    gridfs: {
      profile: profileGfs ? 'initialized' : 'not initialized',
      promo: gfs ? 'initialized' : 'not initialized'
    },
    upload: {
      genericImageUpload: 'configured',
      profilePictureUpload: 'configured'
    }
  });
});

// Test upload endpoint for debugging
app.post('/api/test-upload', (req, res) => {
  res.json({
    success: true,
    message: 'Test upload endpoint working',
    timestamp: new Date().toISOString()
  });
});

// Test profile picture upload endpoint (no validation)
app.post('/api/test-profile-upload', profileUpload.single('profilePicture'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    res.json({
      success: true,
      message: 'Profile picture upload test successful',
      file: {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        id: req.file.id
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to test GridFS connection
app.get('/api/debug/gridfs', async (req, res) => {
  try {
    const profileFiles = await profileGfs.files.find().toArray();
    const promoFiles = await gfs.files.find().toArray();
    
    res.json({
      success: true,
      profileGfs: {
        initialized: !!profileGfs,
        filesCount: profileFiles.length,
        sampleFiles: profileFiles.slice(0, 3).map(f => ({
          id: f._id,
          filename: f.filename,
          uploadDate: f.uploadDate
        }))
      },
      promoGfs: {
        initialized: !!gfs,
        filesCount: promoFiles.length,
        sampleFiles: promoFiles.slice(0, 3).map(f => ({
          id: f._id,
          filename: f.filename,
          uploadDate: f.uploadDate
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear promo cache endpoint (for development)
app.post('/api/clear-cache', (req, res) => {
  promoCache.data = null;
  promoCache.timestamp = null;
  console.log('🧹 [CACHE] Promo cache cleared');
  res.json({ 
    success: true, 
    message: 'Cache cleared successfully',
    timestamp: new Date().toISOString()
  });
});

// Mobile-specific analytics endpoints
app.get('/api/analytics/mobile-stats', async (req, res) => {
  try {
    // Count mobile-created users
    const mobileCustomers = await User.countDocuments({ 
      role: 'Customer',
      source: 'mobile'
    });
    
    const webCustomers = await User.countDocuments({ 
      role: 'Customer',
      source: 'web'
    });
    
    const totalCustomers = mobileCustomers + webCustomers;
    
    // Get recent mobile signups (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentMobileSignups = await User.countDocuments({
      role: 'Customer',
      source: 'mobile',
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    const recentWebSignups = await User.countDocuments({
      role: 'Customer',
      source: 'web',
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    res.json({
      mobileCustomers,
      webCustomers,
      totalCustomers,
      recentMobileSignups,
      recentWebSignups,
      recentTotalSignups: recentMobileSignups + recentWebSignups
    });
  } catch (error) {
    console.error('❌ Mobile stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Dashboard stats endpoint with source breakdown
app.get('/api/analytics/dashboard-stats', async (req, res) => {
  try {
    const totalCustomers = await User.countDocuments({ role: 'Customer' });
    const mobileCustomers = await User.countDocuments({ role: 'Customer', source: 'mobile' });
    const webCustomers = await User.countDocuments({ role: 'Customer', source: 'web' });
    
    // Get this month's new customers
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const newCustomersThisMonth = await User.countDocuments({
      role: 'Customer',
      createdAt: { $gte: startOfMonth }
    });
    
    const newMobileCustomersThisMonth = await User.countDocuments({
      role: 'Customer',
      source: 'mobile',
      createdAt: { $gte: startOfMonth }
    });
    
    const newWebCustomersThisMonth = await User.countDocuments({
      role: 'Customer',
      source: 'web',
      createdAt: { $gte: startOfMonth }
    });
    
    res.json({
      totalCustomers,
      mobileCustomers,
      webCustomers,
      newCustomersThisMonth,
      newMobileCustomersThisMonth,
      newWebCustomersThisMonth
    });
  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recent activities endpoint
app.get('/api/analytics/recent-activities', async (req, res) => {
  try {
    const { limit = 50, entityType, source, since } = req.query;
    
    const options = {
      limit: parseInt(limit),
      entityType,
      source,
      since: since ? new Date(since) : undefined
    };
    
    const activities = await ActivityService.getRecentActivities(options);
    res.json(activities);
  } catch (error) {
    console.error('❌ Recent activities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register without Firebase email verification check
app.post('/api/register', async (req, res) => {
  try {
    
    // Support both PascalCase and camelCase field names for compatibility
    const email = req.body.email || req.body.Email;
    const username = req.body.username || req.body.Username;
    const password = req.body.password || req.body.Password;
    const fullName = req.body.fullName || req.body.FullName || req.body.fullname;
    const birthday = req.body.birthday || req.body.Birthday;
    const gender = req.body.gender || req.body.Gender;
    const employmentStatus = req.body.employmentStatus || req.body.EmploymentStatus;
    const role = req.body.role || req.body.Role || req.body.userType || 'Customer';
    const source = req.body.source || req.body.Source || 'web';


    // Validate required fields
    if (!email || !username || !password || !fullName) {
      console.log('❌ Missing required fields');
      console.log('❌ email:', email, 'username:', username, 'password:', password, 'fullName:', fullName);
      return res.status(400).json({ error: 'Missing required fields: email, username, password, fullName' });
    }

    // Additional validation for username
    if (username === null || username === undefined || username.trim() === '') {
      console.log('❌ Invalid username:', username);
      return res.status(400).json({ error: 'Username cannot be null, undefined, or empty' });
    }

    // Additional validation for email
    if (email === null || email === undefined || email.trim() === '') {
      console.log('❌ Invalid email:', email);
      return res.status(400).json({ error: 'Email cannot be null, undefined, or empty' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format:', email);
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check for existing email or username
    const existingEmail = await User.findOne({ email });
    const existingUsername = await User.findOne({ username });
    if (existingEmail) return res.status(400).json({ error: 'Email already in use' });
    if (existingUsername) return res.status(400).json({ error: 'Username already taken' });

    // Hash password
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, bcryptRounds);

    // Create user with all required fields and defaults
    const user = new User({
      fullName: fullName || '',
      username: username,
      email: email,
      birthday: birthday || '',
      gender: gender || '',
      employmentStatus: employmentStatus || 'Prefer not to say',
      role: role || 'Customer',
      source: source || 'web',
      password: hashedPassword,
      qrToken: '', // Will be set after user creation
      points: 0,
      reviewPoints: 0,
      lastOrder: '',
      pastOrders: [],
      profilePicture: '',
      rewardsHistory: [],
    });

    await user.save();
    
    // Generate JWT-based QR token after user creation
    user.qrToken = generateQrToken(user._id);
    await user.save();
    
    // Log user registration activity
    try {
      await ActivityService.logUserRegistration(user, source);
    } catch (error) {
      console.error('⚠️ Failed to log registration activity:', error.message);
      // Continue even if activity logging fails
    }
    
    // Emit registration success
    io.emit('user_registered', { email: email, success: true });
    
    // Emit updated customer stats
    try {
      const totalCustomers = await User.countDocuments({ role: 'Customer' });
      const mobileCustomers = await User.countDocuments({ role: 'Customer', source: 'mobile' });
      const webCustomers = await User.countDocuments({ role: 'Customer', source: 'web' });
      
      io.emit('customer_stats_updated', {
        totalCustomers,
        mobileCustomers,
        webCustomers,
        newCustomer: {
          id: user._id,
          fullName: user.fullName,
          source: user.source,
          timestamp: new Date()
        }
      });
      
      // Send notification to admin dashboard
      const notification = {
        type: 'new_customer',
        message: `New customer registered via ${source} app: ${user.fullName}`,
        timestamp: new Date(),
        source: source,
        customerId: user._id,
        customerName: user.fullName
      };
      
      io.emit('admin_notification', notification);
    } catch (error) {
      console.error('⚠️ Failed to emit customer stats update:', error.message);
    }
    
    res.status(201).json({ 
      message: '✅ User registered successfully',
      userId: user._id,
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        birthday: user.birthday,
        gender: user.gender,
        employmentStatus: user.employmentStatus,
        role: user.role,
        source: user.source,
        qrToken: user.qrToken,
        points: user.points,
        reviewPoints: user.reviewPoints,
        lastOrder: user.lastOrder,
        pastOrders: user.pastOrders,
        profilePicture: user.profilePicture,
        rewardsHistory: user.rewardsHistory,
        createdAt: user.createdAt,
      }
    });
  } catch (err) {
    console.error('❌ Register error:', err);
    console.error('❌ Register error stack:', err.stack);
    console.error('❌ Register error message:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Helper function to handle user login
async function handleUserLogin(user, password, res) {
  console.log('✅ User found:', { 
    id: user._id, 
    fullName: user.fullName, 
    username: user.username, 
    email: user.email,
    role: user.role,
    points: user.points,
    reviewPoints: user.reviewPoints,
    hasPassword: !!user.password,
    passwordLength: user.password ? user.password.length : 0
  });

  // Check if user has a password
  if (!user.password) {
    console.log('❌ User has no password stored:', user.email);
    return res.status(401).json({ message: 'Invalid credentials - no password stored' });
  }

  console.log('🔐 Attempting password verification...');
  const isMatch = await bcrypt.compare(password, user.password);
  
  if (!isMatch) {
    console.log('❌ Password mismatch for user:', user.email);
    
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  console.log('✅ Password verified for user:', user.email);

  // Generate JWT token
  const token = jwt.sign(
    { 
      userId: user._id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '24h' }
  );

  console.log('🎫 JWT token generated successfully');

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
      points: user.points,
      reviewPoints: user.reviewPoints,
      qrToken: user.qrToken,
      profilePicture: user.profilePicture,
      lastOrder: user.lastOrder,
      pastOrders: user.pastOrders,
      rewardsHistory: user.rewardsHistory
    }
  });
}

// Login endpoint (without OTP) - with special rate limiting
app.post('/api/user/login', async (req, res) => {
  console.log('🔐 Login request body:', req.body);
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ Missing email or password in request');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email (camelCase field matching)
    const user = await User.findOne({ email: email });
    
    if (!user) {
      console.log('❌ User not found for email:', email);
      
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('✅ User found:', { 
      id: user._id, 
      fullName: user.fullName, 
      username: user.username, 
      email: user.email,
      role: user.role,
      points: user.points,
      reviewPoints: user.reviewPoints,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0
    });

    // Check if user has a password
    if (!user.password) {
      console.log('❌ User has no password stored:', email);
      return res.status(401).json({ message: 'Invalid credentials - no password stored' });
    }

    console.log('🔐 Attempting password verification...');
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log('❌ Password mismatch for user:', email);
      
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('✅ Password verified for user:', email);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role,
        username: user.username 
      },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '24h' }
    );

    // Explicitly select the fields we want to return
    const userData = {
      _id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      birthday: user.birthday,
      gender: user.gender,
      employmentStatus: user.employmentStatus,
      role: user.role,
      qrToken: user.qrToken,
      points: user.points,
      reviewPoints: user.reviewPoints,
      lastOrder: user.lastOrder,
      pastOrders: user.pastOrders,
      profilePicture: user.profilePicture,
      rewardsHistory: user.rewardsHistory,
      createdAt: user.createdAt
    };
    
    console.log('🎉 Login successful for user:', email);
    console.log('📤 Sending user data:', userData);
    
    res.json({
      message: 'Login successful',
      token,
      user: userData
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: err.message });
  }
});



// Request new OTP endpoint
app.post('/api/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check cooldown
    const storedData = otpStore.get(email);
    if (storedData && Date.now() < storedData.cooldownUntil) {
      const remainingTime = Math.ceil((storedData.cooldownUntil - Date.now()) / 1000);
      return res.status(429).json({ 
        error: `Please wait ${remainingTime} seconds before requesting another OTP` 
      });
    }

    const otp = generateOTP();
    const now = Date.now();
    otpStore.set(email, {
      otp,
      expiresAt: now + 5 * 60 * 1000, // valid 5 minutes
      cooldownUntil: now + 60 * 1000, // 1 minute cooldown
    });

    // Send email
    const emailSent = await sendOTPEmail(email, otp);
    
    if (emailSent) {
      // Emit to connected clients
      io.emit('otp_sent', { email, success: true });
      res.json({ message: 'OTP sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send OTP email' });
    }
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user info by username
app.get('/api/user/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get QR code token by user ID
app.get('/api/user/:id/qrcode', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('qrToken');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ qrToken: user.qrToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get user by QR token (ensure rewardsHistory is included)
app.get('/api/user/qr/:qrToken', async (req, res) => {
  try {
    const user = await User.findOne({ qrToken: req.params.qrToken }); // No .select('-password')
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user info
app.patch('/api/user/:id', async (req, res) => {
  try {
    const updates = req.body;
    delete updates.password;
    console.log('PATCH /api/user/:id', req.params.id, updates);
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true, context: 'query' }
    ).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Middleware to choose between GridFS and regular file storage
const profileUploadMiddleware = (req, res, next) => {
  if (profileGridFSUpload) {
    // Use GridFS if available
    profileGridFSUpload.single('profilePicture')(req, res, next);
  } else {
    // Fall back to regular file storage
    profileUpload.single('profilePicture')(req, res, next);
  }
};

// Upload profile picture using multer with GridFS (supports all file types)
app.post('/api/user/:id/profile-picture', profileUploadMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if file was uploaded
    if (!req.file) {
      console.log('❌ [PROFILE PICTURE] No file uploaded');
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Find the user first
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ [PROFILE PICTURE] User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    // Skip validation completely for profile pictures - allow any file type
    const fileBuffer = req.file.buffer;
    console.log('✅ [PROFILE PICTURE] Skipping validation - allowing any file type:', {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // File validation skipped - any file type allowed

    // Delete old profile picture if it exists (both file path and GridFS)
    if (user.profilePicture) {
      if (user.profilePicture.startsWith('/uploads/')) {
        // Old file system storage - try to delete
        const oldFilePath = path.join(__dirname, user.profilePicture);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
            console.log('🗑️ [PROFILE PICTURE] Deleted old file system profile picture:', oldFilePath);
          } catch (deleteError) {
            console.log('⚠️ [PROFILE PICTURE] Could not delete old file:', deleteError.message);
          }
        }
      } else if (user.profilePicture.startsWith('/api/images/profile/')) {
        // Old GridFS storage - try to delete from GridFS
        try {
          const oldFileId = user.profilePicture.split('/').pop();
          await profileGfs.remove({ _id: oldFileId });
          console.log('🗑️ [PROFILE PICTURE] Deleted old GridFS profile picture:', oldFileId);
        } catch (deleteError) {
          console.log('⚠️ [PROFILE PICTURE] Could not delete old GridFS file:', deleteError.message);
        }
      }
    }

    // Determine storage type and generate appropriate URL
    let fileUrl;
    let storageType;
    
    if (req.file.id) {
      // GridFS storage
      fileUrl = `/api/images/profile/${req.file.id}`;
      storageType = 'GridFS';
      console.log('✅ [PROFILE PICTURE] Using GridFS storage');
    } else {
      // Regular file storage
      fileUrl = `/uploads/${req.file.filename}`;
      storageType = 'File System';
      console.log('✅ [PROFILE PICTURE] Using file system storage');
    }

    await User.updateOne(
      { _id: userId },
      { 
        profilePicture: fileUrl,
        updatedAt: new Date()
      }
    );

    console.log(`✅ [PROFILE PICTURE] Profile picture saved to ${storageType} successfully`);
    console.log('✅ [PROFILE PICTURE] File URL:', fileUrl);

    const responseData = { 
      success: true, 
      message: 'Profile picture updated successfully',
      profilePicture: fileUrl,
      fileInfo: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        filename: req.file.filename
      }
    };

    // Add GridFS-specific info if available
    if (req.file.id) {
      responseData.fileInfo.imageId = req.file.id;
      responseData.fileInfo.bucketName = req.file.bucketName;
    }

    res.json(responseData);
    
  } catch (error) {
    console.error('❌ [PROFILE PICTURE] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Legacy base64 upload endpoint (for backward compatibility)
app.post('/api/user/:id/profile-picture-base64', async (req, res) => {
  try {
    const { image } = req.body;
    const userId = req.params.id;
    
    if (!image) {
      console.log('❌ [PROFILE PICTURE] No image provided');
      return res.status(400).json({ error: 'No image provided' });
    }

    // Find the user first
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ [PROFILE PICTURE] User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    // Extract base64 data and determine file extension
    let base64Data;
    let fileExtension = 'png'; // default
    
    if (image.startsWith('data:')) {
      // Extract base64 data from data URL
      const matches = image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
      if (matches) {
        fileExtension = matches[1]; // jpeg, png, etc.
        base64Data = matches[2];
      } else {
        console.log('❌ [PROFILE PICTURE] Invalid data URL format');
        return res.status(400).json({ error: 'Invalid image format' });
      }
    } else {
      // Assume raw base64 data
      base64Data = image;
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `avatar_${userId}_${timestamp}.${fileExtension}`;
    const filePath = path.join(__dirname, 'uploads', filename);

    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Convert base64 to buffer and save file
    const imageBuffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, imageBuffer);

    // Delete old profile picture if it exists and is a file path
    if (user.profilePicture && user.profilePicture.startsWith('/uploads/')) {
      const oldFilePath = path.join(__dirname, user.profilePicture);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
          console.log('🗑️ [PROFILE PICTURE] Deleted old profile picture:', oldFilePath);
        } catch (deleteError) {
          console.log('⚠️ [PROFILE PICTURE] Could not delete old file:', deleteError.message);
        }
      }
    }

    // Update user's profilePicture field with file path
    const fileUrl = `/uploads/${filename}`;
    await User.updateOne(
      { _id: userId },
      { 
        profilePicture: fileUrl,
        updatedAt: new Date()
      }
    );

    console.log('✅ [PROFILE PICTURE] Profile picture saved to:', filePath);
    console.log('✅ [PROFILE PICTURE] File URL:', fileUrl);

    res.json({ 
      success: true, 
      message: 'Profile picture updated successfully',
      profilePicture: fileUrl
    });
    
  } catch (error) {
    console.error('❌ [PROFILE PICTURE] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle CORS preflight for profile pictures
app.options('/api/profile-picture/:fileId', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).end();
});

// Serve profile picture from GridFS
app.get('/api/profile-picture/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    
    // Check if file exists in GridFS (use profileGfs for profile pictures)
    const file = await profileGfs.files.findOne({ _id: fileId });
    if (!file) {
      console.log('❌ [PROFILE PICTURE] File not found in GridFS:', fileId);
      return res.status(404).send('Profile picture not found');
    }

    // Set appropriate headers for cross-platform compatibility
    res.set('Content-Type', file.contentType || 'application/octet-stream');
    res.set('Content-Length', file.length);
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.set('Access-Control-Allow-Origin', '*'); // Allow cross-origin requests
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Create read stream from GridFS
    const readstream = profileGfs.createReadStream({ _id: fileId });
    
    readstream.on('error', (err) => {
      console.error('❌ [PROFILE PICTURE] Error reading from GridFS:', err);
      if (!res.headersSent) {
        res.status(500).send('Error reading profile picture');
      }
    });

    readstream.pipe(res);
    
  } catch (err) {
    console.error('❌ [PROFILE PICTURE] Error serving profile picture from GridFS:', err);
    res.status(500).send('Error retrieving profile picture');
  }
});

// Legacy endpoint for user-specific profile picture (backward compatibility)
app.get('/api/user/:id/profile-picture', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.profilePicture) return res.status(404).send('No profile picture');
    
    // Check if profile picture is a GridFS URL (new format)
    if (user.profilePicture.startsWith('/api/images/profile/')) {
      const fileId = user.profilePicture.split('/').pop();
      return res.redirect(`/api/images/profile/${fileId}`);
    }
    // Check if profile picture is a file path (old format)
    else if (user.profilePicture.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, user.profilePicture);
      if (fs.existsSync(filePath)) {
        // Serve the file directly
        res.sendFile(filePath);
      } else {
        console.log('❌ [PROFILE PICTURE] File not found:', filePath);
        return res.status(404).send('Profile picture file not found');
      }
    } 
    // Fallback for old base64 format (backward compatibility)
    else if (user.profilePicture.startsWith('data:')) {
      const matches = user.profilePicture.match(/^data:(.+);base64,(.*)$/);
      if (!matches) return res.status(400).send('Invalid image data');
      const contentType = matches[1];
      const base64Data = matches[2];
      const imgBuffer = Buffer.from(base64Data, 'base64');
      res.set('Content-Type', contentType);
      res.send(imgBuffer);
    } 
    // Invalid format
    else {
      return res.status(400).send('Invalid profile picture format');
    }
  } catch (err) {
    console.error('❌ [PROFILE PICTURE] Error serving profile picture:', err);
    res.status(500).send('Error retrieving profile picture');
  }
});

// ==================== GRIDFS IMAGE ENDPOINTS ====================

// Upload image (using regular file storage for profile pictures)
app.post('/api/images/upload', profileUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log('✅ [GRIDFS UPLOAD] File received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      id: req.file.id,
      bucketName: req.file.bucketName
    });

    const { imageType } = req.body;
    if (!imageType) {
      return res.status(400).json({ error: 'Image type is required' });
    }

    // Validate image type
    const validTypes = ['menu', 'promo', 'inventory', 'profile'];
    if (!validTypes.includes(imageType)) {
      return res.status(400).json({ error: 'Invalid image type. Must be one of: ' + validTypes.join(', ') });
    }

    // Validate the uploaded file
    const fileBuffer = req.file.buffer;
    console.log('✅ [GRIDFS UPLOAD] File buffer info:', {
      bufferLength: fileBuffer ? fileBuffer.length : 'undefined',
      hasBuffer: !!fileBuffer,
      imageType: imageType
    });
    
    // Skip validation for profile pictures - allow any file type
    if (imageType === 'profile') {
      console.log('✅ [UPLOAD] Skipping validation for profile picture - allowing any file type:', {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } else {
      // Validate other image types normally
      const validation = validateImageFile(fileBuffer, req.file.originalname, req);
      console.log('✅ [UPLOAD] Validation result:', {
        isValid: validation.isValid,
        error: validation.error,
        fileType: validation.fileType,
        warning: validation.warning
      });
      
      if (!validation.isValid) {
        console.log('❌ [UPLOAD] File validation failed:', validation.error);
        return res.status(400).json({ error: validation.error });
      }
    }

    // Generate file URL (using regular file storage)
    const imageUrl = `/uploads/${req.file.filename}`;

    console.log('✅ [UPLOAD] Upload successful, sending response:', {
      filename: req.file.filename,
      imageUrl: imageUrl
    });

    res.json({
      success: true,
      imageId: req.file.filename, // Use filename as ID for regular files
      imageUrl: imageUrl,
      fileInfo: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        filename: req.file.filename
      }
    });

  } catch (error) {
    console.error('❌ [GRIDFS UPLOAD] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle CORS preflight for generic images
app.options('/api/images/:imageType/:imageId', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).end();
});

// Serve image from GridFS by type and ID
app.get('/api/images/:imageType/:imageId', async (req, res) => {
  try {
    const { imageType, imageId } = req.params;
    
    // Validate image type
    const validTypes = ['menu', 'promo', 'inventory', 'profile'];
    if (!validTypes.includes(imageType)) {
      return res.status(400).json({ error: 'Invalid image type' });
    }

    // Use the appropriate GridFS instance based on image type
    const gfsInstance = imageType === 'profile' ? profileGfs : gfs;
    
    // Check if file exists in GridFS
    const file = await gfsInstance.files.findOne({ _id: imageId });
    if (!file) {
      console.log('❌ [GRIDFS IMAGE] File not found in GridFS:', imageId);
      return res.status(404).send('Image not found');
    }

    // Set appropriate headers for cross-platform compatibility
    res.set('Content-Type', file.contentType || 'application/octet-stream');
    res.set('Content-Length', file.length);
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.set('Access-Control-Allow-Origin', '*'); // Allow cross-origin requests
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Create read stream from GridFS
    const readstream = gfsInstance.createReadStream({ _id: imageId });
    
    readstream.on('error', (err) => {
      console.error('❌ [GRIDFS IMAGE] Error reading from GridFS:', err);
      if (!res.headersSent) {
        res.status(500).send('Error reading image');
      }
    });

    readstream.pipe(res);
    
  } catch (err) {
    console.error('❌ [GRIDFS IMAGE] Error serving image from GridFS:', err);
    res.status(500).send('Error retrieving image');
  }
});

// Delete image from GridFS
app.delete('/api/images/:imageType/:imageId', async (req, res) => {
  try {
    const { imageType, imageId } = req.params;
    
    // Validate image type
    const validTypes = ['menu', 'promo', 'inventory', 'profile'];
    if (!validTypes.includes(imageType)) {
      return res.status(400).json({ error: 'Invalid image type' });
    }

    // Check if file exists in GridFS
    const file = await gfs.files.findOne({ _id: imageId });
    if (!file) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete from GridFS
    await gfs.remove({ _id: imageId });
    
    console.log('✅ [GRIDFS DELETE] Image deleted successfully:', imageId);
    res.json({ success: true, message: 'Image deleted successfully' });
    
  } catch (err) {
    console.error('❌ [GRIDFS DELETE] Error deleting image:', err);
    res.status(500).json({ error: err.message });
  }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Update user by QR token (for reward reset)
app.patch('/api/user/qr/:qrToken', async (req, res) => {
  try {
    console.log('PATCH /api/user/qr/:qrToken', req.params.qrToken, req.body);
    const updates = req.body;
    delete updates.password;
    const user = await User.findOneAndUpdate(
      { qrToken: req.params.qrToken },
      { $set: updates },
      { new: true, runValidators: true, context: 'query' }
    ).select('-password');
    console.log('PATCH result:', user);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('PATCH error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Claim reward endpoint (add to RewardClaim collection)
app.post('/api/user/:id/claim-reward', async (req, res) => {
  try {
    const { type, description } = req.body;
    console.log(`Claiming reward: ${type} - ${description} for user ${req.params.id}`);
    
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Validate points and reward type
    if (user.points < 0) {
      return res.status(400).json({ error: 'Invalid points balance. Please contact support.' });
    }
    
    if (type === 'donut' && user.points < 5) {
      return res.status(400).json({ error: 'You need at least 5 points to claim a donut reward. You currently have ' + user.points + ' points.' });
    }
    if (type === 'coffee' && user.points < 10) {
      return res.status(400).json({ error: 'You need at least 10 points to claim a coffee reward. You currently have ' + user.points + ' points.' });
    }
    
    // Validate reward type
    if (!['donut', 'coffee'].includes(type)) {
      return res.status(400).json({ error: 'Invalid reward type. Must be either "donut" or "coffee".' });
    }
    
    // For donut rewards, no restrictions - unlimited claims
    if (type === 'donut') {
      console.log(`Donut claim - user has ${user.points} points, allowing unlimited claims`);
    }
    
    // Use current cycle from user data
    const currentCycle = user.currentCycle || 1;
    
    // Create the reward claim with proper timezone
    const now = new Date();
    const rewardClaim = await RewardClaim.create({
      userId: user._id,
      type,
      description,
      date: now,
      cycle: currentCycle,
      pointsAtClaim: user.points
    });
    
    console.log(`Reward claim created at: ${now.toISOString()} (${now.toLocaleString()})`);
    
    console.log(`Reward claim created: ${rewardClaim._id}`);
    
    // Add to user's rewardsHistory
    try {
      // Ensure rewardsHistory is an array
      if (!Array.isArray(user.rewardsHistory)) {
        console.log('Converting rewardsHistory from string to array');
        user.rewardsHistory = [];
      }
      
      user.rewardsHistory.push({
        type: type,
        description: description,
        date: now,
        cycle: currentCycle
      });
      
      // Keep only last 50 reward entries
      if (user.rewardsHistory.length > 50) {
        user.rewardsHistory = user.rewardsHistory.slice(-50);
      }
      
      console.log('Successfully added to rewardsHistory:', user.rewardsHistory[user.rewardsHistory.length - 1]);
    } catch (rewardsHistoryError) {
      console.error('Error adding to rewardsHistory:', rewardsHistoryError);
      // Continue with the claim even if rewardsHistory fails
    }
    
    // Deduct points based on reward type
    if (type === 'coffee') {
      user.points = 0; // Reset to 0 after claiming 10-point reward
      user.currentCycle = (user.currentCycle || 1) + 1; // Increment cycle
      console.log(`Reset points to 0 for coffee claim, cycle advanced to: ${user.currentCycle}`);
    } else if (type === 'donut') {
      // Don't deduct points for donut reward - let points continue accumulating
      console.log(`Donut reward claimed, points remain at: ${user.points}`);
    }
    
    await user.save();
    console.log(`User points updated to: ${user.points}`);
    
    // Send email notification for reward claim
    try {
      const emailSent = await sendRewardClaimEmail(
        user.email, 
        user.fullName, 
        type, 
        description, 
        user.points
      );
      
      if (emailSent) {
        console.log(`✅ [REWARD] Email notification sent to: ${user.email}`);
      } else {
        console.log(`⚠️ [REWARD] Failed to send email notification to: ${user.email}`);
      }
    } catch (emailError) {
      console.error('❌ [REWARD] Error sending email notification:', emailError);
      // Continue execution even if email fails
    }
    
    // Customer collection removed - using only User collection
    
    res.json({ 
      success: true, 
      rewardClaim: rewardClaim,
      newPoints: user.points 
    });
  } catch (err) {
    console.error('❌ [CLAIM REWARD] Error:', err);
    console.error('❌ [CLAIM REWARD] Error message:', err.message);
    console.error('❌ [CLAIM REWARD] Error stack:', err.stack);
    
    // Provide more specific error messages
    let errorMessage = err.message;
    if (err.message.includes('Cast to string failed')) {
      errorMessage = 'Database schema error. Please contact support.';
    } else if (err.message.includes('Cast to ObjectId failed')) {
      errorMessage = 'Invalid user ID. Please try again.';
    } else if (err.message.includes('validation failed')) {
      errorMessage = 'Invalid reward data. Please try again.';
    }
    
    res.status(500).json({ 
      success: false,
      error: errorMessage,
      details: err.message 
    });
  }
});

// Get reward claim history for a user
app.get('/api/user/:id/reward-history', async (req, res) => {
  try {
    const history = await RewardClaim.find({ userId: req.params.id }).sort({ date: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user data including current cycle
app.get('/api/user/:userId/data', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        points: user.points,
        currentCycle: user.currentCycle || 1,
        rewardsHistory: user.rewardsHistory || []
      }
    });
  } catch (err) {
    console.error('❌ [USER DATA] Error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// Get active rewards for banners
app.get('/api/rewards/active', async (req, res) => {
  try {
    const now = new Date();
    const activeRewards = await Rewards.find({
      status: 'Active',
      startDate: { $lte: now },
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: now } }
      ]
    }).sort({ pointsRequired: 1, priority: -1 }); // Sort by points required (ascending) then priority (descending)
    
    // Add default values for missing fields to match the expected schema
    const rewardsWithDefaults = activeRewards.map(reward => ({
      ...reward.toObject(),
      bannerColor: reward.bannerColor || '#FFD700', // Default gold color
      iconName: reward.iconName || 'emoji_events', // Default icon
      priority: reward.priority || 0 // Default priority
    }));
    
    console.log(`Found ${rewardsWithDefaults.length} active rewards`);
    res.json(rewardsWithDefaults);
  } catch (err) {
    console.error('Error fetching active rewards:', err);
    res.status(500).json({ error: err.message });
  }
});

// Simple in-memory cache for promos
let promoCache = {
  data: null,
  timestamp: null,
  ttl: 5 * 60 * 1000 // 5 minutes cache
};

// Get active promos only (OPTIMIZED VERSION) - Server-side filtering + Caching
app.get('/api/promos', async (req, res) => {
  try {
    const now = new Date();
    
    // Check cache first
    if (promoCache.data && promoCache.timestamp && 
        (now.getTime() - promoCache.timestamp.getTime()) < promoCache.ttl) {
      console.log('🎯 [PROMO] Serving from cache');
      return res.json({ 
        success: true, 
        promos: promoCache.data,
        count: promoCache.data.length,
        cached: true
      });
    }
    
    console.log('🎯 [PROMO] Fetching active promos from database...');
    
    // Clear cache to force fresh data
    promoCache.data = null;
    promoCache.timestamp = null;
    
    // Fetch active promos (relaxed date filtering for testing)
    const promos = await Promo.find({
      status: 'Active',
      isActive: true
      // Removed strict date filtering for testing with future dates
    }).select('title description promoType discountValue minOrderAmount startDate endDate imageUrl imageId imageFilename status isActive createdAt updatedAt').sort({ createdAt: -1 }).limit(10); // Limit to 10 most recent
    
    console.log(`🎯 [PROMO] Found ${promos.length} active promos (optimized query)`);
    
    // Update cache
    promoCache.data = promos;
    promoCache.timestamp = now;
    
    // Emit promo data to connected clients for real-time updates
    io.emit('promos_updated', { 
      success: true, 
      promos: promos,
      timestamp: now
    });
    
    res.json({ 
      success: true, 
      promos: promos,
      count: promos.length,
      cached: false
    });
  } catch (err) {
    console.error('❌ [PROMO] Error fetching active promos:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Get all promos WITH images (for admin purposes)
app.get('/api/promos/full', async (req, res) => {
  try {
    console.log('🎯 [PROMO] Fetching all promos (with images)...');
    const promos = await Promo.find({}).sort({ createdAt: -1 });
    
    console.log(`🎯 [PROMO] Found ${promos.length} total promos (with images)`);
    
    res.json({ 
      success: true, 
      promos: promos 
    });
  } catch (err) {
    console.error('❌ [PROMO] Error fetching full promos:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Upload promo image
app.post('/api/promo/:id/image', promoImageUpload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🎯 [PROMO IMAGE] Uploading image for promo:', id);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const promo = await Promo.findById(id);
    if (!promo) {
      return res.status(404).json({ error: 'Promo not found' });
    }
    
    // Update promo with file info
    promo.imageUrl = `/uploads/promos/${req.file.filename}`;
    promo.imageFilename = req.file.filename;
    await promo.save();
    
    console.log('✅ [PROMO IMAGE] Image uploaded:', req.file.filename);
    
    res.json({
      success: true,
      message: 'Promo image uploaded successfully',
      imageUrl: promo.imageUrl,
      filename: req.file.filename
    });
  } catch (err) {
    console.error('❌ [PROMO IMAGE] Error uploading promo image:', err);
    res.status(500).json({ error: err.message });
  }
});

// Upload promo image using GridFS
app.post('/api/promo/:id/image-gridfs', promoGridFSUpload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🎯 [PROMO GRIDFS] Uploading image for promo:', id);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Validate the uploaded file
    const fileBuffer = req.file.buffer;
    const validation = validateImageFile(fileBuffer, req.file.originalname);
    
    if (!validation.isValid) {
      console.log('❌ [PROMO GRIDFS] File validation failed:', validation.error);
      return res.status(400).json({ error: validation.error });
    }
    
    const promo = await Promo.findById(id);
    if (!promo) {
      return res.status(404).json({ error: 'Promo not found' });
    }

    // Delete old promo image if it exists (both file path and GridFS)
    if (promo.imageId) {
      try {
        await gfs.remove({ _id: promo.imageId });
        console.log('🗑️ [PROMO GRIDFS] Deleted old GridFS promo image:', promo.imageId);
      } catch (deleteError) {
        console.log('⚠️ [PROMO GRIDFS] Could not delete old GridFS file:', deleteError.message);
      }
    }
    
    // Update promo with GridFS file info
    const fileUrl = `/api/promo-image-gridfs/${req.file.id}`;
    promo.imageId = req.file.id;
    promo.imageUrl = fileUrl; // Keep for backward compatibility
    promo.imageFilename = req.file.filename;
    await promo.save();
    
    console.log('✅ [PROMO GRIDFS] Image uploaded to GridFS:', req.file.id);
    console.log('✅ [PROMO GRIDFS] GridFS URL:', fileUrl);
    
    res.json({
      success: true,
      message: 'Promo image uploaded successfully to GridFS',
      imageId: req.file.id,
      imageUrl: fileUrl,
      filename: req.file.filename
    });
  } catch (err) {
    console.error('❌ [PROMO GRIDFS] Error uploading promo image:', err);
    res.status(500).json({ error: err.message });
  }
});

// Serve promo image
app.get('/api/promo-image/:promoId', async (req, res) => {
  try {
    const { promoId } = req.params;
    console.log('🎯 [PROMO IMAGE] Fetching image for promo:', promoId);
    
    const promo = await Promo.findById(promoId);
    if (!promo) {
      console.log('❌ [PROMO IMAGE] Promo not found:', promoId);
      return res.status(404).json({ error: 'Promo not found' });
    }
    
    // Serve image - prioritize GridFS over file system
    if (promo.imageId) {
      console.log('🎯 [PROMO IMAGE] Serving GridFS image:', promo.imageId);
      
      // Check if file exists in GridFS
      const file = await gfs.files.findOne({ _id: promo.imageId });
      if (!file) {
        console.log('❌ [PROMO IMAGE] GridFS file not found, trying fallback:', promo.imageId);
        
        // Fallback to imageUrl if GridFS image not found
        if (promo.imageUrl) {
          console.log('🎯 [PROMO IMAGE] Falling back to imageUrl:', promo.imageUrl);
          // Continue to the imageUrl handling below
        } else {
          return res.status(404).send('Promo image not found in GridFS and no fallback URL');
        }
      } else {
        // Set appropriate headers
        res.set('Content-Type', file.contentType || 'application/octet-stream');
        res.set('Content-Length', file.length);
        res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

        // Create read stream from GridFS
        const readstream = gfs.createReadStream({ _id: promo.imageId });
        
        readstream.on('error', (err) => {
          console.error('❌ [PROMO IMAGE] Error reading from GridFS:', err);
          if (!res.headersSent) {
            res.status(500).send('Error reading promo image');
          }
        });

        readstream.pipe(res);
        return; // Exit early if GridFS image was found and served
      }
    }
    
    // Handle imageUrl (either as primary or fallback)
    if (promo.imageUrl) {
      console.log('🎯 [PROMO IMAGE] Serving file system image:', promo.imageUrl);
      
      // Check if imageUrl is a base64 data URL
      if (promo.imageUrl.startsWith('data:')) {
        const matches = promo.imageUrl.match(/^data:(.+);base64,(.*)$/);
        if (!matches) {
          return res.status(400).json({ error: 'Invalid image data' });
        }
        const contentType = matches[1];
        const base64Data = matches[2];
        const imgBuffer = Buffer.from(base64Data, 'base64');
        res.set('Content-Type', contentType);
        res.send(imgBuffer);
      } else if (promo.imageUrl.startsWith('/api/images/')) {
        // Handle legacy API image URLs - redirect to GridFS or return 404
        console.log('🎯 [PROMO IMAGE] Legacy API image URL detected:', promo.imageUrl);
        return res.status(404).json({ error: 'Legacy image URL not supported' });
      } else if (promo.imageUrl.startsWith('/uploads/')) {
        // If it's a file path, serve it as static file
        const filePath = path.join(__dirname, promo.imageUrl);
        if (fs.existsSync(filePath)) {
          res.sendFile(filePath);
        } else {
          console.log('❌ [PROMO IMAGE] File not found:', filePath);
          return res.status(404).send('Image file not found');
        }
      } else {
        // Try to serve as static file
        const filePath = path.join(__dirname, promo.imageUrl);
        if (fs.existsSync(filePath)) {
          res.sendFile(filePath);
        } else {
          console.log('❌ [PROMO IMAGE] File not found:', filePath);
          return res.status(404).send('Image file not found');
        }
      }
    } else {
      console.log('❌ [PROMO IMAGE] No image available for promo:', promoId);
      return res.status(404).json({ error: 'No image available' });
    }
  } catch (err) {
    console.error('❌ [PROMO IMAGE] Error serving promo image:', err);
    res.status(500).json({ error: err.message });
  }
});

// Legacy promo image endpoint redirect
app.get('/api/images/promo/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    console.log('🔄 [PROMO LEGACY] Redirecting legacy promo image URL:', imageId);
    
    // Find the promo that has this imageId
    const promo = await Promo.findOne({ imageId: imageId });
    if (!promo) {
      console.log('❌ [PROMO LEGACY] Promo not found for imageId:', imageId);
      return res.status(404).json({ error: 'Promo not found' });
    }
    
    // Redirect to the correct endpoint
    const redirectUrl = `/api/promo-image/${promo._id}`;
    console.log('🔄 [PROMO LEGACY] Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
    
  } catch (err) {
    console.error('❌ [PROMO LEGACY] Error handling legacy promo image URL:', err);
    res.status(500).json({ error: err.message });
  }
});

// Serve promo image from GridFS
app.get('/api/promo-image-gridfs/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    console.log('🎯 [PROMO GRIDFS] Fetching image from GridFS:', fileId);
    
    // Check if file exists in GridFS
    const file = await gfs.files.findOne({ _id: fileId });
    if (!file) {
      console.log('❌ [PROMO GRIDFS] File not found in GridFS:', fileId);
      return res.status(404).send('Promo image not found');
    }

    // Set appropriate headers
    res.set('Content-Type', file.contentType || 'application/octet-stream');
    res.set('Content-Length', file.length);
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    // Create read stream from GridFS
    const readstream = gfs.createReadStream({ _id: fileId });
    
    readstream.on('error', (err) => {
      console.error('❌ [PROMO GRIDFS] Error reading from GridFS:', err);
      if (!res.headersSent) {
        res.status(500).send('Error reading promo image');
      }
    });

    readstream.pipe(res);
    
  } catch (err) {
    console.error('❌ [PROMO GRIDFS] Error serving promo image from GridFS:', err);
    res.status(500).send('Error retrieving promo image');
  }
});






const menuInfo = `
🍝 PASTAS – 250
Guanciale Alfredo 
Fiery Carbonara
Truffle Cream Pasta

🥟 CALZONE – 170
Creamy Bacon Calzone
Pepperoni Calzone

🍕 PIZZAS
Indulge in our Neapolitan-style pizzas, freshly crafted with love.

                     price
Pizza	      Pizzetta	12th
Creamy Pesto	220	400
Salame Piccante	220	400
Savory Spinach	220	400
The Five Cheese	280	440
Black Truffle	280	440
Cheese	        200   	350

Add-Ons:
Pesto +50
Salami +50
Spinach +50
Spicy Honey +25
Chilli Flakes +25

🥐 PASTRIES
Item	                        Price
Pain Suisse	                120
French Butter Croissant	120
Blueberry Cheesecake Danish	120
Mango Cheesecake Danish 	120
Crookie	                        130
Pain Au Chocolat	        140
Almond Croissant	        150
Pain Suisse Chocolate	        150
Hokkaido Cheese Danish	        150
Vanilla Flan Brulee Tart	150
Pain Au Pistachio	        180
Strawberry Cream Croissant	180
Choco-Berry Pain Suisse  	180
Kunefe Pistachio Croissant	200
Garlic Cream Cheese Croissant	160
Pain Au Ham & Cheese	        180
Grilled Cheese           	190

🍩 DONUTS
Made fresh daily using Hokkaido Milk Bread

Flavor	Price                   price
Original Milky Vanilla Glaze	40
Oreo Overload	                45
White Chocolate with Almonds	45
Dark Chocolate with Cashew Nuts	45
Dark Chocolate with Sprinkles	45
Matcha                   	45
Strawberry with Sprinkles	45
Smores                  	50

Donut Boxes:
Box of 6 (Classic) – 200
Box of 6 (Assorted) – 250

🧋 DRINKS
Non-Coffee Series (Milk teas made from brewed tea leaves)

                                  price
Drink	                       Medium	Large
Nomu Milk Tea	                120    140
Wintermelon Milk Tea	        120	140
Taro Milk Tea w/ Taro Paste	120	140
Blue Cotton Candy	        130	150
Mixed Fruit Tea         	130	150
Tiger Brown Sugar       	140	160
Mixed Berries w/ Popping Boba	150	170
Strawberry Lemonade Green Tea	150	170

Hot/Iced Drinks:

Drink               	Price
                          Iced    Hot
Honey Citron Ginger Tea	  120    130
Matcha Latte	          140    150
Sakura Latte	          140    150
Honey Lemon Chia	  180    190
Hot Chocolate	                  130
Hot Mint Chocolate	          150

Kumo Cream Series (Topped with salty cream cheese)
                                  Price
Drink	                       Medium	Large
Chiztill (Black/Oolong/Jasmine)	100	120
Kumo Wintermelon	        120	140
Kumo Nomu Milk Tea	        130	150
Kumo Matcha             	140	160
Kumo Taro Milk Tea       	130	150
Kumo Choco	                120	140
Kumo Tiger Brown Sugar   	140	160
Kumo Sakura Latte	        140	160
Kumo Milo with Oreo    	130	150
Kumo Mixed Berries	        140	160
Kumo Fresh Strawberry  	160	180
Kumo Fresh Mango	        160	180

Drink Add-Ons:
Black / White Pearls +10
Pudding +15
Grass Jelly / Nata +15
Popping Boba +15
Espresso Shot +30
Kumo Cream +40

NOMU CAFE

Drinks – Coffee Series
Freshly roasted, locally sourced.

Drink	                               Iced	Hot
Americano	                       120	120
Cold Brew	                       130	-
Nomu Latte	                       130	130
Kumo Coffee	                       130	140
Orange Long Black	               130	140
Cappuccino	                       130	140
Flavored Latte (Vanilla / Hazelnut)    140	140
Salted Caramel Latte	               140	150
Spanish Latte                        140	150
Chai Latte	                       140	150
Ube Vanilla Latte	               140	160
Mazagran (Lemon Coffee)	               160	-
Coconut Vanilla Latte	               160	170
Chocolate Mocha (White or Dark)	       160	170
Caramel Macchiato	               160	170
Macadamia Latte	                       160	170
Butterscotch Latte	               160	170
Peachespresso	                       160	-
Shakerato (Caramel/Spanish/Dark Choco) 180	-
Mint Latte	                       180	-
Honey Oatmilk Latte	               200	-

Best Seller
Upsize
Medium: +10
Large: +20
Add Ons
Espresso Shot: +30
Kumo Cream: +40
Oatmilk / Soymilk: +40
Black / White Pearls: +15
Pudding: +15
Grass Jelly / Nata: +15
Popping Boba: +15

Best Sellers are highlighted in the menu.

Opening and Closing Hours:
Our opening and closing hours vary per branch. For the UST branch, we usually open as early as 7 a.m. and close around 10 p.m.

Holiday Hours:
For holiday hours and special announcements, please check our website at https://www.nomu.ph for the most current updates.

ACCOUNT MANAGEMENT HELP:
- To change personal information: Go to Profile page → Edit Profile → Update your details
- To change password: Go to Profile page → Account Settings → Change Password
- For password reset: Use "Forgot Password" on login page
- For account issues: Contact support via our website
`;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Function to clean AI responses by removing asterisks and the word "order"
function cleanAIResponse(text) {
  if (!text) return text;
  
  // Remove star symbols and asterisks
  let cleaned = text.replace(/[★☆*]/g, '');
  
  // Remove the word "order" (case insensitive)
  cleaned = cleaned.replace(/\border\b/gi, '');
  
  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  return cleaned.trim();
}

async function getAIResponse(message) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: `You are a helpful AI assistant for NOMU Cafe. Use the following menu for reference:\n${menuInfo}\n\nACCOUNT MANAGEMENT HELP:\n- To change personal information: Go to Profile page → Edit Profile → Update your details\n- To change password: Go to Profile page → Account Settings → Change Password\n- For password reset: Use "Forgot Password" on login page\n- For account issues: Contact support via our website\n\nIMPORTANT: If a user asks about topics outside of cafe operations, menu items, store hours, locations, loyalty program, account management, or general customer service, politely redirect them to contact NOMU Cafe directly via our website at https://www.nomu.ph for more detailed assistance.` 
          },
          { role: 'user', content: message }
        ],
        max_tokens: 200,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    );
    const rawResponse = response.data.choices[0].message.content.trim();
    return cleanAIResponse(rawResponse);
  } catch (err) {
    console.error('OpenAI API error:', err.response?.data || err.message);
    return 'Sorry, I am having trouble responding right now. For immediate assistance, please contact NOMU Cafe directly via our website: https://www.nomu.ph';
  }
}

// POST /api/chat - Send message to chat (AI only)
app.post('/api/chat', async (req, res) => {
  try {
    const { userId, message } = req.body;
    let chat = await Chat.findOne({ userId });
    if (!chat) {
      chat = new Chat({ userId, messages: [] });
    }
    // Add user message
    chat.messages.push({ sender: 'user', text: message });
    const aiResponse = await getAIResponse(message);
    chat.messages.push({ sender: 'ai', text: aiResponse });
    await chat.save();
    res.json({ aiResponse, chat });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/history/:userId - Get chat history for a user
app.get('/api/chat/history/:userId', async (req, res) => {
  try {
    const chat = await Chat.findOne({ userId: req.params.userId });
    if (!chat) return res.status(404).json({ error: 'No chat history found' });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== QR SCANNING ENDPOINTS ====================

// Add loyalty point when barista scans QR code (single item - legacy support)
app.post('/api/loyalty/scan', async (req, res) => {
  try {
    const { qrToken, itemName, itemType, category, price, employeeId } = req.body;
    
    // Support legacy 'drink' parameter for backward compatibility
    const orderItem = itemName || req.body.drink;
    const orderType = itemType || 'drink';
    const orderCategory = category || 'coffee';
    const orderPrice = price || 0;
    
    if (!qrToken) {
      return res.status(400).json({ error: 'QR token is required' });
    }

    // Find user by QR token with timeout
    const user = await User.findOne({ qrToken: qrToken }).maxTimeMS(5000);
    if (!user) {
      console.log('❌ [LOYALTY] User not found for QR token:', qrToken);
      return res.status(404).json({ error: 'User not found' });
    }

    // High-volume security checks
    try {
      // Check customer limits
      checkCustomerLimits(user._id.toString());
      
      // Check employee limits if employeeId is provided
      if (employeeId) {
        checkEmployeeLimits(employeeId);
        
        // Detect abuse patterns
        if (detectAbuse(employeeId, user._id.toString())) {
          console.log('🚨 [SECURITY] Abuse detected, blocking scan');
          return res.status(429).json({ 
            error: 'Suspicious activity detected. Scan blocked for security.',
            code: 'ABUSE_DETECTED'
          });
        }
      }
    } catch (securityError) {
      console.log('🚨 [SECURITY] Security check failed:', securityError.message);
      return res.status(429).json({ 
        error: securityError.message,
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }
    

    // No maximum points limit - unlimited cycles
    console.log(`📱 [LOYALTY] Adding point to user ${user.fullName} (current: ${user.points})`);

    // Add 1 point with validation
    const currentPoints = user.points || 0;
    const newPoints = currentPoints + 1;
    
    // Validate points before updating
    if (currentPoints < 0) {
      console.log('⚠️ [LOYALTY] Invalid current points detected, resetting to 0');
      user.points = 1; // Set to 1 since we're adding 1
    } else {
      user.points = newPoints;
    }
    
    // Record the order with new structure (single item)
    if (orderItem) {
      user.lastOrder = orderItem;
      user.pastOrders = user.pastOrders || [];
      
      // Create order with single item
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newOrder = {
        orderId: orderId,
        items: [{
          itemName: orderItem,
          itemType: orderType,
          category: orderCategory,
          price: orderPrice,
          quantity: 1
        }],
        totalPrice: orderPrice,
        date: new Date()
      };
      
      user.pastOrders.push(newOrder);
      
      // Keep only last 20 orders
      if (user.pastOrders.length > 20) {
        user.pastOrders.shift();
      }
    }

    await user.save();
    
    // Record scan for security tracking
    try {
      recordCustomerScan(user._id.toString(), 1);
      if (employeeId) {
        recordEmployeeScan(employeeId, user._id.toString());
      }
    } catch (error) {
      console.log('⚠️ [SECURITY] Failed to record scan:', error.message);
    }
    
    // Add rate limiting to prevent spam
    const now = Date.now();
    const lastScanKey = `last_scan_${user._id}`;
    const lastScanTime = global.lastScanTimes?.[lastScanKey] || 0;
    
    if (now - lastScanTime < 1000) { // 1 second cooldown
      console.log('⚠️ [LOYALTY] Rate limit exceeded for user:', user.fullName);
      return res.status(429).json({ error: 'Please wait before scanning again' });
    }
    
    // Update last scan time
    if (!global.lastScanTimes) global.lastScanTimes = {};
    global.lastScanTimes[lastScanKey] = now;

    // Validate points before saving
    if (user.points < 0) {
      console.log('⚠️ [LOYALTY] Invalid points detected, resetting to 0');
      user.points = 0;
    }
    
    // Ensure points don't exceed reasonable limits (prevent glitches)
    if (user.points > 1000) {
      console.log('⚠️ [LOYALTY] Points exceed reasonable limit, capping at 1000');
      user.points = 1000;
    }

    // Send email notification for points earned
    try {
      const isRewardEligible = user.points === 5 || user.points === 10;
      const emailSent = await sendLoyaltyPointsEmail(
        user.email, 
        user.fullName, 
        user.points, 
        orderItem || 'Your order', 
        isRewardEligible
      );
      
      if (emailSent) {
        console.log(`✅ [LOYALTY] Email notification sent to: ${user.email}`);
      } else {
        console.log(`⚠️ [LOYALTY] Failed to send email notification to: ${user.email}`);
      }
    } catch (emailError) {
      console.error('❌ [LOYALTY] Error sending email notification:', emailError);
      // Continue execution even if email fails
    }

    // Emit real-time notification to all connected clients with user identification
    io.emit('loyalty-point-added', {
      qrToken: user.qrToken,
      userId: user._id,
      itemName: orderItem || 'Your order',
      itemType: orderType,
      category: orderCategory,
      points: user.points,
      totalOrders: user.pastOrders ? user.pastOrders.length : 0,
      timestamp: new Date(),
      message: `New order: ${orderItem || 'Your order'} (${orderType}) - User now has ${user.points} points`
    });

    res.json({ 
      points: user.points, 
      lastOrder: user.lastOrder, 
      pastOrders: user.pastOrders,
      totalOrders: user.pastOrders ? user.pastOrders.length : 0
    });
  } catch (err) {
    console.error('❌ [LOYALTY] Error adding loyalty point:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add loyalty point for multiple items in a single order
app.post('/api/loyalty/scan-multiple', async (req, res) => {
  try {
    const { qrToken, items } = req.body;
    
    if (!qrToken) {
      return res.status(400).json({ error: 'QR token is required' });
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required and must not be empty' });
    }

    // Find user by QR token
    const user = await User.findOne({ qrToken: qrToken });
    if (!user) {
      console.log('❌ [LOYALTY] User not found for QR token:', qrToken);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // No maximum points limit - unlimited cycles
    console.log(`📱 [LOYALTY] Adding point to user ${user.fullName} (current: ${user.points})`);

    // Add 1 point with validation
    const currentPoints = user.points || 0;
    const newPoints = currentPoints + 1;
    
    // Validate points before updating
    if (currentPoints < 0) {
      console.log('⚠️ [LOYALTY] Invalid current points detected, resetting to 0');
      user.points = 1; // Set to 1 since we're adding 1
    } else {
      user.points = newPoints;
    }
    
    // Calculate total price
    const totalPrice = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
    
    // Create order with multiple items
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newOrder = {
      orderId: orderId,
      items: items.map(item => ({
        itemName: item.itemName || item.name || 'Unknown Item',
        itemType: item.itemType || 'food',
        category: item.category || 'general',
        price: item.price || 0,
        quantity: item.quantity || 1
      })),
      totalPrice: totalPrice,
      date: new Date()
    };
    
    // Set lastOrder to the first item for display purposes
    user.lastOrder = newOrder.items[0].itemName;
    user.pastOrders = user.pastOrders || [];
    user.pastOrders.push(newOrder);
    
    // Keep only last 20 orders
    if (user.pastOrders.length > 20) {
      user.pastOrders.shift();
    }

    // Validate points before saving
    if (user.points < 0) {
      console.log('⚠️ [LOYALTY] Invalid points detected, resetting to 0');
      user.points = 0;
    }
    
    // Ensure points don't exceed reasonable limits (prevent glitches)
    if (user.points > 1000) {
      console.log('⚠️ [LOYALTY] Points exceed reasonable limit, capping at 1000');
      user.points = 1000;
    }

    await user.save();
    
    // Send email notification for points earned
    try {
      const isRewardEligible = user.points === 5 || user.points === 10;
      const itemNames = newOrder.items.map(item => item.itemName).join(', ');
      const emailSent = await sendLoyaltyPointsEmail(
        user.email, 
        user.fullName, 
        user.points, 
        itemNames, 
        isRewardEligible
      );
      
      if (emailSent) {
        console.log(`✅ [LOYALTY] Email notification sent to: ${user.email}`);
      } else {
        console.log(`⚠️ [LOYALTY] Failed to send email notification to: ${user.email}`);
      }
    } catch (emailError) {
      console.error('❌ [LOYALTY] Error sending email notification:', emailError);
      // Continue execution even if email fails
    }

    // Emit real-time notification to all connected clients with user identification
    const itemNames = newOrder.items.map(item => item.itemName).join(', ');
    io.emit('loyalty-point-added', {
      qrToken: user.qrToken,
      userId: user._id,
      itemName: itemNames,
      itemType: 'multiple',
      category: 'order',
      points: user.points,
      totalOrders: user.pastOrders ? user.pastOrders.length : 0,
      timestamp: new Date(),
      message: `New order: ${itemNames} (${newOrder.items.length} items) - User now has ${user.points} points`
    });

    res.json({ 
      points: user.points, 
      lastOrder: user.lastOrder, 
      pastOrders: user.pastOrders,
      totalOrders: user.pastOrders ? user.pastOrders.length : 0,
      orderId: orderId,
      totalPrice: totalPrice,
      itemCount: newOrder.items.length
    });
  } catch (err) {
    console.error('❌ [LOYALTY] Error adding loyalty point for multiple items:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get user by QR token (for customer info display)
app.get('/api/customer/qr/:qrToken', async (req, res) => {
  try {
    const { qrToken } = req.params;
    
    
    const user = await User.findOne({ qrToken: qrToken });
    if (!user) {
      console.log('❌ [USER] User not found for QR token:', qrToken);
      return res.status(404).json({ error: 'User not found' });
    }
    

    res.json(user);
  } catch (err) {
    console.error('❌ [USER] Error fetching user by QR token:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update user by QR token
app.patch('/api/customer/qr/:qrToken', async (req, res) => {
  try {
    const { qrToken } = req.params;
    const updates = req.body;
    
    
    const user = await User.findOne({ qrToken: qrToken });
    if (!user) {
      console.log('❌ [USER] User not found for QR token:', qrToken);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user with new data
    Object.keys(updates).forEach(key => {
      if (updates[key] !== null && updates[key] !== undefined) {
        user[key] = updates[key];
      }
    });
    
    user.updatedAt = new Date();
    await user.save();
    

    res.json(user);
  } catch (err) {
    console.error('❌ [USER] Error updating user by QR token:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin Promo Management Endpoints

// Create new promo (admin only)
app.post('/api/admin/promos', async (req, res) => {
  try {
    const { title, description, promoType, discountValue, minOrderAmount, startDate, endDate, usageLimit, imageUrl, imageId, imageFilename } = req.body;
    
    console.log('🎯 [ADMIN-PROMO] Creating new promo:', { title, promoType });
    
    const promo = new Promo({
      title,
      description,
      promoType,
      discountValue,
      minOrderAmount,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      usageLimit,
      imageUrl, // Keep for backward compatibility
      imageId, // GridFS file ID
      imageFilename, // GridFS filename
      status: 'Active',
      isActive: true,
      createdBy: req.user?.id || 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await promo.save();
    console.log('✅ [ADMIN-PROMO] Promo created successfully:', promo._id);
    
    // Clear cache when new promo is created
    promoCache.data = null;
    promoCache.timestamp = null;
    
    // Emit real-time notification to all connected clients
    io.emit('new_promo_created', {
      promo: promo,
      message: 'New promo available!',
      timestamp: new Date()
    });

    // Real-time notification sent via Socket.IO above
    
    res.status(201).json({
      success: true,
      message: 'Promo created successfully',
      promo: promo
    });
    
  } catch (err) {
    console.error('❌ [ADMIN-PROMO] Error creating promo:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Update promo (admin only)
app.put('/api/admin/promos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log('🎯 [ADMIN-PROMO] Updating promo:', id);
    
    const promo = await Promo.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    
    if (!promo) {
      return res.status(404).json({
        success: false,
        error: 'Promo not found'
      });
    }
    
    console.log('✅ [ADMIN-PROMO] Promo updated successfully');
    
    // Clear cache when promo is updated
    promoCache.data = null;
    promoCache.timestamp = null;
    
    // Emit real-time notification to all connected clients
    io.emit('promo_updated', {
      promo: promo,
      message: 'Promo updated!',
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      message: 'Promo updated successfully',
      promo: promo
    });
    
  } catch (err) {
    console.error('❌ [ADMIN-PROMO] Error updating promo:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Delete promo (admin only)
app.delete('/api/admin/promos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🎯 [ADMIN-PROMO] Deleting promo:', id);
    
    const promo = await Promo.findByIdAndDelete(id);
    
    if (!promo) {
      return res.status(404).json({
        success: false,
        error: 'Promo not found'
      });
    }
    
    console.log('✅ [ADMIN-PROMO] Promo deleted successfully');
    
    // Emit real-time notification to all connected clients
    io.emit('promo_deleted', {
      promoId: id,
      message: 'Promo removed',
      timestamp: new Date()
    });
    
    res.json({
      success: true,
      message: 'Promo deleted successfully'
    });
    
  } catch (err) {
    console.error('❌ [ADMIN-PROMO] Error deleting promo:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

const PORT = process.env.PORT || 5000;
const localIP = getLocalIP();

// Update the server listen to use the HTTP server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 NOMU Cafe API is running!`);
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📱 Local: http://localhost:${PORT}`);
  console.log(`🌍 Network: http://${localIP}:${PORT}`);
  console.log(`🔗 API Base: http://${localIP}:${PORT}/api`);
  console.log(`🔌 Socket.IO: ws://${localIP}:${PORT}`);
  console.log('');
  console.log('📋 Available endpoints:');
  console.log('   POST /api/loyalty/scan - Add loyalty points via QR scan');
  console.log('   GET  /api/customer/qr/:qrToken - Get user info by QR token');
  console.log('   POST /api/register - User registration');
  console.log('   POST /api/user/login - User login');
  console.log('');
  console.log('🔌 Real-time features:');
  console.log('   - Live user activity tracking');
  console.log('   - Real-time order notifications');
  console.log('   - Live loyalty point updates');
  console.log('');
  console.log('👥 Supported User Types:');
  console.log('   - customer: Regular cafe customers');
  console.log('');
  console.log('🔐 User login with email verification available!');
  console.log('⏹️  Press Ctrl+C to stop the server');
  // Advertise service via mDNS for auto-discovery from mobile
  try {
    const bonjour = require('bonjour')();
    bonjour.publish({ name: 'Nomu Backend', type: 'http', port: Number(PORT), host: localIP, txt: { path: '/api' } });
    console.log('📣 Bonjour service published for auto-discovery');
  } catch (e) {
    console.log('⚠️ Bonjour publish failed (optional):', e.message);
  }
});

// Send OTP endpoint (for signup)
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const otp = generateOTP();
    const otpExpiry = Date.now() + (5 * 60 * 1000); // 5 minutes

    // Store OTP with expiry and name for personalized welcome email
    otpStore.set(email, { otp, expiresAt: otpExpiry, name: name || 'User' });
    
    console.log(`📧 OTP sent for signup - Email: ${email}, Name: ${name || 'User'}, OTP: ${otp}, Expires: ${new Date(otpExpiry).toLocaleString()}`);

    // Send email
    console.log(`📧 [SEND-OTP] Sending OTP to: ${email}`);
    const emailSent = await sendOTPEmail(email, otp);
    
    if (emailSent) {
      console.log(`✅ [SEND-OTP] OTP sent successfully to: ${email}`);
      // Emit to connected clients
      io.emit('otp_sent', { email, success: true });
      res.json({ message: 'OTP sent successfully' });
    } else {
      console.error(`❌ [SEND-OTP] Failed to send OTP to: ${email}`);
      res.status(500).json({ 
        error: 'Failed to send OTP email. Please check your email configuration and try again.' 
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
 });

// Verify OTP endpoint (for signup)
app.post('/api/verify-signup-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const storedData = otpStore.get(email);
    
    if (!storedData) {
      console.log(`❌ No OTP found for ${email}`);
      return res.status(400).json({ error: 'OTP not found or expired' });
    }

    if (Date.now() > storedData.expiresAt) {
      console.log(`⏰ OTP expired for ${email} - Current: ${new Date().toLocaleString()}, Expires: ${new Date(storedData.expiresAt).toLocaleString()}`);
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP has expired' });
    }

    if (storedData.otp !== otp) {
      console.log(`❌ Invalid OTP for ${email} - Expected: ${storedData.otp}, Received: ${otp}`);
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    console.log(`✅ OTP verified successfully for ${email}`);
    
    // OTP verified successfully
    otpStore.delete(email);
    
    // Emit verification success
    io.emit('otp_verified', { email, success: true });
    
    // Send welcome email
    try {
      const userName = storedData.name || 'User';
      await sendWelcomeEmail(email, userName);
      console.log(`✅ Welcome email sent to: ${email} for user: ${userName}`);
    } catch (err) {
      console.error('⚠️ Failed to send welcome email:', err.message);
      // Continue even if welcome email fails
    }
    
    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 🔐 PASSWORD CHANGE OTP ENDPOINTS

// Send OTP for password change
app.post('/api/send-password-change-otp', async (req, res) => {
  try {
    const { email, name, purpose } = req.body;
    
    
    // Validate email exists in your database
    const user = await User.findOne({ email: email });
    if (!user) {
      console.log('❌ [PASSWORD CHANGE] User not found:', email);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in the existing otpStore with purpose
    const otpExpiry = Date.now() + (5 * 60 * 1000); // 5 minutes
    otpStore.set(email, {
      otp,
      expiresAt: otpExpiry,
      purpose: 'password_change',
      fullname: name || user.fullName,
      cooldownUntil: Date.now() + 60 * 1000, // 1 minute cooldown
    });
    
    
    // Send OTP via email using existing email service
    const emailSent = await sendOTPEmail(email, otp);
    
    if (emailSent) {
      // Emit to connected clients
      io.emit('password_change_otp_sent', { email, success: true });
      res.json({ message: 'OTP sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send OTP email' });
    }
  } catch (err) {
    console.error('💥 [PASSWORD CHANGE] Error sending OTP:', err);
    res.status(500).json({ error: err.message });
  }
});

// Verify OTP for password change
app.post('/api/verify-password-change-otp', async (req, res) => {
  try {
    const { email, otp, purpose } = req.body;
    
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }
    
    const storedData = otpStore.get(email);
    
    if (!storedData) {
      console.log(`❌ [PASSWORD CHANGE] No OTP found for ${email}`);
      return res.status(400).json({ error: 'OTP not found or expired' });
    }
    
    // Check if this is a password change OTP
    if (storedData.purpose !== 'password_change') {
      console.log(`❌ [PASSWORD CHANGE] Wrong OTP purpose for ${email}: ${storedData.purpose}`);
      return res.status(400).json({ error: 'Invalid OTP purpose' });
    }
    
    if (Date.now() > storedData.expiresAt) {
      console.log(`⏰ [PASSWORD CHANGE] OTP expired for ${email}`);
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP has expired' });
    }
    
    if (storedData.otp !== otp) {
      console.log(`❌ [PASSWORD CHANGE] Invalid OTP for ${email} - Expected: ${storedData.otp}, Received: ${otp}`);
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    
    console.log(`✅ [PASSWORD CHANGE] OTP verified successfully for ${email}`);
    
    // OTP verified successfully - remove from store
    otpStore.delete(email);
    
    // Emit verification success
    io.emit('password_change_otp_verified', { email, success: true });
    
    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('💥 [PASSWORD CHANGE] Error verifying OTP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password endpoint
app.post('/api/user/:id/change-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    
    
    // Find user
    const user = await User.findById(id);
    if (!user) {
      console.log('❌ [PASSWORD CHANGE] User not found:', id);
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      console.log('❌ [PASSWORD CHANGE] Current password incorrect for user:', id);
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(newPassword, bcryptRounds);
    
    // Update password
    await User.findByIdAndUpdate(id, { password: hashedPassword });
    
    
    // Emit password change success
    io.emit('password_changed', { userId: id, success: true });
    
    // Send password change confirmation email
    try {
      await sendPasswordChangeEmail(user.email, user.fullName);
    } catch (err) {
      console.error('⚠️ Failed to send password change confirmation email:', err.message);
      // Continue even if email fails
    }
    
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('💥 [PASSWORD CHANGE] Error changing password:', err);
    res.status(500).json({ error: err.message });
  }
});

// 🔓 FORGOT PASSWORD ENDPOINTS

// Send OTP for forgot password
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Validate email exists in your database
    const user = await User.findOne({ email: email });
    
    if (!user) {
      console.log('❌ [FORGOT PASSWORD] User not found:', email);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check cooldown for forgot password OTP
    const storedData = otpStore.get(email);
    if (storedData && storedData.purpose === 'forgot_password' && Date.now() < storedData.cooldownUntil) {
      const remainingTime = Math.ceil((storedData.cooldownUntil - Date.now()) / 1000);
      return res.status(429).json({ 
        error: `Please wait ${remainingTime} seconds before requesting another OTP` 
      });
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in the existing otpStore with purpose (using same key format as existing system)
    // OTP will not expire but has attempt limit for security
    otpStore.set(email, {
      otp,
      expiresAt: null, // No expiration
      purpose: 'forgot_password',
      email: email,
      userId: user._id,
      cooldownUntil: Date.now() + 60 * 1000, // 1 minute cooldown
      attempts: 0, // Track verification attempts
      maxAttempts: 5, // Maximum 5 attempts allowed
      lockedUntil: null, // Account lockout timer
    });
    
    
    // Send OTP via email using existing email service
    const emailSent = await sendOTPEmail(email, otp);
    
    if (emailSent) {
      // Emit to connected clients
      io.emit('forgot_password_otp_sent', { email, success: true });
      
      
      res.json({ message: 'OTP sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send OTP email' });
    }
  } catch (err) {
    console.error('💥 [FORGOT PASSWORD] Error sending OTP:', err);
    res.status(500).json({ error: err.message });
  }
});

// Verify OTP for forgot password
app.post('/api/verify-forgot-password-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }
    
    const storedData = otpStore.get(email);
    if (!storedData) {
      console.log(`❌ [FORGOT PASSWORD] No OTP found for ${email}`);
      return res.status(400).json({ error: 'OTP not found or expired' });
    }
    
    // Check if this is a forgot password OTP
    if (storedData.purpose !== 'forgot_password') {
      console.log(`❌ [FORGOT PASSWORD] Wrong OTP purpose for ${email}: ${storedData.purpose}`);
      return res.status(400).json({ error: 'Invalid OTP purpose' });
    }
    
    // Check if account is locked due to too many attempts
    if (storedData.lockedUntil && Date.now() < storedData.lockedUntil) {
      const remainingLockTime = Math.ceil((storedData.lockedUntil - Date.now()) / 1000);
      console.log(`🔒 [FORGOT PASSWORD] Account locked for ${email} - ${remainingLockTime}s remaining`);
      return res.status(429).json({ 
        error: `Account temporarily locked. Try again in ${remainingLockTime} seconds.` 
      });
    }
    
    // Check attempt limit
    if (storedData.attempts >= storedData.maxAttempts) {
      // Lock account for 15 minutes
      const lockoutTime = Date.now() + (15 * 60 * 1000); // 15 minutes
      otpStore.set(email, {
        ...storedData,
        lockedUntil: lockoutTime
      });
      console.log(`🔒 [FORGOT PASSWORD] Account locked for ${email} due to max attempts reached`);
      return res.status(429).json({ 
        error: 'Too many failed attempts. Account locked for 15 minutes.' 
      });
    }
    
    // OTP never expires for forgot password
    
    if (storedData.otp !== otp) {
      // Increment attempt counter
      const newAttempts = storedData.attempts + 1;
      const remainingAttempts = storedData.maxAttempts - newAttempts;
      
      otpStore.set(email, {
        ...storedData,
        attempts: newAttempts
      });
      
      console.log(`❌ [FORGOT PASSWORD] Invalid OTP for ${email} - Attempt ${newAttempts}/${storedData.maxAttempts}, ${remainingAttempts} remaining`);
      
      if (remainingAttempts > 0) {
        return res.status(400).json({ 
          error: `Invalid OTP. ${remainingAttempts} attempts remaining.` 
        });
      } else {
        return res.status(400).json({ 
          error: 'Invalid OTP. No attempts remaining. Account will be locked.' 
        });
      }
    }
    
    
    // Reset attempts on successful verification
    otpStore.set(email, {
      ...storedData,
      attempts: 0,
      lockedUntil: null
    });
    
    
    // Emit verification success
    io.emit('forgot_password_otp_verified', { email, success: true });
    
    res.json({ 
      message: 'OTP verified successfully',
      userId: storedData.userId,
      email: email
    });
  } catch (error) {
    console.error('💥 [FORGOT PASSWORD] Error verifying OTP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password (for forgot password flow)
app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }
    
    // Verify OTP first
    const storedData = otpStore.get(email);
    if (!storedData || storedData.otp !== otp || storedData.purpose !== 'forgot_password') {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    
    // Find user
    const user = await User.findById(storedData.userId);
    if (!user) {
      console.log('❌ [FORGOT PASSWORD] User not found for reset:', email);
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Hash new password
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(newPassword, bcryptRounds);
    
    // Update password
    await User.findByIdAndUpdate(user._id, { password: hashedPassword });
    
    // Remove OTP from store
    otpStore.delete(email);
    
    
    // Emit password reset success
    io.emit('password_reset', { userId: user._id, success: true });
    
    // Send password reset confirmation email
    try {
      await sendPasswordResetEmail(user.email, user.fullName);
    } catch (err) {
      console.error('⚠️ Failed to send password reset confirmation email:', err.message);
      // Continue even if email fails
    }
    
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('💥 [FORGOT PASSWORD] Error resetting password:', err);
    res.status(500).json({ error: err.message });
  }
});

// Error handling middleware (must be before 404 handler)
app.use((err, req, res, next) => {
  console.error('❌ [ERROR]', err);
  
  // Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File Too Large',
        message: 'Image file is too large. Maximum size is 10MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too Many Files',
        message: 'Only one image file is allowed at a time.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected File',
        message: 'Unexpected file field. Use "profilePicture" field name.'
      });
    }
    return res.status(400).json({
      error: 'File Upload Error',
      message: err.message
    });
  }
  
  // File filter errors (custom validation)
  if (err.message && err.message.includes('Unsupported image type')) {
    return res.status(400).json({
      error: 'Unsupported Image Type',
      message: err.message
    });
  }
  
  if (err.message && err.message.includes('Only image files are allowed')) {
    return res.status(400).json({
      error: 'Invalid File Type',
      message: err.message
    });
  }
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation Error',
      details: errors
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      error: 'Duplicate Entry',
      message: `${field} already exists`
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid Token',
      message: 'Access token is invalid'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token Expired',
      message: 'Access token has expired'
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler for undefined routes (must be last)
app.use((req, res) => {
  res.status(404).json({
    error: 'Route Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});
