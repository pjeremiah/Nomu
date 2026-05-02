require('dotenv').config();

const DEBUG = false; // set true to re-enable verbose logs
const _log = (...a) => DEBUG && _log(...a);
const _warn = (...a) => DEBUG && _warn(...a);

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
const { GridFSBucket } = require('mongodb');
const { 
  ipRateLimit, 
  checkEmployeeLimits, 
  recordEmployeeScan, 
  checkCustomerLimits, 
  recordCustomerScan, 
  detectAbuse, 
  generateQrToken,
  generateScanToken,
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

// Email transporter setup with verification (longer timeouts for cold start / slow networks)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 60000,  // 60s to establish connection (e.g. from Render to Gmail)
  greetingTimeout: 30000,    // 30s for SMTP greeting
  socketTimeout: 60000       // 60s for socket inactivity
});

// Verify transporter at startup
transporter.verify((error) => {
  if (error) {
    console.error("❌ Email transporter error:", error.message);
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
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nomu Cafe - Email Verification</title>
    </head>
    <body style="margin:0; padding:20px; background-color:#f4f4f4;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px; margin:0 auto;">
            <tr><td style="background:#fff; padding:30px; border-radius:10px; box-shadow:0 0 20px rgba(0,0,0,0.1); text-align:left;">
                <div style="margin-bottom:24px; text-align:center;">
                    <div style="font-size:28px; font-weight:bold; color:#232c53;">☕ Nomu Cafe</div>
                    <h2 style="margin:10px 0 0 0; font-size:20px; font-weight:bold; color:#232c53;">Email Verification</h2>
                </div>
                <p style="font-size:14px; color:#333; margin:0 0 16px 0;">Hello,</p>
                <p style="font-size:14px; color:#333; margin:0 0 16px 0;">You have requested verification for your Nomu Cafe account. Please use the following verification code:</p>
                <div style="background-color:#232c53; color:white; font-size:32px; font-weight:bold; text-align:center; padding:20px; border-radius:8px; letter-spacing:5px; margin:20px 0; font-family:'Courier New',monospace;">${otp}</div>
                <div style="background-color:#fff3cd; border:1px solid #ffeaa7; color:#856404; padding:15px; border-radius:5px; margin:20px 0;">
                    <p style="margin:0 0 10px 0; font-size:14px; font-weight:bold;">⚠️ Important:</p>
                    <ul style="margin:0; padding-left:20px;">
                        <li style="margin-bottom:6px;">The code will expire in <strong>5 minutes</strong>.</li>
                        <li style="margin-bottom:6px;">Do not share this code with anyone</li>
                        <li style="margin-bottom:0;">If you didn't request this code, please ignore this email</li>
                    </ul>
                </div>
                <div style="background-color:#f8f9fa; padding:15px; border-radius:5px; margin:20px 0;">
                    <p style="margin:0 0 10px 0; font-size:14px; font-weight:bold; color:#232c53;">🔒 Security Tips:</p>
                    <ul style="margin:0; padding-left:20px;">
                        <li style="margin-bottom:6px;">Always verify the sender's email address</li>
                        <li style="margin-bottom:6px;">Never share your verification codes</li>
                        <li style="margin-bottom:6px;">Use strong, unique passwords</li>
                        <li style="margin-bottom:0;">Enable two-factor authentication when available</li>
                    </ul>
                </div>
                <p style="font-size:14px; color:#333; margin:0 0 16px 0; text-align:center;">If you have any questions or concerns, please contact our support team.</p>
                <div style="margin-top:28px; padding-top:20px; border-top:1px solid #eee; font-size:12px; color:#666; text-align:center;">© 2024 Nomu Cafe. This is an automated message; please do not reply.</div>
            </td></tr>
        </table>
    </body>
    </html>
    `
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    _log(`✅ [EMAIL] Email sent successfully to: ${email}`);
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
    _log(`✅ [LOYALTY EMAIL] Email sent successfully to: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ [LOYALTY EMAIL] Email sending error:', error);
    return false;
  }
}

// Send order completion notification email
async function sendOrderCompletionEmail(email, name, orderTotal, currentPoints, isEligibleForPoints, pointsAdded, orderItems) {
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('❌ [ORDER EMAIL] Invalid email format:', email);
    return false;
  }

  // Check if email credentials are set
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ [ORDER EMAIL] Email credentials not configured');
    return false;
  }

  const MINIMUM_SPENDING = 100;
  const needed = MINIMUM_SPENDING - orderTotal;
  const itemNames = orderItems.map(item => item.itemName || item.name || 'Item').join(', ');
  
  let subject, htmlContent;
  
  if (isEligibleForPoints) {
    // Email for when customer is eligible for loyalty points
    subject = '🎉 Order Completed! You\'ve earned loyalty points at Nomu Cafe!';
    htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 15px;">
        <div style="background: white; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: #2d3748; margin-bottom: 20px;">🎉 Order Completed, ${name}!</h1>
          <div style="background: #f7fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h2 style="color: #4a5568; margin: 0;">Order Total: ₱${orderTotal}</h2>
            <p style="color: #718096; margin: 10px 0 0 0;">Items: <strong>${itemNames}</strong></p>
          </div>
          <div style="background: #e6fffa; border: 2px solid #38b2ac; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #2c7a7b; margin: 0 0 10px 0;">🎁 Congratulations!</h3>
            <p style="color: #2c7a7b; margin: 0;">You've earned <strong>1 loyalty point</strong> for spending ₱${orderTotal}!</p>
            <p style="color: #2c7a7b; margin: 10px 0 0 0;">You now have <strong>${currentPoints} points</strong> total.</p>
          </div>
          <p style="color: #4a5568; margin: 20px 0;">Thank you for choosing Nomu Cafe. Keep earning points for amazing rewards!</p>
          <hr style="margin: 20px 0;">
          <p style="color: #718096; font-size: 12px;">Nomu Cafe - Your Coffee Journey Continues</p>
        </div>
      </div>
    `;
  } else {
    // Email for when customer is not eligible for loyalty points
    subject = '☕ Order Completed at Nomu Cafe!';
    htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 15px;">
        <div style="background: white; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: #2d3748; margin-bottom: 20px;">☕ Order Completed, ${name}!</h1>
          <div style="background: #f7fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h2 style="color: #4a5568; margin: 0;">Order Total: ₱${orderTotal}</h2>
            <p style="color: #718096; margin: 10px 0 0 0;">Items: <strong>${itemNames}</strong></p>
          </div>
          <div style="background: #fff5f5; border: 2px solid #f56565; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #c53030; margin: 0 0 10px 0;">💡 Almost there!</h3>
            <p style="color: #c53030; margin: 0;">Spend at least <strong>₱${MINIMUM_SPENDING}</strong> next time to earn loyalty points.</p>
            <p style="color: #c53030; margin: 10px 0 0 0;">You need <strong>₱${needed}</strong> more to qualify.</p>
          </div>
          <p style="color: #4a5568; margin: 20px 0;">Thank you for choosing Nomu Cafe. We look forward to serving you again!</p>
          <hr style="margin: 20px 0;">
          <p style="color: #718096; font-size: 12px;">Nomu Cafe - Your Coffee Journey Continues</p>
        </div>
      </div>
    `;
  }

  const mailOptions = {
    from: `"Nomu Cafe" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: subject,
    html: htmlContent
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    _log(`✅ [ORDER EMAIL] Order completion email sent successfully to: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ [ORDER EMAIL] Email sending error:', error);
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
    _log(`✅ [REWARD EMAIL] Email sent successfully to: ${email}`);
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
    _log(`✅ Welcome email sent successfully to: ${email}`);
    return true;
  } catch (error) {
    console.error('Welcome email sending error:', error);
    return false;
  }
}

// Send password change confirmation email (same format as Password Reset Successful)
async function sendPasswordChangeEmail(email, name) {
  try {
    const changeTime = new Date().toLocaleString();
    const mailOptions = {
      from: `"Nomu Cafe" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Nomu Cafe - Password Updated!',
      html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Updated! - Nomu Cafe</title>
    </head>
    <body style="margin:0; padding:20px; background-color:#f4f4f4;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px; margin:0 auto;">
        <tr><td style="background:#fff; padding:30px; border-radius:10px; box-shadow:0 0 20px rgba(0,0,0,0.1); text-align:left;">
          <div style="margin-bottom:24px; text-align:center;">
            <div style="font-size:28px; font-weight:bold; color:#232c53;">☕ Nomu Cafe</div>
          </div>
          <div style="background:linear-gradient(135deg, #28a745 0%, #20c997 100%); color:white; padding:20px; border-radius:8px; margin:20px 0; text-align:center;">
            <h2 style="margin:0; font-size:22px; font-weight:bold; text-align:center; color:white;">🔒 Password Updated!</h2>
            <p style="margin:6px 0 0 0; font-size:14px; text-align:center; color:white;">Your password has been successfully changed.</p>
          </div>
          <p style="font-size:14px; color:#333; margin:0 0 16px 0;">Hello ${name || 'there'},</p>
          <p style="font-size:14px; color:#333; margin:0 0 16px 0;">This email confirms that the password for your Nomu Cafe account has been successfully changed. You can sign in using the email and new password that were set for your account.</p>
          <div style="background:#f8f9fa; padding:20px; border-radius:8px; margin:20px 0; border:1px solid #e9ecef; text-align:center;">
            <h3 style="color:#232c53; margin:0 0 12px 0; font-size:15px; text-align:center;">Account details</h3>
            <ul style="margin:0 auto; padding-left:0; list-style:none; display:inline-block; text-align:left;">
              <li style="margin-bottom:8px; font-size:14px;"><strong>Email:</strong> ${email}</li>
              <li style="margin-bottom:0; font-size:14px;"><strong>Password changed at:</strong> ${changeTime}</li>
            </ul>
          </div>
          <div style="background:#d1ecf1; border:1px solid #bee5eb; border-radius:8px; padding:15px; margin:20px 0;">
            <p style="margin:0 0 10px 0; font-size:14px; font-weight:bold; color:#0c5460;">🔐 Security Reminder</p>
            <ul style="margin:0; padding-left:20px; color:#0c5460;">
              <li style="margin-bottom:6px;">Your new password is now active</li>
              <li style="margin-bottom:6px;">Keep your new password secure and don't share it</li>
              <li style="margin-bottom:6px;">Use a strong, unique password</li>
              <li style="margin-bottom:0;">If you didn't make this change, contact support immediately</li>
            </ul>
          </div>
          <div style="background:#fff3cd; border:1px solid #ffeaa7; border-radius:8px; padding:15px; margin:20px 0;">
            <p style="margin:0 0 10px 0; font-size:14px; font-weight:bold; color:#856404;">⚠️ Important Notice</p>
            <p style="margin:0; font-size:14px; color:#856404; line-height:1.5;">For security reasons, we recommend changing your password again after logging in, especially if you suspect your account may have been compromised.</p>
          </div>
          <p style="font-size:14px; color:#333; margin:0 0 16px 0; text-align:center;">If you have any questions or concerns, please contact our support team.</p>
          <div style="margin-top:28px; padding-top:20px; border-top:1px solid #eee; font-size:12px; color:#666; text-align:center;">© 2024 Nomu Cafe. This is an automated message; please do not reply.</div>
        </td></tr>
      </table>
    </body>
    </html>
      `
    };

    await transporter.sendMail(mailOptions);
    _log(`✅ Password change confirmation email sent successfully to: ${email}`);
    return true;
  } catch (error) {
    console.error('Password change email sending error:', error);
    return false;
  }
}

// Send password reset confirmation email (client/customer - same UI as admin Password Reset Successful, with Security Reminder & Important Notice)
async function sendPasswordResetEmail(email, name) {
  try {
    const resetTime = new Date().toLocaleString();
    const mailOptions = {
      from: `"Nomu Cafe" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Nomu Cafe - Password Reset Successful',
      html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Successful - Nomu Cafe</title>
    </head>
    <body style="margin:0; padding:20px; background-color:#f4f4f4;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px; margin:0 auto;">
        <tr><td style="background:#fff; padding:30px; border-radius:10px; box-shadow:0 0 20px rgba(0,0,0,0.1); text-align:left;">
          <div style="margin-bottom:24px; text-align:center;">
            <div style="font-size:28px; font-weight:bold; color:#232c53;">☕ Nomu Cafe</div>
          </div>
          <div style="background:linear-gradient(135deg, #28a745 0%, #20c997 100%); color:white; padding:20px; border-radius:8px; margin:20px 0; text-align:center;">
            <h2 style="margin:0; font-size:22px; font-weight:bold; text-align:center; color:white;">🔒 Password Reset Successful</h2>
            <p style="margin:6px 0 0 0; font-size:14px; text-align:center; color:white;">Your password has been successfully updated. You can now sign in with your new password.</p>
          </div>
          <p style="font-size:14px; color:#333; margin:0 0 16px 0;">Hello ${name || 'there'},</p>
          <p style="font-size:14px; color:#333; margin:0 0 16px 0;">This email confirms that the password for your Nomu Cafe account has been successfully reset. You can sign in using the email and new password that were set for your account.</p>
          <div style="background:#f8f9fa; padding:20px; border-radius:8px; margin:20px 0; border:1px solid #e9ecef; text-align:center;">
            <h3 style="color:#232c53; margin:0 0 12px 0; font-size:15px; text-align:center;">Account details</h3>
            <ul style="margin:0 auto; padding-left:0; list-style:none; display:inline-block; text-align:left;">
              <li style="margin-bottom:8px; font-size:14px;"><strong>Email:</strong> ${email}</li>
              <li style="margin-bottom:0; font-size:14px;"><strong>Password reset at:</strong> ${resetTime}</li>
            </ul>
          </div>
          <div style="background:#d1ecf1; border:1px solid #bee5eb; border-radius:8px; padding:15px; margin:20px 0;">
            <p style="margin:0 0 10px 0; font-size:14px; font-weight:bold; color:#0c5460;">🔐 Security Reminder</p>
            <ul style="margin:0; padding-left:20px; color:#0c5460;">
              <li style="margin-bottom:6px;">Your new password is now active</li>
              <li style="margin-bottom:6px;">Keep your new password secure and don't share it</li>
              <li style="margin-bottom:6px;">Use a strong, unique password</li>
              <li style="margin-bottom:0;">If you didn't request this reset, contact support immediately</li>
            </ul>
          </div>
          <div style="background:#fff3cd; border:1px solid #ffeaa7; border-radius:8px; padding:15px; margin:20px 0;">
            <p style="margin:0 0 10px 0; font-size:14px; font-weight:bold; color:#856404;">⚠️ Important Notice</p>
            <p style="margin:0; font-size:14px; color:#856404; line-height:1.5;">For security reasons, we recommend changing your password again after logging in, especially if you suspect your account may have been compromised.</p>
          </div>
          <p style="font-size:14px; color:#333; margin:0 0 16px 0; text-align:center;">If you have any questions or concerns, please contact our support team.</p>
          <div style="margin-top:28px; padding-top:20px; border-top:1px solid #eee; font-size:12px; color:#666; text-align:center;">© 2024 Nomu Cafe. This is an automated message; please do not reply.</div>
        </td></tr>
      </table>
    </body>
    </html>
      `
    };

    await transporter.sendMail(mailOptions);
    _log(`✅ Password reset confirmation email sent successfully to: ${email}`);
    return true;
  } catch (error) {
    console.error('Password reset email sending error:', error);
    return false;
  }
}


// Socket.io connection handling
io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

// GridFS instances
let gfs;
let profileGfs;

// MongoDB connection options - prevent connection loss and timeouts
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 2,
  retryWrites: true,
};

function initGridFS() {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    gfs = Grid(mongoose.connection.db, mongoose.mongo);
    gfs.collection('promo_images');
    profileGfs = Grid(mongoose.connection.db, mongoose.mongo);
    profileGfs.collection('profile_images');
    initializeGridFSStorage();
  }
}

// Ensure MongoDB is connected before DB operations (e.g. saving orders)
function ensureConnection() {
  return new Promise((resolve, reject) => {
    if (mongoose.connection.readyState === 1) {
      return resolve();
    }
    // If disconnected, trigger reconnect immediately (don't wait for 2s)
    if (mongoose.connection.readyState === 0) {
      connectMongo();
    }
    const timeout = setTimeout(() => {
      mongoose.connection.removeListener('connected', onConnected);
      reject(new Error('MongoDB connection timeout - please try again'));
    }, 15000);
    function onConnected() {
      clearTimeout(timeout);
      resolve();
    }
    mongoose.connection.once('connected', onConnected);
  });
}

// MongoDB Connection with reconnect on disconnect
function connectMongo() {
  mongoose.connect(process.env.MONGO_URI, mongoOptions)
    .then(() => {
      initGridFS();
    })
    .catch(err => {
      console.error('❌ MongoDB connection error:', err.message);
    });
}

connectMongo();

mongoose.connection.on('disconnected', () => {
  setTimeout(() => connectMongo(), 2000);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('reconnected', () => {
  initGridFS();
});

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
      cycle: { type: Number, default: 1 }, // Which loyalty cycle this order belongs to (1, 2, 3...)
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
  rewardType: { type: String, required: true, enum: ['donut', 'coffee', 'pastry', 'special', 'Loyalty Bonus'] },
  bannerColor: { type: String, default: '#FFD700' }, // Hex color for banner background
  iconName: { type: String, default: 'emoji_events' }, // Material icon name
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 0 }, // Higher number = higher priority
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  maxClaimsPerUser: { type: Number, default: 1 }, // How many times a user can claim this reward
  status: { type: String, default: 'Active' }, // Additional status field found in actual data
  usageLimit: { type: Number, default: 1 }, // Usage limit field found in actual data
  currentUsage: { type: Number, default: 0 }, // Current usage field found in actual data
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Creator field found in actual data
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Updater field found in actual data
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Rewards = mongoose.model('Rewards', rewardsSchema);

// Admin accounts (same MongoDB collection as web admin panel — `admins`)
const adminSchema = new mongoose.Schema({
  fullName: { type: String, default: '' },
  email: { type: String, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['superadmin', 'manager', 'staff'], default: 'staff' },
  status: { type: String, enum: ['active', 'inactive'], default: 'inactive' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: null },
  firstLoginCompleted: { type: Boolean, default: false },
  rememberUntil: { type: Date, default: null }
});
const Admin = mongoose.model('Admin', adminSchema);

// Barista inventory (collection: inventoryitems)
const inventoryItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, required: true },
  currentStock: { type: Number, default: 0 },
  minimumThreshold: { type: Number, default: 0 },
  maximumThreshold: { type: Number, default: 100 },
  unit: { type: String, default: 'pieces' },
  supplier: { type: mongoose.Schema.Types.Mixed, default: '' },
  storageLocation: { type: String, default: 'Main Storage' },
  shelfLife: { type: Number, default: 0 },
  requiresRefrigeration: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  imageUrl: { type: String, default: '' },
  notes: { type: String, default: '' },
  lastRestocked: { type: Date, default: null },
  lastSold: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  // Retail price for loyalty minimum-spend (₱100) — optional; used when barista omits `price` on scan
  sellingPrice: { type: Number, default: null },
  unitPrice: { type: Number, default: null },
  retailPrice: { type: Number, default: null },
  /** Synced with web admin inventory (PHP) */
  firstPrice: { type: Number, default: null },
  secondPrice: { type: Number, default: null }
});
const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);

function escapeRegexForLookup(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Barista app often sends only { qrToken, drink } with no `price`. Loyalty requires order total ≥ 100.
 * Resolve from explicit price, else sum inventory sellingPrice by line, else assume ₱100 per line item.
 */
async function resolveLoyaltyOrderPrice(explicitPrice, orderItemText) {
  const n = Number(explicitPrice);
  if (Number.isFinite(n) && n > 0) {
    return n;
  }
  if (!orderItemText || typeof orderItemText !== 'string') {
    return 0;
  }
  const parts = orderItemText.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const part of parts) {
    try {
      const inv = await InventoryItem.findOne({
        name: new RegExp(`^${escapeRegexForLookup(part)}$`, 'i'),
        status: 'active'
      }).lean();
      const sp = inv && (inv.sellingPrice ?? inv.firstPrice ?? inv.secondPrice ?? inv.unitPrice ?? inv.retailPrice);
      if (sp != null && Number(sp) > 0) {
        sum += Number(sp);
      }
    } catch (e) {
      console.warn('[LOYALTY] Price lookup failed for line:', part, e && e.message);
    }
  }
  if (sum > 0) {
    return sum;
  }
  // No per-item prices in DB: assume each line meets minimum (barista sold real items; scan had no totals)
  return parts.length * 100;
}

/** Display categories for loyalty / pastOrders (matches admin inventory: Drinks, Pastries, Pizzas, Donuts → user-facing labels). */
function normalizeLoyaltyCategoryAndType(rawCategory, clientItemType) {
  const c = String(rawCategory || '').trim().toLowerCase();
  const t = String(clientItemType || '').trim().toLowerCase();
  if (c === 'drinks' || c === 'drink' || t === 'drink') {
    return { category: 'Drinks', itemType: 'drink' };
  }
  if (c === 'pastries' || c === 'pastry' || t === 'pastry') {
    return { category: 'Pastries', itemType: 'pastry' };
  }
  if (c === 'pizzas' || c === 'pizza' || t === 'pizza') {
    return { category: 'Pizza', itemType: 'pizza' };
  }
  if (c === 'donuts' || c === 'donut' || t === 'donut') {
    return { category: 'Donut', itemType: 'donut' };
  }
  return {
    category: String(rawCategory || 'General').trim() || 'General',
    itemType: t || 'food'
  };
}

function inventoryUnitPrice(inv) {
  if (!inv) return 0;
  const candidates = [
    inv.firstPrice,
    inv.secondPrice,
    inv.sellingPrice,
    inv.unitPrice,
    inv.retailPrice
  ];
  for (const p of candidates) {
    const n = Number(p);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

/**
 * Resolve each line against InventoryItem for price + category; keeps one row per SKU with quantity.
 */
async function enrichScanMultipleLineItems(items) {
  const out = [];
  if (!Array.isArray(items)) return out;
  for (const item of items) {
    const name = (item.itemName || item.name || '').trim();
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    let price = Number(item.price);
    if (!Number.isFinite(price) || price < 0) price = 0;
    let inv = null;
    if (name) {
      try {
        inv = await InventoryItem.findOne({
          name: new RegExp(`^${escapeRegexForLookup(name)}$`, 'i'),
          status: 'active'
        }).lean();
      } catch (e) {
        console.warn('[LOYALTY] enrich line lookup failed:', name, e && e.message);
      }
    }
    if (inv) {
      if (price <= 0) price = inventoryUnitPrice(inv);
      const { category, itemType } = normalizeLoyaltyCategoryAndType(inv.category, item.itemType);
      out.push({
        itemName: inv.name || name,
        itemType,
        category,
        price,
        quantity: qty
      });
    } else {
      const { category, itemType } = normalizeLoyaltyCategoryAndType(item.category, item.itemType);
      out.push({
        itemName: name || 'Unknown Item',
        itemType,
        category,
        price,
        quantity: qty
      });
    }
  }
  return out;
}

function mobileAdminOtpKey(email) {
  return `mobile_admin:${String(email).trim().toLowerCase()}`;
}

// Create indexes for better query performance
Promo.createIndexes([
  { status: 1, isActive: 1, startDate: 1, endDate: 1 }, // Compound index for active promo queries
  { createdAt: -1 }, // Index for sorting by creation date
  { status: 1 }, // Index for status filtering
  { isActive: 1 } // Index for active filtering
]).catch(err => _log('Index creation warning:', err.message));

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
    
  } else {
    // MongoDB not connected; GridFS will be initialized on connect
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
    // Use profile_images so all profile pictures are in one bucket (same as direct profile upload & serve)
    const bucketName = imageType === 'profile' ? 'profile_images' : `${imageType}_images`;
    
    _log('✅ [GRIDFS STORAGE] File configuration:', {
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
        _log('⚠️ [PROFILE UPLOAD] Unsupported file type, but allowing for profile picture:', fileExtension);
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
    _log(`❌ [MULTER] File is not an image: ${file.mimetype}`);
    cb(new Error('Only image files are allowed.'), false);
  }
};

// File filter for profile pictures - accepts ANY file type
const profileFileFilter = (req, file, cb) => {
  _log(`✅ [PROFILE MULTER] Accepting file: ${file.originalname} (${file.mimetype})`);
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

// Profile picture: use memory storage so we can write to GridFS with native driver (multer-gridfs-storage is broken with driver 6)
const profileMemoryUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: profileFileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }
});

// GridFS multer configuration (will be initialized after MongoDB connection) - not used for profile anymore
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

// Chat proxy: mobile app sends message here; server calls OpenAI with OPENAI_API_KEY (key stays on server)
app.post('/api/chat/completion', express.json(), async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Chat not configured',
      message: 'OPENAI_API_KEY is not set on the server.'
    });
  }
  const { message, model = 'gpt-3.5-turbo', temperature = 0.7, maxTokens = 4000, messages } = req.body || {};
  const payload = {
    model,
    temperature: Number(temperature),
    max_tokens: Number(maxTokens),
    messages: Array.isArray(messages) && messages.length > 0
      ? messages
      : [{ role: 'user', content: message || '' }]
  };
  try {
    const { data } = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 60000
      }
    );
    return res.json(data);
  } catch (err) {
    const status = err.response?.status || 500;
    const body = err.response?.data || { error: err.message };
    return res.status(status).json(body);
  }
});

// Debug endpoint to test GridFS connection (uses native collections)
app.get('/api/debug/gridfs', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const profileFiles = db ? await db.collection('profile_images.files').find().toArray() : [];
    const promoFiles = db ? await db.collection('promo_images.files').find().toArray() : [];
    
    res.json({
      success: true,
      profileGfs: {
        initialized: !!db,
        filesCount: profileFiles.length,
        sampleFiles: profileFiles.slice(0, 3).map(f => ({
          id: f._id,
          filename: f.filename,
          uploadDate: f.uploadDate
        }))
      },
      promoGfs: {
        initialized: !!db,
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
  _log('🧹 [CACHE] Promo cache cleared');
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
    let employmentStatus = req.body.employmentStatus || req.body.EmploymentStatus || 'Prefer not to say';
    if (!VALID_EMPLOYMENT_STATUS.includes(employmentStatus)) {
      employmentStatus = 'Prefer not to say';
    }
    const role = req.body.role || req.body.Role || req.body.userType || 'Customer';
    const source = req.body.source || req.body.Source || 'web';


    // Validate required fields
    if (!email || !username || !password || !fullName) {
      _log('❌ Missing required fields');
      _log('❌ email:', email, 'username:', username, 'password:', password, 'fullName:', fullName);
      return res.status(400).json({ error: 'Missing required fields: email, username, password, fullName' });
    }

    // Additional validation for username
    if (username === null || username === undefined || username.trim() === '') {
      _log('❌ Invalid username:', username);
      return res.status(400).json({ error: 'Username cannot be null, undefined, or empty' });
    }

    // Additional validation for email
    if (email === null || email === undefined || email.trim() === '') {
      _log('❌ Invalid email:', email);
      return res.status(400).json({ error: 'Email cannot be null, undefined, or empty' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      _log('❌ Invalid email format:', email);
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
    // Note: We'll generate qrToken after user._id is available
    const user = new User({
      fullName: fullName || '',
      username: username,
      email: email,
      birthday: birthday || '',
      gender: gender || '',
      employmentStatus: employmentStatus,
      role: role || 'Customer',
      source: source || 'web',
      password: hashedPassword,
      qrToken: '', // Temporary - will be set before save
      points: 0,
      reviewPoints: 0,
      lastOrder: '',
      pastOrders: [],
      profilePicture: '',
      rewardsHistory: [],
    });

    // Save user first to get _id
    await user.save();
    
    // Generate JWT-based QR token immediately after user creation
    // This ensures qrToken is always set before the user can be scanned
    user.qrToken = generateQrToken(user._id);
    await user.save();
    
    // Verify qrToken was saved successfully
    if (!user.qrToken || user.qrToken === '') {
      console.error('❌ [REGISTRATION] Failed to generate qrToken for user:', user._id);
      // Try one more time
      user.qrToken = generateQrToken(user._id);
      await user.save();
    }
    
    _log('✅ [REGISTRATION] User registered with qrToken:', {
      userId: user._id,
      email: user.email,
      hasQrToken: !!user.qrToken,
      qrTokenLength: user.qrToken ? user.qrToken.length : 0
    });
    
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
  _log('✅ User found:', { 
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
    _log('❌ User has no password stored:', user.email);
    return res.status(401).json({ message: 'Invalid credentials - no password stored' });
  }

  _log('🔐 Attempting password verification...');
  const isMatch = await bcrypt.compare(password, user.password);
  
  if (!isMatch) {
    _log('❌ Password mismatch for user:', user.email);
    
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  _log('✅ Password verified for user:', user.email);

  // Ensure user has a qrToken (fix for users who might not have one)
  if (!user.qrToken || user.qrToken === '') {
    _log('⚠️ [LOGIN] User missing qrToken, generating new one:', user.email);
    user.qrToken = generateQrToken(user._id);
    await user.save();
    _log('✅ [LOGIN] qrToken generated for user:', user.email);
    _log('✅ [LOGIN] qrToken length:', user.qrToken ? user.qrToken.length : 0);
  }

  // Verify qrToken is present before sending response
  if (!user.qrToken || user.qrToken === '') {
    console.error('❌ [LOGIN] CRITICAL: qrToken still empty after generation attempt for user:', user.email);
    // Try one more time with a fresh save
    user.qrToken = generateQrToken(user._id);
    await user.save();
    
    // Reload user from database to ensure we have the latest data
    const refreshedUser = await User.findById(user._id);
    if (refreshedUser && refreshedUser.qrToken) {
      user.qrToken = refreshedUser.qrToken;
      _log('✅ [LOGIN] qrToken retrieved from refreshed user');
    }
  }

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

  _log('🎫 JWT token generated successfully');
  _log('📋 [LOGIN] Sending login response with qrToken:', {
    userId: user._id,
    email: user.email,
    hasQrToken: !!user.qrToken,
    qrTokenLength: user.qrToken ? user.qrToken.length : 0,
    qrTokenPreview: user.qrToken ? user.qrToken.substring(0, 20) + '...' : 'EMPTY'
  });

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
      qrToken: user.qrToken || '', // Ensure qrToken is always included, even if empty
      profilePicture: user.profilePicture,
      lastOrder: user.lastOrder,
      pastOrders: user.pastOrders,
      rewardsHistory: user.rewardsHistory
    }
  });
}

// Login endpoint (without OTP) - with special rate limiting
const loginHandler = async (req, res) => {
  _log('🔐 Login request body:', req.body);
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      _log('❌ Missing email or password in request');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email });
    if (!user) {
      _log('❌ User not found for email:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    _log('✅ User found:', { id: user._id, fullName: user.fullName, username: user.username, email: user.email, role: user.role, points: user.points, reviewPoints: user.reviewPoints, hasPassword: !!user.password, passwordLength: user.password ? user.password.length : 0 });

    if (!user.password) {
      _log('❌ User has no password stored:', email);
      return res.status(401).json({ message: 'Invalid credentials - no password stored' });
    }

    _log('🔐 Attempting password verification...');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      _log('❌ Password mismatch for user:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    _log('✅ Password verified for user:', email);

    // Ensure user has qrToken (same as handleUserLogin - required for loyalty QR)
    if (!user.qrToken || user.qrToken === '') {
      _log('⚠️ [LOGIN] User missing qrToken, generating new one:', user.email);
      user.qrToken = generateQrToken(user._id);
      await user.save();
      _log('✅ [LOGIN] qrToken generated for user:', user.email);
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, username: user.username },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '24h' }
    );

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

    _log('🎉 Login successful for user:', email);
    _log('📤 Sending user data:', userData);

    res.json({ message: 'Login successful', token, user: userData });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: err.message });
  }
};
app.post('/api/user/login', loginHandler);
// App expects /api/auth/login (same MongoDB, same JWT)
app.post('/api/auth/login', loginHandler);

// ==================== BARISTA APP: mobile admin OTP (same Render service as customer app) ====================
// OTP keys are prefixed so they never collide with customer /api/request-otp entries in otpStore.

async function handleMobileAdminVerifyOtp(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const otpKey = mobileAdminOtpKey(email);
    const storedData = otpStore.get(otpKey);
    if (!storedData || storedData.purpose !== 'mobile_admin_login') {
      return res.status(400).json({ message: 'OTP not found or expired' });
    }
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(otpKey);
      return res.status(400).json({ message: 'OTP has expired' });
    }
    if (String(storedData.otp) !== String(otp).trim()) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const admin = await Admin.findById(storedData.adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    if (!['superadmin', 'manager', 'staff'].includes(admin.role)) {
      return res.status(403).json({ message: 'Access denied. Valid admin account required.' });
    }

    admin.status = 'active';
    admin.lastLoginAt = new Date();
    admin.updatedAt = new Date();
    await admin.save();

    const token = jwt.sign(
      {
        adminId: admin._id,
        email: admin.email,
        role: admin.role,
        fullName: admin.fullName,
        platform: 'mobile'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...adminData } = admin.toObject();
    otpStore.delete(otpKey);

    res.json({
      message: 'Mobile admin login successful',
      token,
      user: adminData,
      platform: 'mobile'
    });
  } catch (err) {
    console.error('[MOBILE ADMIN] verify-otp error:', err);
    res.status(500).json({ message: err.message });
  }
}

app.post('/api/mobile/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const admin = await Admin.findOne({
      email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    if (!admin) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    if (!['superadmin', 'manager', 'staff'].includes(admin.role)) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    admin.status = 'active';
    admin.lastLoginAt = new Date();
    admin.updatedAt = new Date();
    await admin.save();

    const otp = generateOTP();
    const now = Date.now();
    const otpKey = mobileAdminOtpKey(admin.email);
    otpStore.set(otpKey, {
      otp,
      expiresAt: now + 60 * 60 * 1000,
      cooldownUntil: now + 60 * 1000,
      purpose: 'mobile_admin_login',
      adminId: admin._id
    });

    try {
      await transporter.sendMail({
        from: `"NOMU Mobile Admin Login" <${process.env.EMAIL_USER}>`,
        to: admin.email,
        subject: 'Your NOMU Mobile Admin OTP Code',
        text: `Your OTP is: ${otp} (Valid for 60 minutes)`,
        html: `<p>Your NOMU mobile admin verification code is:</p><h2 style="letter-spacing:8px">${otp}</h2><p>Valid for 60 minutes.</p>`
      });
    } catch (mailErr) {
      console.error('[MOBILE ADMIN] OTP email failed:', mailErr.message);
    }

    res.json({
      message: 'OTP sent to registered email',
      email: admin.email,
      expiresIn: '60 minutes'
    });
  } catch (err) {
    console.error('[MOBILE ADMIN] login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

app.post('/api/mobile/admin/verify-otp', handleMobileAdminVerifyOtp);
app.post('/api/admin/verify-login-otp', handleMobileAdminVerifyOtp);

app.post('/api/mobile/admin/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const admin = await Admin.findOne({
      email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    if (!['superadmin', 'manager', 'staff'].includes(admin.role)) {
      return res.status(403).json({ message: 'Access denied. Valid admin account required.' });
    }

    const otpKey = mobileAdminOtpKey(admin.email);
    const storedData = otpStore.get(otpKey);
    if (storedData && Date.now() < storedData.cooldownUntil) {
      const remainingTime = Math.ceil((storedData.cooldownUntil - Date.now()) / 1000);
      return res.status(429).json({
        message: `Please wait ${remainingTime} seconds before requesting another OTP`
      });
    }

    const otp = generateOTP();
    const now = Date.now();
    otpStore.set(otpKey, {
      otp,
      expiresAt: now + 60 * 60 * 1000,
      cooldownUntil: now + 60 * 1000,
      purpose: 'mobile_admin_login',
      adminId: admin._id
    });

    try {
      await transporter.sendMail({
        from: `"NOMU Mobile Admin Login" <${process.env.EMAIL_USER}>`,
        to: admin.email,
        subject: 'Your NOMU Mobile Admin OTP Code (Resent)',
        text: `Your OTP is: ${otp} (Valid for 60 minutes)`,
        html: `<p>Your NOMU mobile admin verification code (resent) is:</p><h2 style="letter-spacing:8px">${otp}</h2>`
      });
    } catch (mailErr) {
      console.error('[MOBILE ADMIN] resend email failed:', mailErr.message);
    }

    res.json({
      message: 'OTP resent successfully to your email',
      email: admin.email,
      expiresIn: '60 minutes'
    });
  } catch (err) {
    console.error('[MOBILE ADMIN] resend-otp error:', err);
    res.status(500).json({ message: 'Server error during OTP resend' });
  }
});

// Aliases for barista Flutter legacy paths (email-only OTP send / verify)
app.post('/api/admin/send-login-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const admin = await Admin.findOne({
      email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    if (!admin) return res.status(400).json({ message: 'Admin not found' });
    if (!['superadmin', 'manager', 'staff'].includes(admin.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const otp = generateOTP();
    const now = Date.now();
    const otpKey = mobileAdminOtpKey(admin.email);
    otpStore.set(otpKey, {
      otp,
      expiresAt: now + 60 * 60 * 1000,
      cooldownUntil: now + 60 * 1000,
      purpose: 'mobile_admin_login',
      adminId: admin._id
    });
    try {
      await transporter.sendMail({
        from: `"NOMU Admin Login" <${process.env.EMAIL_USER}>`,
        to: admin.email,
        subject: 'Your NOMU Admin OTP Code',
        text: `Your OTP is: ${otp}`,
        html: `<p>Your verification code:</p><h2 style="letter-spacing:8px">${otp}</h2>`
      });
    } catch (e) {
      console.error('[ADMIN send-login-otp] email:', e.message);
    }
    res.status(200).json({ message: 'OTP sent to your email address', expiresAt: new Date(now + 60 * 60 * 1000).toISOString() });
  } catch (err) {
    console.error('[ADMIN send-login-otp]', err);
    res.status(500).json({ message: 'Server error' });
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
      if (process.env.NODE_ENV === 'development') {
        _log(`🔑 [DEV] Resend OTP - use in app: ${otp}`);
        io.emit('otp_sent', { email, success: true });
        res.json({ message: 'OTP sent successfully', devOtp: otp });
      } else {
        res.status(500).json({ error: 'Failed to send OTP email' });
      }
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

// Valid employment status values (for orders and profile)
const VALID_EMPLOYMENT_STATUS = ['Student', 'Prefer not to say', 'Employed'];

// Update user info
app.patch('/api/user/:id', async (req, res) => {
  try {
    const updates = req.body;
    delete updates.password;
    if (updates.employmentStatus != null && !VALID_EMPLOYMENT_STATUS.includes(updates.employmentStatus)) {
      updates.employmentStatus = 'Prefer not to say';
    }
    _log('PATCH /api/user/:id', req.params.id, updates);
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

// Profile picture: always use memory upload; we write to GridFS in the route with native driver (multer-gridfs-storage fails with driver 6)
const profileUploadMiddleware = profileMemoryUpload.single('profilePicture');

// Upload profile picture (memory upload; write to GridFS with native driver to avoid multer-gridfs-storage bug)
app.post('/api/user/:id/profile-picture', profileUploadMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;

    if (!req.file || !req.file.buffer) {
      _log('❌ [PROFILE PICTURE] No file uploaded');
      return res.status(400).json({ error: 'No image file provided' });
    }

    const user = await User.findById(userId);
    if (!user) {
      _log('❌ [PROFILE PICTURE] User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    _log('✅ [PROFILE PICTURE] File received:', {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Delete old profile picture if it exists
    if (user.profilePicture) {
      if (user.profilePicture.startsWith('/uploads/')) {
        const oldFilePath = path.join(__dirname, user.profilePicture);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
            _log('🗑️ [PROFILE PICTURE] Deleted old file system profile picture');
          } catch (deleteError) {
            _log('⚠️ [PROFILE PICTURE] Could not delete old file:', deleteError.message);
          }
        }
      } else if (user.profilePicture.startsWith('/api/images/profile/')) {
        try {
          const oldFileIdRaw = user.profilePicture.split('/').pop();
          const oldFileId = parseGridFSFileId(oldFileIdRaw);
          if (oldFileId) {
            await deleteGridFSFile('profile_images', oldFileId);
            _log('🗑️ [PROFILE PICTURE] Deleted old GridFS profile picture:', oldFileIdRaw);
          }
        } catch (deleteError) {
          _log('⚠️ [PROFILE PICTURE] Could not delete old GridFS file:', deleteError.message);
        }
      }
    }

    let fileUrl;
    let storageType;
    const filename = `avatar_${userId}_${Date.now()}_${req.file.originalname || 'image'}`;

    // Write to GridFS using native driver (mongoose.connection.db)
    const db = mongoose.connection.db;
    if (db) {
      const bucket = new GridFSBucket(db, { bucketName: 'profile_images' });
      const uploadStream = bucket.openUploadStream(filename, {
        contentType: req.file.mimetype || 'application/octet-stream',
        metadata: { userId, originalName: req.file.originalname, uploadDate: new Date() }
      });
      const fileId = uploadStream.id; // id is set when stream is created
      await new Promise((resolve, reject) => {
        uploadStream.once('finish', resolve);
        uploadStream.once('error', reject);
        uploadStream.end(req.file.buffer);
      });
      fileUrl = `/api/images/profile/${fileId}`;
      storageType = 'GridFS';
      _log('✅ [PROFILE PICTURE] Saved to GridFS:', String(fileId));
    } else {
      // Fallback: write to disk
      const uploadsDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const diskFilename = `avatar_${userId}_${Date.now()}_${(req.file.originalname || 'image').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = path.join(uploadsDir, diskFilename);
      fs.writeFileSync(filePath, req.file.buffer);
      fileUrl = `/uploads/${diskFilename}`;
      storageType = 'File System';
      _log('✅ [PROFILE PICTURE] Saved to file system:', diskFilename);
    }

    await User.updateOne(
      { _id: userId },
      { profilePicture: fileUrl, updatedAt: new Date() }
    );

    _log(`✅ [PROFILE PICTURE] Profile picture saved to ${storageType}`);
    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      profilePicture: fileUrl,
      fileInfo: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        filename,
        ...(storageType === 'GridFS' && { imageId: String(fileUrl.split('/').pop()), bucketName: 'profile_images' })
      }
    });
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
      _log('❌ [PROFILE PICTURE] No image provided');
      return res.status(400).json({ error: 'No image provided' });
    }

    // Find the user first
    const user = await User.findById(userId);
    if (!user) {
      _log('❌ [PROFILE PICTURE] User not found:', userId);
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
        _log('❌ [PROFILE PICTURE] Invalid data URL format');
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
          _log('🗑️ [PROFILE PICTURE] Deleted old profile picture:', oldFilePath);
        } catch (deleteError) {
          _log('⚠️ [PROFILE PICTURE] Could not delete old file:', deleteError.message);
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

    _log('✅ [PROFILE PICTURE] Profile picture saved to:', filePath);
    _log('✅ [PROFILE PICTURE] File URL:', fileUrl);

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

// Helper: parse GridFS file id (string from URL -> ObjectId for MongoDB)
function parseGridFSFileId(id) {
  if (!id || typeof id !== 'string') return null;
  const trimmed = id.split('?')[0].trim();
  if (trimmed.length !== 24 || !/^[a-fA-F0-9]+$/.test(trimmed)) return null;
  try {
    return new mongoose.mongo.ObjectId(trimmed);
  } catch (e) {
    return null;
  }
}

// Helper: stream a GridFS file to response (uses native driver; gridfs-stream is legacy and breaks on Node driver 4+)
async function streamGridFSFileToResponse(bucketName, fileId, res, options = {}) {
  const db = mongoose.connection.db;
  if (!db) {
    res.status(503).send('Database not available');
    return;
  }
  const filesCol = db.collection(bucketName + '.files');
  const file = await filesCol.findOne({ _id: fileId });
  if (!file) {
    res.status(404).send(options.notFoundMessage || 'File not found');
    return;
  }
  res.set('Content-Type', file.contentType || 'application/octet-stream');
  res.set('Content-Length', file.length);
  res.set('Cache-Control', options.cacheControl || 'public, max-age=31536000');
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  const bucket = new GridFSBucket(db, { bucketName });
  const stream = bucket.openDownloadStream(fileId);
  stream.on('error', (err) => {
    console.error('❌ [GRIDFS] Stream error:', err);
    if (!res.headersSent) res.status(500).send(options.streamErrorMessage || 'Error reading file');
  });
  stream.pipe(res);
}

// Helper: delete a file from GridFS by bucket and id
async function deleteGridFSFile(bucketName, fileId) {
  const db = mongoose.connection.db;
  if (!db) return;
  const bucket = new GridFSBucket(db, { bucketName });
  await bucket.delete(fileId);
}

// Serve profile picture from GridFS (native GridFSBucket; gridfs-stream is incompatible with MongoDB driver 4+)
app.get('/api/profile-picture/:fileId', async (req, res) => {
  try {
    const fileIdRaw = req.params.fileId;
    const fileId = parseGridFSFileId(fileIdRaw);
    if (!fileId) {
      return res.status(400).send('Invalid file id');
    }
    await streamGridFSFileToResponse('profile_images', fileId, res, {
      notFoundMessage: 'Profile picture not found',
      streamErrorMessage: 'Error reading profile picture'
    });
  } catch (err) {
    console.error('❌ [PROFILE PICTURE] Error serving profile picture from GridFS:', err);
    if (!res.headersSent) res.status(500).send('Error retrieving profile picture');
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
        _log('❌ [PROFILE PICTURE] File not found:', filePath);
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

    _log('✅ [GRIDFS UPLOAD] File received:', {
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
    _log('✅ [GRIDFS UPLOAD] File buffer info:', {
      bufferLength: fileBuffer ? fileBuffer.length : 'undefined',
      hasBuffer: !!fileBuffer,
      imageType: imageType
    });
    
    // Skip validation for profile pictures - allow any file type
    if (imageType === 'profile') {
      _log('✅ [UPLOAD] Skipping validation for profile picture - allowing any file type:', {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } else {
      // Validate other image types normally
      const validation = validateImageFile(fileBuffer, req.file.originalname, req);
      _log('✅ [UPLOAD] Validation result:', {
        isValid: validation.isValid,
        error: validation.error,
        fileType: validation.fileType,
        warning: validation.warning
      });
      
      if (!validation.isValid) {
        _log('❌ [UPLOAD] File validation failed:', validation.error);
        return res.status(400).json({ error: validation.error });
      }
    }

    // Generate file URL (using regular file storage)
    const imageUrl = `/uploads/${req.file.filename}`;

    _log('✅ [UPLOAD] Upload successful, sending response:', {
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

// Serve image from GridFS by type and ID (native GridFSBucket)
app.get('/api/images/:imageType/:imageId', async (req, res) => {
  try {
    const { imageType, imageId: imageIdRaw } = req.params;
    const imageId = parseGridFSFileId(imageIdRaw);
    if (!imageId) {
      return res.status(400).send('Invalid image id');
    }
    const validTypes = ['menu', 'promo', 'inventory', 'profile'];
    if (!validTypes.includes(imageType)) {
      return res.status(400).json({ error: 'Invalid image type' });
    }
    const bucketName = imageType + '_images';
    await streamGridFSFileToResponse(bucketName, imageId, res, {
      notFoundMessage: 'Image not found',
      streamErrorMessage: 'Error reading image'
    });
  } catch (err) {
    console.error('❌ [GRIDFS IMAGE] Error serving image from GridFS:', err);
    if (!res.headersSent) res.status(500).send('Error retrieving image');
  }
});

// Delete image from GridFS (native GridFSBucket)
app.delete('/api/images/:imageType/:imageId', async (req, res) => {
  try {
    const { imageType, imageId: imageIdRaw } = req.params;
    const imageId = parseGridFSFileId(imageIdRaw);
    if (!imageId) {
      return res.status(400).json({ error: 'Invalid image id' });
    }
    const validTypes = ['menu', 'promo', 'inventory', 'profile'];
    if (!validTypes.includes(imageType)) {
      return res.status(400).json({ error: 'Invalid image type' });
    }
    const bucketName = imageType + '_images';
    const db = mongoose.connection.db;
    if (!db) return res.status(503).json({ error: 'Database not available' });
    const file = await db.collection(bucketName + '.files').findOne({ _id: imageId });
    if (!file) {
      return res.status(404).json({ error: 'Image not found' });
    }
    await deleteGridFSFile(bucketName, imageId);
    _log('✅ [GRIDFS DELETE] Image deleted successfully:', imageIdRaw);
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
    _log('PATCH /api/user/qr/:qrToken', req.params.qrToken, req.body);
    const updates = req.body;
    delete updates.password;
    if (updates.employmentStatus != null && !VALID_EMPLOYMENT_STATUS.includes(updates.employmentStatus)) {
      updates.employmentStatus = 'Prefer not to say';
    }
    const user = await User.findOneAndUpdate(
      { qrToken: req.params.qrToken },
      { $set: updates },
      { new: true, runValidators: true, context: 'query' }
    ).select('-password');
    _log('PATCH result:', user);
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
    _log(`Claiming reward: ${type} - ${description} for user ${req.params.id}`);
    await ensureConnection();

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
      _log(`Donut claim - user has ${user.points} points, allowing unlimited claims`);
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
    
    _log(`Reward claim created at: ${now.toISOString()} (${now.toLocaleString()})`);
    
    _log(`Reward claim created: ${rewardClaim._id}`);
    
    // Add to user's rewardsHistory
    try {
      // Ensure rewardsHistory is an array
      if (!Array.isArray(user.rewardsHistory)) {
        _log('Converting rewardsHistory from string to array');
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
      
      _log('Successfully added to rewardsHistory:', user.rewardsHistory[user.rewardsHistory.length - 1]);
    } catch (rewardsHistoryError) {
      console.error('Error adding to rewardsHistory:', rewardsHistoryError);
      // Continue with the claim even if rewardsHistory fails
    }
    
    // Deduct points based on reward type
    if (type === 'coffee') {
      user.points = 0; // Reset to 0 after claiming 10-point reward
      user.currentCycle = (user.currentCycle || 1) + 1; // Increment cycle
      _log(`Reset points to 0 for coffee claim, cycle advanced to: ${user.currentCycle}`);
    } else if (type === 'donut') {
      // Don't deduct points for donut reward - let points continue accumulating
      _log(`Donut reward claimed, points remain at: ${user.points}`);
    }
    
    await user.save();
    _log(`User points updated to: ${user.points}`);
    
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
        _log(`✅ [REWARD] Email notification sent to: ${user.email}`);
      } else {
        _log(`⚠️ [REWARD] Failed to send email notification to: ${user.email}`);
      }
    } catch (emailError) {
      console.error('❌ [REWARD] Error sending email notification:', emailError);
      // Continue execution even if email fails
    }
    
    // Customer collection removed - using only User collection
    const newCycle = user.currentCycle || 1;

    res.json({
      success: true,
      rewardClaim: rewardClaim,
      newPoints: user.points,
      currentCycle: newCycle
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
      $and: [
        { $or: [{ isActive: true }, { status: 'Active' }] },
        { startDate: { $lte: now } },
        {
          $or: [
            { endDate: { $exists: false } },
            { endDate: null },
            { endDate: { $gte: now } }
          ]
        }
      ]
    }).sort({ pointsRequired: 1, priority: -1 }); // Sort by points required (ascending) then priority (descending)
    
    // Add default values for missing fields to match the expected schema
    const rewardsWithDefaults = activeRewards.map(reward => ({
      ...reward.toObject(),
      bannerColor: reward.bannerColor || '#FFD700', // Default gold color
      iconName: reward.iconName || 'emoji_events', // Default icon
      priority: reward.priority || 0 // Default priority
    }));
    
    _log(`Found ${rewardsWithDefaults.length} active rewards`);
    res.json(rewardsWithDefaults);
  } catch (err) {
    console.error('Error fetching active rewards:', err);
    res.status(500).json({ error: err.message });
  }
});

// Simple in-memory cache for promos (short TTL so admin changes from web backend show on mobile quickly)
let promoCache = {
  data: null,
  timestamp: null,
  ttl: 30 * 1000 // 30 seconds - same DB may be updated by web admin
};

// Get active promos only (OPTIMIZED VERSION) - Server-side filtering + Caching
app.get('/api/promos', async (req, res) => {
  try {
    const now = new Date();
    
    // Check cache first
    if (promoCache.data && promoCache.timestamp && 
        (now.getTime() - promoCache.timestamp.getTime()) < promoCache.ttl) {
      _log('🎯 [PROMO] Serving from cache');
      return res.json({ 
        success: true, 
        promos: promoCache.data,
        count: promoCache.data.length,
        cached: true
      });
    }
    
    _log('🎯 [PROMO] Fetching active promos from database...');
    
    // Clear cache to force fresh data
    promoCache.data = null;
    promoCache.timestamp = null;
    
    // Fetch active promos (relaxed date filtering for testing)
    const promos = await Promo.find({
      status: 'Active',
      isActive: true
      // Removed strict date filtering for testing with future dates
    }).select('title description promoType discountValue minOrderAmount startDate endDate imageUrl imageId imageFilename status isActive createdAt updatedAt').sort({ createdAt: -1 }).limit(10); // Limit to 10 most recent
    
    _log(`🎯 [PROMO] Found ${promos.length} active promos (optimized query)`);
    
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
    _log('🎯 [PROMO] Fetching all promos (with images)...');
    const promos = await Promo.find({}).sort({ createdAt: -1 });
    
    _log(`🎯 [PROMO] Found ${promos.length} total promos (with images)`);
    
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
    _log('🎯 [PROMO IMAGE] Uploading image for promo:', id);
    
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
    
    _log('✅ [PROMO IMAGE] Image uploaded:', req.file.filename);
    
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
    _log('🎯 [PROMO GRIDFS] Uploading image for promo:', id);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Validate the uploaded file
    const fileBuffer = req.file.buffer;
    const validation = validateImageFile(fileBuffer, req.file.originalname);
    
    if (!validation.isValid) {
      _log('❌ [PROMO GRIDFS] File validation failed:', validation.error);
      return res.status(400).json({ error: validation.error });
    }
    
    const promo = await Promo.findById(id);
    if (!promo) {
      return res.status(404).json({ error: 'Promo not found' });
    }

    // Delete old promo image if it exists (both file path and GridFS)
    if (promo.imageId) {
      try {
        const oldId = parseGridFSFileId(String(promo.imageId)) || promo.imageId;
        await deleteGridFSFile('promo_images', oldId);
        _log('🗑️ [PROMO GRIDFS] Deleted old GridFS promo image:', promo.imageId);
      } catch (deleteError) {
        _log('⚠️ [PROMO GRIDFS] Could not delete old GridFS file:', deleteError.message);
      }
    }
    
    // Update promo with GridFS file info
    const fileUrl = `/api/promo-image-gridfs/${req.file.id}`;
    promo.imageId = req.file.id;
    promo.imageUrl = fileUrl; // Keep for backward compatibility
    promo.imageFilename = req.file.filename;
    await promo.save();
    
    _log('✅ [PROMO GRIDFS] Image uploaded to GridFS:', req.file.id);
    _log('✅ [PROMO GRIDFS] GridFS URL:', fileUrl);
    
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
    _log('🎯 [PROMO IMAGE] Fetching image for promo:', promoId);
    
    const promo = await Promo.findById(promoId);
    if (!promo) {
      _log('❌ [PROMO IMAGE] Promo not found:', promoId);
      return res.status(404).json({ error: 'Promo not found' });
    }
    
    // Serve image - prioritize GridFS over file system (native GridFSBucket)
    if (promo.imageId) {
      _log('🎯 [PROMO IMAGE] Serving GridFS image:', promo.imageId);
      const fileId = parseGridFSFileId(String(promo.imageId)) || promo.imageId;
      const db = mongoose.connection.db;
      if (db) {
        const file = await db.collection('promo_images.files').findOne({ _id: fileId });
        if (file) {
          await streamGridFSFileToResponse('promo_images', fileId, res, {
            streamErrorMessage: 'Error reading promo image'
          });
          return;
        }
      }
      _log('❌ [PROMO IMAGE] GridFS file not found, trying fallback:', promo.imageId);
      if (!promo.imageUrl) {
        return res.status(404).send('Promo image not found in GridFS and no fallback URL');
      }
    }
    
    // Handle imageUrl (either as primary or fallback)
    if (promo.imageUrl) {
      _log('🎯 [PROMO IMAGE] Serving file system image:', promo.imageUrl);
      
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
        _log('🎯 [PROMO IMAGE] Legacy API image URL detected:', promo.imageUrl);
        return res.status(404).json({ error: 'Legacy image URL not supported' });
      } else if (promo.imageUrl.startsWith('/uploads/')) {
        // If it's a file path, serve it as static file
        const filePath = path.join(__dirname, promo.imageUrl);
        if (fs.existsSync(filePath)) {
          res.sendFile(filePath);
        } else {
          _log('❌ [PROMO IMAGE] File not found:', filePath);
          return res.status(404).send('Image file not found');
        }
      } else {
        // Try to serve as static file
        const filePath = path.join(__dirname, promo.imageUrl);
        if (fs.existsSync(filePath)) {
          res.sendFile(filePath);
        } else {
          _log('❌ [PROMO IMAGE] File not found:', filePath);
          return res.status(404).send('Image file not found');
        }
      }
    } else {
      _log('❌ [PROMO IMAGE] No image available for promo:', promoId);
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
    _log('🔄 [PROMO LEGACY] Redirecting legacy promo image URL:', imageId);
    
    // Find the promo that has this imageId
    const promo = await Promo.findOne({ imageId: imageId });
    if (!promo) {
      _log('❌ [PROMO LEGACY] Promo not found for imageId:', imageId);
      return res.status(404).json({ error: 'Promo not found' });
    }
    
    // Redirect to the correct endpoint
    const redirectUrl = `/api/promo-image/${promo._id}`;
    _log('🔄 [PROMO LEGACY] Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
    
  } catch (err) {
    console.error('❌ [PROMO LEGACY] Error handling legacy promo image URL:', err);
    res.status(500).json({ error: err.message });
  }
});

// Serve promo image from GridFS (native GridFSBucket)
app.get('/api/promo-image-gridfs/:fileId', async (req, res) => {
  try {
    const fileIdRaw = req.params.fileId;
    const fileId = parseGridFSFileId(fileIdRaw);
    if (!fileId) {
      return res.status(400).send('Invalid file id');
    }
    _log('🎯 [PROMO GRIDFS] Fetching image from GridFS:', fileIdRaw);
    await streamGridFSFileToResponse('promo_images', fileId, res, {
      notFoundMessage: 'Promo image not found',
      streamErrorMessage: 'Error reading promo image'
    });
  } catch (err) {
    console.error('❌ [PROMO GRIDFS] Error serving promo image from GridFS:', err);
    if (!res.headersSent) res.status(500).send('Error retrieving promo image');
  }
});






const menuInfo = `
Nomu Cafe menu – by category, names and prices only.

——— PASTAS ——— (250 each)
• Guanciale Alfredo
• Fiery Carbonara
• Truffle Cream Pasta

——— CALZONE ——— (170 each)
• Creamy Bacon Calzone
• Pepperoni Calzone

——— PIZZAS ——— (Pizzetta / 12")
• Creamy Pesto — 220 / 400
• Salame Piccante — 220 / 400
• Savory Spinach — 220 / 400
• The Five Cheese — 280 / 440
• Black Truffle — 280 / 440
• Cheese — 200 / 350
Add-Ons: Pesto +50 Salami +50 Spinach +50 Spicy Honey +25 Chilli Flakes +25

——— PASTRIES ———
• Pain Suisse — 120
• French Butter Croissant — 120
• Blueberry Cheesecake Danish — 120
• Mango Cheesecake Danish — 120
• Crookie — 130
• Pain Au Chocolat — 140
• Almond Croissant — 150
• Pain Suisse Chocolate — 150
• Hokkaido Cheese Danish — 150
• Vanilla Flan Brulee Tart — 150
• Pain Au Pistachio — 180
• Strawberry Cream Croissant — 180
• Choco-Berry Pain Suisse — 180
• Kunefe Pistachio Croissant — 200
• Garlic Cream Cheese Croissant — 160
• Pain Au Ham & Cheese — 180
• Grilled Cheese — 190

——— DONUTS ———
• Original Milky Vanilla Glaze — 40
• Oreo Overload — 45
• White Chocolate with Almonds — 45
• Dark Chocolate with Cashew Nuts — 45
• Dark Chocolate with Sprinkles — 45
• Matcha — 45
• Strawberry with Sprinkles — 45
• Smores — 50
• Box of 6 (Classic) — 200
• Box of 6 (Assorted) — 250

——— DRINKS ———
Milk Tea (Medium / Large): Nomu Milk Tea, Wintermelon, Taro w/ Taro Paste, Blue Cotton Candy, Mixed Fruit Tea, Tiger Brown Sugar, Mixed Berries w/ Popping Boba, Strawberry Lemonade Green Tea
Hot & Iced: Honey Citron Ginger Tea, Matcha Latte, Sakura Latte, Honey Lemon Chia, Hot Chocolate, Hot Mint Chocolate
Kumo Cream: Chiztill, Kumo Wintermelon, Kumo Nomu Milk Tea, Kumo Matcha, Kumo Taro, Kumo Choco, Kumo Tiger Brown Sugar, Kumo Sakura Latte, Kumo Milo with Oreo, Kumo Mixed Berries, Kumo Fresh Strawberry, Kumo Fresh Mango
Drink Add-Ons: Pearls +10 Pudding +15 Grass Jelly/Nata +15 Popping Boba +15 Espresso Shot +30 Kumo Cream +40

——— COFFEE SERIES ——— (Iced / Hot)
• Americano — 120 / 120
• Cold Brew — 130
• Nomu Latte — 130 / 130
• Kumo Coffee — 130 / 140
• Orange Long Black — 130 / 140
• Cappuccino — 130 / 140
• Flavored Latte (Vanilla/Hazelnut) — 140 / 140
• Salted Caramel Latte — 140 / 150
• Spanish Latte — 140 / 150
• Chai Latte — 140 / 150
• Ube Vanilla Latte — 140 / 160
• Mazagran (Lemon Coffee) — 160
• Coconut Vanilla Latte — 160 / 170
• Chocolate Mocha (White or Dark) — 160 / 170
• Caramel Macchiato — 160 / 170
• Macadamia Latte — 160 / 170
• Butterscotch Latte — 160 / 170
• Peachespresso — 160
• Shakerato (Caramel/Spanish/Dark Choco) — 180
• Mint Latte — 180
• Honey Oatmilk Latte — 200
Coffee Add-Ons: Medium +10 Large +20 Espresso Shot +30 Kumo Cream +40 Oatmilk/Soymilk +40 Pearls +15 Pudding +15 Grass Jelly/Nata +15 Popping Boba +15

Opening and Closing Hours (synced with nomu.cafe Location page): Dapitan (Dapitan St., Sampaloc, Manila) 8:00 AM – 10:00 PM. Jupiter (Jupiter St, Bel-Air, Makati) 7:00 AM – 8:00 PM. UPD (University Ave, Diliman, Quezon City) 7:00 AM – 9:00 PM. Check https://nomu.cafe for current hours.

ACCOUNT MANAGEMENT HELP:
- To change personal information: Go to Profile page → Edit Profile → Update your details
- To change password: Go to Profile page → Account Settings → Change Password
- For password reset: Use "Forgot Password" on login page
- For account issues: Contact support via our website
`;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Canned business hours response (synced with mobile-frontend openai_service.dart and nomu.cafe Location page).
// Used when app calls backend so the answer is always accurate and includes the URL for the "Visit Nomu Cafe Website" button.
const BUSINESS_HOURS_RESPONSE = `The opening and closing hours vary per branch.

Nomu Café – Dapitan
Dapitan St., Sampaloc, Manila — 8:00 AM – 10:00 PM

Nomu Café – Jupiter
Jupiter St, Bel-Air, Makati — 7:00 AM – 8:00 PM

Nomu Café – UPD
University Ave, Diliman, Quezon City — 7:00 AM – 9:00 PM

Visit our website to explore our menu, locations, and discover more about Nomu Cafe.

https://nomu.cafe`;

function isBusinessHoursQuery(message) {
  if (!message || typeof message !== 'string') return false;
  const lower = message.toLowerCase();
  const keywords = ['business hours', 'opening hours', 'closing hours', 'store hours', 'what time', 'when open', 'when close', 'open today', 'operating hours', 'hours'];
  return keywords.some(k => lower.includes(k));
}

// Canned account help response (synced with mobile-frontend openai_service.dart).
const ACCOUNT_HELP_RESPONSE = `Here's how to manage your account settings in the Nomu app:

1. Go to the Profile page (tap Profile in the bottom navigation).

2. Tap Account Settings.

3. To change your profile picture: Tap the profile picture area (or "Tap to change profile picture"), then tap Edit Picture. Choose Camera or Gallery, then select the photo you want to use.

4. To edit personal information: Update any fields (e.g. Full Name, Username, Birthday, Gender). Scroll down and tap Save Changes to keep your updates.

5. To change your password: In the Change Password section, enter your current password, then enter and confirm your new password. Tap Send OTP to receive a code by email, enter the OTP in the field provided, then tap Verify OTP. When verification succeeds, tap Save Changes to complete the password change.

Need to reset your password from the login screen? Use "Forgot Password" on the login page and follow the link sent to your email.

Visit our website to explore our menu, locations, and discover more about Nomu Cafe: https://nomu.cafe`;

function isAccountHelpQuery(message) {
  if (!message || typeof message !== 'string') return false;
  const lower = message.toLowerCase();
  const keywords = ['account help', 'account settings', 'change password', 'profile picture', 'personal information', 'edit profile', 'account management', 'how do i change', 'how to change password'];
  return keywords.some(k => lower.includes(k));
}

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
            content: `You are a helpful AI assistant for Nomu Cafe. Use the following menu for reference:\n${menuInfo}\n\nACCOUNT MANAGEMENT HELP:\n- To change personal information: Go to Profile page → Edit Profile → Update your details\n- To change password: Go to Profile page → Account Settings → Change Password\n- For password reset: Use "Forgot Password" on login page\n- For account issues: Contact support via our website\n\nIMPORTANT: If a user asks about topics outside of cafe operations, menu items, store hours, locations, loyalty program, account management, or general customer service, politely redirect them to contact Nomu Cafe directly via our website at https://nomu.cafe for more detailed assistance.` 
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
    return 'Sorry, I am having trouble responding right now. For immediate assistance, please contact Nomu Cafe directly via our website: https://www.nomu.ph';
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
    // Use canned responses for business hours and account help so answers match the app.
    let aiResponse;
    if (isBusinessHoursQuery(message)) aiResponse = BUSINESS_HOURS_RESPONSE;
    else if (isAccountHelpQuery(message)) aiResponse = ACCOUNT_HELP_RESPONSE;
    else aiResponse = await getAIResponse(message);
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

// DELETE /api/chat/history/:userId - Permanently clear chat history for a user
app.delete('/api/chat/history/:userId', async (req, res) => {
  try {
    const chat = await Chat.findOne({ userId: req.params.userId });
    if (!chat) return res.status(204).send(); // already empty
    chat.messages = [];
    await chat.save();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== QR SCANNING ENDPOINTS ====================

// Test endpoint to verify QR token without adding points
app.post('/api/loyalty/verify-qr', async (req, res) => {
  try {
    const { qrToken } = req.body;
    
    if (!qrToken) {
      return res.status(400).json({ 
        success: false,
        error: 'QR token is required' 
      });
    }
    
    // Find user by QR token
    let user = await User.findOne({ qrToken: qrToken });
    
    // If not found, try JWT validation
    if (!user) {
      try {
        const decoded = validateJwtToken(qrToken);
        if (decoded && decoded.userId) {
          user = await User.findById(decoded.userId);
        }
      } catch (jwtError) {
        // JWT validation failed
      }
    }
    
    if (user) {
      return res.json({
        success: true,
        valid: true,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          points: user.points
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        valid: false,
        error: 'User not found for this QR token'
      });
    }
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// Add loyalty point when barista scans QR code (single item - legacy support)
app.post('/api/loyalty/scan', async (req, res) => {
  const startTime = Date.now();
  _log('📱 [LOYALTY] Scan request received:', {
    timestamp: new Date().toISOString(),
    body: {
      hasQrToken: !!req.body.qrToken,
      qrTokenLength: req.body.qrToken ? req.body.qrToken.length : 0,
      itemName: req.body.itemName,
      price: req.body.price,
      employeeId: req.body.employeeId
    }
  });
  
  try {
    const { qrToken, itemName, itemType, category, price, employeeId } = req.body;
    
    // Support legacy 'drink' parameter for backward compatibility
    const orderItem = itemName || req.body.drink;
    const orderType = itemType || 'drink';
    const orderCategory = category || 'coffee';
    let orderPrice = Number(price) || 0;
    if (orderPrice <= 0 && orderItem) {
      orderPrice = await resolveLoyaltyOrderPrice(price, orderItem);
      console.log(`📱 [LOYALTY] Resolved order total: ₱${orderPrice} for: ${String(orderItem).substring(0, 120)}`);
    }
    
    if (!qrToken) {
      _log('❌ [LOYALTY] Missing qrToken in request');
      return res.status(400).json({ 
        error: 'QR token is required',
        message: 'Please scan a valid QR code',
        code: 'MISSING_QR_TOKEN'
      });
    }
    
    _log('🔍 [LOYALTY] Searching for user with qrToken...');

    // Find user by QR token with timeout
    let user = await User.findOne({ qrToken: qrToken }).maxTimeMS(5000);
    let usedShortLivedScanToken = false;

    // If user not found by qrToken, try to find by validating the JWT token
    // (handles short-lived scan tokens from QR dialog and legacy qrToken mismatch)
    if (!user) {
      try {
        const decoded = validateJwtToken(qrToken);
        if (decoded && decoded.userId) {
          user = await User.findById(decoded.userId);
          if (user) {
            const isShortLivedScan = decoded.type === 'qr_scan';
            usedShortLivedScanToken = isShortLivedScan;
            _log(isShortLivedScan
              ? '✅ [LOYALTY] User found by short-lived scan token'
              : '⚠️ [LOYALTY] User found by JWT validation but qrToken mismatch. Updating qrToken...', { userId: user._id });
            // Only update stored qrToken if this is a long-lived token, not a one-time scan token
            if (!isShortLivedScan) {
              user.qrToken = qrToken;
              await user.save();
            }
          }
        }
      } catch (jwtError) {
        // JWT validation failed, continue with normal error handling
        _log('⚠️ [LOYALTY] JWT validation failed:', jwtError.message);
      }
    }

    if (!user) {
      _log('❌ [LOYALTY] User not found for QR token');
      _log('❌ [LOYALTY] QR token length:', qrToken ? qrToken.length : 0);
      _log('❌ [LOYALTY] QR token preview:', qrToken ? qrToken.substring(0, 50) + '...' : 'EMPTY');
      
      // Try to find any user with empty qrToken (for debugging)
      const usersWithEmptyToken = await User.find({ qrToken: '' }).limit(5).select('email qrToken createdAt');
      if (usersWithEmptyToken.length > 0) {
        _log('⚠️ [LOYALTY] Found users with empty qrToken:', usersWithEmptyToken.map(u => ({
          email: u.email,
          createdAt: u.createdAt
        })));
      }
      
      // Try to find users created in the last hour (might be new users)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentUsers = await User.find({ 
        createdAt: { $gte: oneHourAgo },
        qrToken: { $ne: '' }
      }).limit(5).select('email qrToken createdAt');
      _log('📋 [LOYALTY] Recent users with qrToken:', recentUsers.length);
      
      return res.status(404).json({ 
        success: false,
        error: 'User not found',
        message: 'The QR code is not valid. Please make sure the customer has a valid QR code.',
        code: 'INVALID_QR_TOKEN',
        debug: {
          tokenLength: qrToken ? qrToken.length : 0,
          tokenPreview: qrToken ? qrToken.substring(0, 30) + '...' : 'EMPTY'
        }
      });
    }
    
    _log('✅ [LOYALTY] User found:', {
      userId: user._id,
      email: user.email,
      fullName: user.fullName,
      hasQrToken: !!user.qrToken,
      qrTokenMatches: user.qrToken === qrToken
    });
    
    // Safety check: Ensure user has a valid qrToken (do not overwrite when scan used short-lived token)
    if (!usedShortLivedScanToken) {
      if (!user.qrToken || user.qrToken === '') {
        _log('⚠️ [LOYALTY] User found but qrToken is empty. Generating new one...', {
          userId: user._id,
          email: user.email
        });
        user.qrToken = generateQrToken(user._id);
        await user.save();
        _log('✅ [LOYALTY] qrToken generated and saved');
      } else if (user.qrToken !== qrToken) {
        // If qrToken doesn't match but user was found, update it
        _log('⚠️ [LOYALTY] qrToken mismatch - updating user qrToken to match scanned token');
        user.qrToken = qrToken;
        await user.save();
      }
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
          _log('🚨 [SECURITY] Abuse detected, blocking scan');
          return res.status(429).json({ 
            error: 'Suspicious activity detected. Scan blocked for security.',
            code: 'ABUSE_DETECTED'
          });
        }
      }
    } catch (securityError) {
      _log('🚨 [SECURITY] Security check failed:', securityError.message);
      return res.status(429).json({ 
        error: securityError.message,
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }
    
    // Check minimum spending requirement (100 pesos)
    const MINIMUM_SPENDING = 100;
    const isEligibleForPoints = orderPrice >= MINIMUM_SPENDING;
    
    let pointsAdded = 0;
    let customerMessage = '';
    let messageType = 'info'; // 'success', 'warning', 'info'
    
    if (isEligibleForPoints) {
      _log(`📱 [LOYALTY] Adding point to user ${user.fullName} (current: ${user.points})`);
      
      // Add 1 point with validation
      const currentPoints = user.points || 0;
      const newPoints = currentPoints + 1;
      
      // Validate points before updating
      if (currentPoints < 0) {
        _log('⚠️ [LOYALTY] Invalid current points detected, resetting to 0');
        user.points = 1; // Set to 1 since we're adding 1
      } else {
        user.points = newPoints;
      }
      pointsAdded = 1;
      
      // Create success message for customer
      customerMessage = `✅ Points added! You now have ${user.points} ${user.points === 1 ? 'point' : 'points'}.`;
      messageType = 'success';
      
      // Special message for milestone points
      if (user.points === 5) {
        customerMessage = `🎉 Congratulations! You've earned 5 points! You can now claim a reward!`;
      } else if (user.points === 10) {
        customerMessage = `🎉 Amazing! You've earned 10 points! You can claim another reward!`;
      }
    } else {
      const remaining = MINIMUM_SPENDING - orderPrice;
      _log(`⚠️ [LOYALTY] Order total ₱${orderPrice} is below minimum ₱${MINIMUM_SPENDING} for loyalty points`);
      
      // Create warning message for customer
      customerMessage = `⚠️ Minimum spending not met. Your order of ₱${orderPrice.toFixed(2)} needs ₱${remaining.toFixed(2)} more to earn points. Minimum spending: ₱${MINIMUM_SPENDING}.`;
      messageType = 'warning';
    }
    
    // Record the order with new structure (single item)
    if (orderItem) {
      user.lastOrder = orderItem;
      user.pastOrders = user.pastOrders || [];
      
      // Create order with single item
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const currentCycle = user.currentCycle || 1;
      const newOrder = {
        orderId: orderId,
        cycle: currentCycle,
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

    await ensureConnection();
    await user.save();
    
    // Record scan for security tracking
    try {
      recordCustomerScan(user._id.toString(), 1);
      if (employeeId) {
        recordEmployeeScan(employeeId, user._id.toString());
      }
    } catch (error) {
      _log('⚠️ [SECURITY] Failed to record scan:', error.message);
    }
    
    // Add rate limiting to prevent spam
    const now = Date.now();
    const lastScanKey = `last_scan_${user._id}`;
    const lastScanTime = global.lastScanTimes?.[lastScanKey] || 0;
    
    if (now - lastScanTime < 1000) { // 1 second cooldown
      _log('⚠️ [LOYALTY] Rate limit exceeded for user:', user.fullName);
      return res.status(429).json({ error: 'Please wait before scanning again' });
    }
    
    // Update last scan time
    if (!global.lastScanTimes) global.lastScanTimes = {};
    global.lastScanTimes[lastScanKey] = now;

    // Validate points before saving
    if (user.points < 0) {
      _log('⚠️ [LOYALTY] Invalid points detected, resetting to 0');
      user.points = 0;
    }
    
    // Ensure points don't exceed reasonable limits (prevent glitches)
    if (user.points > 1000) {
      _log('⚠️ [LOYALTY] Points exceed reasonable limit, capping at 1000');
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
        _log(`✅ [LOYALTY] Email notification sent to: ${user.email}`);
      } else {
        _log(`⚠️ [LOYALTY] Failed to send email notification to: ${user.email}`);
      }
    } catch (emailError) {
      console.error('❌ [LOYALTY] Error sending email notification:', emailError);
      // Continue execution even if email fails
    }

    // Emit real-time notification to all connected clients with user identification
    io.emit('loyalty-point-added', {
      qrToken: user.qrToken,
      userId: user._id != null ? user._id.toString() : null,
      itemName: orderItem || 'Your order',
      itemType: orderType,
      category: orderCategory,
      points: Number(user.points) || 0,
      pointsAdded: pointsAdded,
      totalOrders: user.pastOrders ? user.pastOrders.length : 0,
      timestamp: new Date(),
      message: customerMessage,
      messageType: messageType,
      orderPrice: orderPrice,
      minimumSpending: MINIMUM_SPENDING,
      isEligibleForPoints: isEligibleForPoints
    });

    const responseTime = Date.now() - startTime;
    _log('✅ [LOYALTY] Scan successful:', {
      userId: user._id,
      email: user.email,
      fullName: user.fullName,
      points: user.points,
      pointsAdded: pointsAdded,
      orderItem: orderItem,
      orderPrice: orderPrice,
      isEligibleForPoints: isEligibleForPoints,
      responseTime: `${responseTime}ms`
    });

    res.json({ 
      success: true,
      message: `Scan processed successfully for ${user.fullName}`,
      customerMessage: customerMessage,
      messageType: messageType,
      points: user.points,
      pointsAdded: pointsAdded,
      lastOrder: user.lastOrder, 
      pastOrders: user.pastOrders,
      totalOrders: user.pastOrders ? user.pastOrders.length : 0,
      orderInfo: {
        itemName: orderItem,
        itemType: orderType,
        price: orderPrice,
        minimumSpending: MINIMUM_SPENDING,
        isEligibleForPoints: isEligibleForPoints
      },
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email
      }
    });
  } catch (err) {
    const responseTime = Date.now() - startTime;
    console.error('❌ [LOYALTY] Error adding loyalty point:', {
      error: err.message,
      stack: err.stack,
      responseTime: `${responseTime}ms`
    });
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: 'An error occurred while processing the scan. Please try again.',
      code: 'SCAN_ERROR'
    });
  }
});

// Add loyalty point for multiple items in a single order
app.post('/api/loyalty/scan-multiple', async (req, res) => {
  try {
    const { qrToken, items, employeeId } = req.body;
    
    if (!qrToken) {
      return res.status(400).json({ error: 'QR token is required' });
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required and must not be empty' });
    }

    let user = await User.findOne({ qrToken: qrToken }).maxTimeMS(5000);
    let usedShortLivedScanToken = false;

    if (!user) {
      try {
        const decoded = validateJwtToken(qrToken);
        if (decoded && decoded.userId) {
          user = await User.findById(decoded.userId);
          if (user) {
            const isShortLivedScan = decoded.type === 'qr_scan';
            usedShortLivedScanToken = isShortLivedScan;
            if (!isShortLivedScan) {
              user.qrToken = qrToken;
              await user.save();
            }
          }
        }
      } catch (jwtError) {
        _log('⚠️ [LOYALTY] scan-multiple JWT validation failed:', jwtError.message);
      }
    }

    if (!user) {
      _log('❌ [LOYALTY] scan-multiple: User not found for QR token');
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'The QR code is not valid. Please make sure the customer has a valid QR code.',
        code: 'INVALID_QR_TOKEN'
      });
    }

    if (!usedShortLivedScanToken) {
      if (!user.qrToken || user.qrToken === '') {
        user.qrToken = generateQrToken(user._id);
        await user.save();
      } else if (user.qrToken !== qrToken) {
        user.qrToken = qrToken;
        await user.save();
      }
    }

    try {
      checkCustomerLimits(user._id.toString());
      if (employeeId) {
        checkEmployeeLimits(employeeId);
        if (detectAbuse(employeeId, user._id.toString())) {
          return res.status(429).json({
            error: 'Suspicious activity detected. Scan blocked for security.',
            code: 'ABUSE_DETECTED'
          });
        }
      }
    } catch (securityError) {
      return res.status(429).json({
        error: securityError.message,
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    const enrichedItems = await enrichScanMultipleLineItems(items);
    if (!enrichedItems.length) {
      return res.status(400).json({ error: 'No valid line items after inventory resolution' });
    }

    const totalPrice = enrichedItems.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
      0
    );
    
    // Check minimum spending requirement (100 pesos)
    const MINIMUM_SPENDING = 100;
    const isEligibleForPoints = totalPrice >= MINIMUM_SPENDING;
    
    let pointsAdded = 0;
    if (isEligibleForPoints) {
      _log(`📱 [LOYALTY] Adding point to user ${user.fullName} (current: ${user.points})`);
      
      // Add 1 point with validation
      const currentPoints = user.points || 0;
      const newPoints = currentPoints + 1;
      
      // Validate points before updating
      if (currentPoints < 0) {
        _log('⚠️ [LOYALTY] Invalid current points detected, resetting to 0');
        user.points = 1; // Set to 1 since we're adding 1
      } else {
        user.points = newPoints;
      }
      pointsAdded = 1;
    } else {
      _log(`⚠️ [LOYALTY] Order total ₱${totalPrice} is below minimum ₱${MINIMUM_SPENDING} for loyalty points`);
    }
    
    // Create order with multiple items (cycle = current loyalty cycle: 1, 2, 3...)
    const currentCycle = user.currentCycle || 1;
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newOrder = {
      orderId: orderId,
      cycle: currentCycle,
      items: enrichedItems.map((item) => ({
        itemName: item.itemName,
        itemType: item.itemType,
        category: item.category,
        price: Number(item.price) || 0,
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
      _log('⚠️ [LOYALTY] Invalid points detected, resetting to 0');
      user.points = 0;
    }
    
    // Ensure points don't exceed reasonable limits (prevent glitches)
    if (user.points > 1000) {
      _log('⚠️ [LOYALTY] Points exceed reasonable limit, capping at 1000');
      user.points = 1000;
    }

    await ensureConnection();
    await user.save();

    try {
      recordCustomerScan(user._id.toString(), 1);
      if (employeeId) {
        recordEmployeeScan(employeeId, user._id.toString());
      }
    } catch (scanLogErr) {
      _log('⚠️ [SECURITY] scan-multiple record scan failed:', scanLogErr.message);
    }
    
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
        _log(`✅ [LOYALTY] Email notification sent to: ${user.email}`);
      } else {
        _log(`⚠️ [LOYALTY] Failed to send email notification to: ${user.email}`);
      }
    } catch (emailError) {
      console.error('❌ [LOYALTY] Error sending email notification:', emailError);
      // Continue execution even if email fails
    }

    // Emit real-time notification to all connected clients with user identification
    const itemNames = newOrder.items.map(item => item.itemName).join(', ');
    io.emit('loyalty-point-added', {
      qrToken: user.qrToken,
      userId: user._id != null ? user._id.toString() : null,
      itemName: itemNames,
      itemType: 'multiple',
      category: 'order',
      points: Number(user.points) || 0,
      totalOrders: user.pastOrders ? user.pastOrders.length : 0,
      timestamp: new Date(),
      message: `New order: ${itemNames} (${newOrder.items.length} items) - User now has ${user.points} points`
    });

    res.json({
      success: true,
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

// ==================== MECHANIC NOTIFICATION ENDPOINTS ====================

// Mechanic notifies customer about order completion and loyalty points
app.post('/api/mechanic/notify-order-completion', async (req, res) => {
  try {
    const { qrToken, orderTotal, employeeId, orderItems } = req.body;
    
    if (!qrToken) {
      return res.status(400).json({ error: 'QR token is required' });
    }
    
    if (!orderTotal || orderTotal <= 0) {
      return res.status(400).json({ error: 'Valid order total is required' });
    }

    // Find user by QR token
    const user = await User.findOne({ qrToken: qrToken });
    if (!user) {
      _log('❌ [MECHANIC] User not found for QR token:', qrToken);
      return res.status(404).json({ error: 'User not found' });
    }

    const MINIMUM_SPENDING = 100; // 100 pesos minimum for loyalty points
    const isEligibleForPoints = orderTotal >= MINIMUM_SPENDING;
    
    _log(`🔧 [MECHANIC] Order completion notification for ${user.fullName}:`, {
      orderTotal,
      isEligibleForPoints,
      currentPoints: user.points
    });

    // Create order record (cycle = current loyalty cycle: 1, 2, 3...)
    const currentCycle = user.currentCycle || 1;
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newOrder = {
      orderId: orderId,
      cycle: currentCycle,
      items: orderItems || [{
        itemName: 'Order Items',
        itemType: 'order',
        category: 'general',
        price: orderTotal,
        quantity: 1
      }],
      totalPrice: orderTotal,
      date: new Date(),
      employeeId: employeeId || 'unknown'
    };

    // Update user's order history
    user.lastOrder = newOrder.items[0].itemName;
    user.pastOrders = user.pastOrders || [];
    user.pastOrders.push(newOrder);
    
    // Keep only last 20 orders
    if (user.pastOrders.length > 20) {
      user.pastOrders.shift();
    }

    // Add loyalty point if eligible
    let pointsAdded = 0;
    let loyaltyMessage = '';
    
    if (isEligibleForPoints) {
      const currentPoints = user.points || 0;
      user.points = currentPoints + 1;
      pointsAdded = 1;
      loyaltyMessage = `Congratulations! You've earned 1 loyalty point for spending ₱${orderTotal}. You now have ${user.points} points.`;
    } else {
      const needed = MINIMUM_SPENDING - orderTotal;
      loyaltyMessage = `Thank you for your order! Spend at least ₱${MINIMUM_SPENDING} next time to earn loyalty points. You need ₱${needed} more.`;
    }

    await ensureConnection();
    await user.save();

    // Send real-time notification to customer
    const notification = {
      type: 'order_completion',
      qrToken: user.qrToken,
      userId: user._id,
      orderId: orderId,
      orderTotal: orderTotal,
      pointsAdded: pointsAdded,
      currentPoints: user.points,
      isEligibleForPoints: isEligibleForPoints,
      message: `Order completed successfully! ${loyaltyMessage}`,
      timestamp: new Date(),
      employeeId: employeeId
    };

    // Emit to all connected clients (customer apps will filter by qrToken)
    io.emit('order_completion_notification', notification);

    // Send email notification
    try {
      const emailSent = await sendOrderCompletionEmail(
        user.email,
        user.fullName,
        orderTotal,
        user.points,
        isEligibleForPoints,
        pointsAdded,
        orderItems || []
      );
      
      if (emailSent) {
        _log(`✅ [MECHANIC] Order completion email sent to: ${user.email}`);
      }
    } catch (emailError) {
      console.error('❌ [MECHANIC] Error sending order completion email:', emailError);
    }

    res.json({
      success: true,
      message: 'Customer notified successfully',
      orderId: orderId,
      orderTotal: orderTotal,
      pointsAdded: pointsAdded,
      currentPoints: user.points,
      isEligibleForPoints: isEligibleForPoints,
      loyaltyMessage: loyaltyMessage
    });

  } catch (err) {
    console.error('❌ [MECHANIC] Error notifying customer:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get a short-lived scan token for QR dialog (QR changes every time it's opened)
app.post('/api/customer/scan-token', async (req, res) => {
  try {
    const { qrToken } = req.body || {};
    if (!qrToken || typeof qrToken !== 'string') {
      return res.status(400).json({ error: 'qrToken is required' });
    }
    const user = await User.findOne({ qrToken: qrToken }).select('_id');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const scanToken = generateScanToken(user._id.toString());
    res.json({ scanToken });
  } catch (err) {
    console.error('❌ [USER] Error generating scan token:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get user by QR token (for customer info display)
app.get('/api/customer/qr/:qrToken', async (req, res) => {
  try {
    const { qrToken } = req.params;
    
    
    const user = await User.findOne({ qrToken: qrToken });
    if (!user) {
      _log('❌ [USER] User not found for QR token:', qrToken);
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
      _log('❌ [USER] User not found for QR token:', qrToken);
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

// ==================== BARISTA APP: inventory + customer lookup + analytics (shared mobile-backend) ====================

app.get('/api/inventory', async (req, res) => {
  try {
    const items = await InventoryItem.find({ status: 'active' }).sort({ name: 1 }).lean();
    res.json({ success: true, items });
  } catch (err) {
    console.error('[INVENTORY] list error:', err);
    res.status(500).json({ error: 'Failed to fetch inventory items' });
  }
});

app.get('/api/inventory/:id', async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Inventory item not found' });
    res.json({ success: true, item });
  } catch (err) {
    console.error('[INVENTORY] get error:', err);
    res.status(500).json({ error: 'Failed to fetch inventory item' });
  }
});

app.put('/api/inventory/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, adminId } = req.body;
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }
    const item = await InventoryItem.findById(id);
    if (!item) return res.status(404).json({ error: 'Inventory item not found' });
    if (!adminId || String(adminId).trim() === '') {
      return res.status(400).json({ error: 'Valid adminId is required' });
    }

    const updateResult = await InventoryItem.findByIdAndUpdate(
      id,
      {
        $inc: { currentStock: -quantity },
        $set: { lastSold: new Date(), updatedAt: new Date(), updatedBy: adminId }
      },
      { new: true, runValidators: true }
    );

    if (!updateResult) return res.status(404).json({ error: 'Inventory item not found' });
    if (updateResult.currentStock < 0) {
      await InventoryItem.findByIdAndUpdate(id, {
        $inc: { currentStock: quantity },
        $set: { updatedAt: new Date(), updatedBy: adminId }
      });
      return res.status(400).json({
        error: 'Insufficient stock - transaction rolled back',
        currentStock: updateResult.currentStock + quantity,
        requestedQuantity: quantity
      });
    }

    res.json({
      success: true,
      item: updateResult,
      message: `Stock decreased by ${quantity} units`
    });
  } catch (err) {
    console.error('[INVENTORY] stock error:', err);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

app.get('/api/inventory/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const items = await InventoryItem.find({
      status: 'active',
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    })
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, items });
  } catch (err) {
    console.error('[INVENTORY] search error:', err);
    res.status(500).json({ error: 'Failed to search inventory' });
  }
});

app.get('/api/customer/qr/:qrToken', async (req, res) => {
  try {
    let { qrToken } = req.params;
    let customer = await User.findOne({ qrToken });
    if (!customer && qrToken.includes('-')) {
      customer = await User.findOne({ qrToken: qrToken.replace(/-/g, '') });
    }
    if (!customer && !qrToken.includes('-') && qrToken.length === 36) {
      const withHyphens = `${qrToken.substring(0, 8)}-${qrToken.substring(8, 12)}-${qrToken.substring(12, 16)}-${qrToken.substring(16, 20)}-${qrToken.substring(20, 36)}`;
      customer = await User.findOne({ qrToken: withHyphens });
    }
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    console.error('[CUSTOMER QR] error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analytics/top-selling-items', async (req, res) => {
  try {
    const users = await User.find({}, 'pastOrders');
    const allPastOrders = [];
    users.forEach((user) => {
      if (user.pastOrders && user.pastOrders.length > 0) {
        user.pastOrders.forEach((po) => {
          const items = po.items || [];
          if (items.length > 0) {
            items.forEach((line) => {
              const name = line.itemName || line.drink;
              if (name) {
                allPastOrders.push({ drink: name, quantity: line.quantity || 1 });
              }
            });
          } else if (po.drink) {
            allPastOrders.push({ drink: po.drink, quantity: po.quantity || 1 });
          }
        });
      }
    });

    const itemCounts = {};
    const itemOrders = {};
    allPastOrders.forEach((order) => {
      const itemName = order.drink;
      const quantity = order.quantity || 1;
      if (!itemCounts[itemName]) {
        itemCounts[itemName] = 0;
        itemOrders[itemName] = 0;
      }
      itemCounts[itemName] += quantity;
      itemOrders[itemName] += 1;
    });

    const topSellingItems = Object.keys(itemCounts)
      .map((itemName) => ({
        item: itemName,
        quantity: itemCounts[itemName],
        orders: itemOrders[itemName]
      }))
      .sort((a, b) => b.quantity - a.quantity);

    res.json({
      success: true,
      data: topSellingItems,
      totalItems: topSellingItems.length,
      totalOrders: allPastOrders.length
    });
  } catch (err) {
    console.error('[ANALYTICS] top-selling-items error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

app.get('/api/analytics/best-sellers-by-category', async (req, res) => {
  try {
    const users = await User.find({}, 'pastOrders');
    const allPastOrders = [];
    users.forEach((user) => {
      if (user.pastOrders && user.pastOrders.length > 0) {
        user.pastOrders.forEach((po) => {
          const items = po.items || [];
          if (items.length > 0) {
            items.forEach((line) => {
              const name = line.itemName || line.drink;
              if (name) {
                allPastOrders.push({ drink: name, quantity: line.quantity || 1 });
              }
            });
          } else if (po.drink) {
            allPastOrders.push({ drink: po.drink, quantity: po.quantity || 1 });
          }
        });
      }
    });

    const categoryMappings = {
      Drinks: ['Americano', 'Cold Brew', 'Nomu Latte', 'Kumo Coffee', 'Orange Long Black', 'Cappuccino', 'Flavored Latte', 'Salted Caramel Latte', 'Spanish Latte', 'Chai Latte', 'Ube Vanilla Latte', 'Mazagran', 'Coconut Vanilla Latte', 'Chocolate Mocha', 'Caramel Macchiato', 'Macadamia Latte', 'Butterscotch Latte', 'Peachespresso', 'Shakerato', 'Mint Latte', 'Honey Oatmilk Latte', 'Nomu Milk Tea', 'Wintermelon Milk Tea', 'Taro Milk Tea', 'Blue Cotton Candy', 'Mixed Fruit Tea', 'Tiger Brown Sugar', 'Mixed Berries', 'Strawberry Lemonade Green Tea', 'Honey Citron Ginger Tea', 'Matcha Latte', 'Sakura Latte', 'Honey Lemon Chia', 'Hot Chocolate', 'Hot Mint Chocolate'],
      Pizza: ['Creamy Pesto', 'Salame Piccante', 'Savory Spinach', 'The Five Cheese', 'Black Truffle', 'Cheese'],
      Donuts: ['Original Milky Vanilla Glaze', 'Oreo Overload', 'White Chocolate with Almonds', 'Dark Chocolate with Cashew Nuts', 'Dark Chocolate with Sprinkles', 'Matcha', 'Strawberry with Sprinkles', 'Smores'],
      Pastries: ['Pain Suisse', 'French Butter Croissant', 'Blueberry Cheesecake Danish', 'Mango Cheesecake Danish', 'Crookie', 'Pain Au Chocolat', 'Almond Croissant', 'Pain Suisse Chocolate', 'Hokkaido Cheese Danish', 'Vanilla Flan Brulee Tart', 'Pain Au Pistachio', 'Strawberry Cream Croissant', 'Choco-Berry Pain Suisse', 'Kunefe Pistachio Croissant', 'Garlic Cream Cheese Croissant', 'Pain Au Ham & Cheese', 'Grilled Cheese']
    };

    const categoryData = {};
    Object.keys(categoryMappings).forEach((c) => {
      categoryData[c] = {};
    });

    allPastOrders.forEach((order) => {
      const itemName = order.drink;
      const quantity = order.quantity || 1;
      let itemCategory = 'Other';
      for (const [category, items] of Object.entries(categoryMappings)) {
        if (items.some((item) => itemName.includes(item))) {
          itemCategory = category;
          break;
        }
      }
      if (categoryData[itemCategory]) {
        if (!categoryData[itemCategory][itemName]) {
          categoryData[itemCategory][itemName] = { quantity: 0, orders: 0 };
        }
        categoryData[itemCategory][itemName].quantity += quantity;
        categoryData[itemCategory][itemName].orders += 1;
      }
    });

    const result = {};
    Object.keys(categoryData).forEach((category) => {
      const items = Object.keys(categoryData[category])
        .map((itemName) => ({
          item: itemName,
          quantity: categoryData[category][itemName].quantity,
          orders: categoryData[category][itemName].orders
        }))
        .sort((a, b) => b.quantity - a.quantity);
      result[category] = items;
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[ANALYTICS] best-sellers-by-category error:', err);
    res.status(500).json({ error: 'Failed to fetch category analytics data' });
  }
});

// Admin Promo Management Endpoints

// Create new promo (admin only)
app.post('/api/admin/promos', async (req, res) => {
  try {
    const { title, description, promoType, discountValue, minOrderAmount, startDate, endDate, usageLimit, imageUrl, imageId, imageFilename } = req.body;
    
    _log('🎯 [ADMIN-PROMO] Creating new promo:', { title, promoType });
    
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
    _log('✅ [ADMIN-PROMO] Promo created successfully:', promo._id);
    
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
    
    _log('🎯 [ADMIN-PROMO] Updating promo:', id);
    
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
    
    _log('✅ [ADMIN-PROMO] Promo updated successfully');
    
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
    
    _log('🎯 [ADMIN-PROMO] Deleting promo:', id);
    
    const promo = await Promo.findByIdAndDelete(id);
    
    if (!promo) {
      return res.status(404).json({
        success: false,
        error: 'Promo not found'
      });
    }
    
    _log('✅ [ADMIN-PROMO] Promo deleted successfully');
    
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
const bindHost = process.env.SERVER_HOST || '0.0.0.0';

// Listen on SERVER_HOST (e.g. 0.0.0.0 = all interfaces) so backend is reachable from any network
server.listen(PORT, bindHost, () => {
  // Advertise service via mDNS for auto-discovery from mobile (no log)
  try {
    const bonjour = require('bonjour')();
    bonjour.publish({ name: 'Nomu Backend', type: 'http', port: Number(PORT), host: localIP, txt: { path: '/api' } });
  } catch (_) {}
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
    
    _log(`📧 OTP sent for signup - Email: ${email}, Name: ${name || 'User'}, OTP: ${otp}, Expires: ${new Date(otpExpiry).toLocaleString()}`);

    // Send email
    _log(`📧 [SEND-OTP] Sending OTP to: ${email}`);
    const emailSent = await sendOTPEmail(email, otp);
    
    if (emailSent) {
      _log(`✅ [SEND-OTP] OTP sent successfully to: ${email}`);
      // Emit to connected clients
      io.emit('otp_sent', { email, success: true });
      res.json({ message: 'OTP sent successfully' });
    } else {
      console.error(`❌ [SEND-OTP] Failed to send OTP to: ${email}`);
      // In development, return OTP so user can still complete signup (e.g. email not configured)
      if (process.env.NODE_ENV === 'development') {
        _log(`🔑 [DEV] Use this OTP in the app: ${otp}`);
        io.emit('otp_sent', { email, success: true });
        res.json({ message: 'OTP sent successfully', devOtp: otp });
      } else {
        res.status(500).json({ 
          error: 'Failed to send OTP email. Please check your email configuration and try again.' 
        });
      }
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
      _log(`❌ No OTP found for ${email}`);
      return res.status(400).json({ error: 'OTP not found or expired' });
    }

    if (Date.now() > storedData.expiresAt) {
      _log(`⏰ OTP expired for ${email} - Current: ${new Date().toLocaleString()}, Expires: ${new Date(storedData.expiresAt).toLocaleString()}`);
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP has expired' });
    }

    if (storedData.otp !== otp) {
      _log(`❌ Invalid OTP for ${email} - Expected: ${storedData.otp}, Received: ${otp}`);
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    _log(`✅ OTP verified successfully for ${email}`);
    
    // OTP verified successfully
    otpStore.delete(email);
    
    // Emit verification success
    io.emit('otp_verified', { email, success: true });
    
    // Send welcome email
    try {
      const userName = storedData.name || 'User';
      await sendWelcomeEmail(email, userName);
      _log(`✅ Welcome email sent to: ${email} for user: ${userName}`);
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
      _log('❌ [PASSWORD CHANGE] User not found:', email);
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
      _log(`❌ [PASSWORD CHANGE] No OTP found for ${email}`);
      return res.status(400).json({ error: 'OTP not found or expired' });
    }
    
    // Check if this is a password change OTP
    if (storedData.purpose !== 'password_change') {
      _log(`❌ [PASSWORD CHANGE] Wrong OTP purpose for ${email}: ${storedData.purpose}`);
      return res.status(400).json({ error: 'Invalid OTP purpose' });
    }
    
    if (Date.now() > storedData.expiresAt) {
      _log(`⏰ [PASSWORD CHANGE] OTP expired for ${email}`);
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP has expired' });
    }
    
    if (storedData.otp !== otp) {
      _log(`❌ [PASSWORD CHANGE] Invalid OTP for ${email} - Expected: ${storedData.otp}, Received: ${otp}`);
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    
    _log(`✅ [PASSWORD CHANGE] OTP verified successfully for ${email}`);
    
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
      _log('❌ [PASSWORD CHANGE] User not found:', id);
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      _log('❌ [PASSWORD CHANGE] Current password incorrect for user:', id);
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
      _log('❌ [FORGOT PASSWORD] User not found:', email);
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
    const otpExpiry = Date.now() + (5 * 60 * 1000); // 5 minutes
    otpStore.set(email, {
      otp,
      expiresAt: otpExpiry,
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
      _log(`❌ [FORGOT PASSWORD] No OTP found for ${email}`);
      return res.status(400).json({ error: 'OTP not found or expired' });
    }
    
    // Check if this is a forgot password OTP
    if (storedData.purpose !== 'forgot_password') {
      _log(`❌ [FORGOT PASSWORD] Wrong OTP purpose for ${email}: ${storedData.purpose}`);
      return res.status(400).json({ error: 'Invalid OTP purpose' });
    }
    
    // Check if account is locked due to too many attempts
    if (storedData.lockedUntil && Date.now() < storedData.lockedUntil) {
      const remainingLockTime = Math.ceil((storedData.lockedUntil - Date.now()) / 1000);
      _log(`🔒 [FORGOT PASSWORD] Account locked for ${email} - ${remainingLockTime}s remaining`);
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
      _log(`🔒 [FORGOT PASSWORD] Account locked for ${email} due to max attempts reached`);
      return res.status(429).json({ 
        error: 'Too many failed attempts. Account locked for 15 minutes.' 
      });
    }
    
    // Check if OTP has expired (5 minutes)
    if (storedData.expiresAt && Date.now() > storedData.expiresAt) {
      _log(`⏰ [FORGOT PASSWORD] OTP expired for ${email}`);
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP has expired' });
    }
    
    if (storedData.otp !== otp) {
      // Increment attempt counter
      const newAttempts = storedData.attempts + 1;
      const remainingAttempts = storedData.maxAttempts - newAttempts;
      
      otpStore.set(email, {
        ...storedData,
        attempts: newAttempts
      });
      
      _log(`❌ [FORGOT PASSWORD] Invalid OTP for ${email} - Attempt ${newAttempts}/${storedData.maxAttempts}, ${remainingAttempts} remaining`);
      
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
      _log('❌ [FORGOT PASSWORD] User not found for reset:', email);
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
