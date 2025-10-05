const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// In-memory stores for rate limiting and abuse detection
// In production, use Redis for better performance and persistence
const employeeScans = new Map(); // employeeId -> { hourly: [], daily: [], lastScan: timestamp }
const customerScans = new Map(); // customerId -> { daily: [], points: 0, lastScan: timestamp }
const ipRequests = new Map(); // ip -> { requests: [], lastRequest: timestamp }
const abusePatterns = new Map(); // patternId -> { count: number, firstSeen: timestamp }

// Notification system for scan limits
let io = null; // Socket.IO instance for real-time notifications

// Initialize notification system
function initializeNotifications(socketIO) {
  io = socketIO;
  console.log('🔔 [NOTIFICATIONS] Security notification system initialized');
}

// Send notification to customer about scan limits
async function notifyCustomerScanLimit(customerId, limitType, currentCount, maxLimit) {
  if (!io) {
    console.log('⚠️ [NOTIFICATIONS] Socket.IO not initialized, cannot send notification');
    return;
  }

  try {
    const notification = {
      type: 'scan_limit_reached',
      customerId: customerId,
      limitType: limitType, // 'daily_scans' or 'daily_points'
      currentCount: currentCount,
      maxLimit: maxLimit,
      message: limitType === 'daily_scans' 
        ? `You've reached your daily scan limit (${currentCount}/${maxLimit}). Try again tomorrow!`
        : `You've reached your daily points limit (${currentCount}/${maxLimit}). Try again tomorrow!`,
      timestamp: new Date().toISOString(),
      retryAfter: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    };

    // Emit to all connected clients (customer apps will filter by customerId)
    io.emit('customer_scan_limit', notification);
    
    console.log(`🔔 [NOTIFICATIONS] Scan limit notification sent to customer ${customerId}:`, {
      limitType,
      currentCount,
      maxLimit
    });
  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Failed to send scan limit notification:', error);
  }
}

// Send notification about approaching scan limits
async function notifyCustomerApproachingLimit(customerId, limitType, currentCount, maxLimit) {
  if (!io) {
    return;
  }

  try {
    const remaining = maxLimit - currentCount;
    const notification = {
      type: 'scan_limit_warning',
      customerId: customerId,
      limitType: limitType,
      currentCount: currentCount,
      maxLimit: maxLimit,
      remaining: remaining,
      message: limitType === 'daily_scans'
        ? `You have ${remaining} scans remaining today (${currentCount}/${maxLimit})`
        : `You have ${remaining} points remaining today (${currentCount}/${maxLimit})`,
      timestamp: new Date().toISOString()
    };

    io.emit('customer_scan_warning', notification);
    
    console.log(`⚠️ [NOTIFICATIONS] Scan limit warning sent to customer ${customerId}:`, {
      limitType,
      currentCount,
      maxLimit,
      remaining
    });
  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Failed to send scan limit warning:', error);
  }
}


// Configuration from environment variables
const config = {
  // IP-based rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // Employee limits
  employeeMaxScansPerHour: parseInt(process.env.EMPLOYEE_MAX_SCANS_PER_HOUR) || 100,
  employeeMaxScansPerDay: parseInt(process.env.EMPLOYEE_MAX_SCANS_PER_DAY) || 500,
  employeeCooldownBetweenScans: parseInt(process.env.EMPLOYEE_COOLDOWN_BETWEEN_SCANS) || 5, // seconds
  
  // Customer limits
  customerMaxScansPerDay: parseInt(process.env.CUSTOMER_MAX_SCANS_PER_DAY) || 10,
  customerMaxPointsPerDay: parseInt(process.env.CUSTOMER_MAX_POINTS_PER_DAY) || 50,
  
  // JWT configuration
  jwtQrExpiry: process.env.JWT_QR_EXPIRY || '24h',
  jwtAdminExpiry: process.env.JWT_ADMIN_EXPIRY || '24h',
  
  // Abuse detection
  enableRealTimeAlerts: process.env.ENABLE_REAL_TIME_ALERTS === 'true',
  enableSuspiciousPatternDetection: process.env.ENABLE_SUSPICIOUS_PATTERN_DETECTION === 'true',
  abuseThresholdSameCustomer: parseInt(process.env.ABUSE_DETECTION_THRESHOLD_SAME_CUSTOMER) || 5,
  abuseThresholdRapidScans: parseInt(process.env.ABUSE_DETECTION_THRESHOLD_RAPID_SCANS) || 20
};

// IP-based rate limiting middleware
const ipRateLimit = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    error: 'Too many requests from this IP',
    message: `Rate limit exceeded. Maximum ${config.rateLimitMaxRequests} requests per ${config.rateLimitWindowMs / 1000 / 60} minutes.`,
    retryAfter: Math.ceil(config.rateLimitWindowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for specific endpoints if needed
    return false; // Apply rate limiting to all endpoints for testing
  },
  keyGenerator: ipKeyGenerator
});

// Employee rate limiting functions
function checkEmployeeLimits(employeeId) {
  const now = Date.now();
  const hour = Math.floor(now / (1000 * 60 * 60));
  
  if (!employeeScans.has(employeeId)) {
    employeeScans.set(employeeId, {
      hourly: [],
      daily: [],
      lastScan: 0
    });
  }
  
  const employeeData = employeeScans.get(employeeId);
  
  // Check hourly limit
  const hourlyScans = employeeData.hourly.filter(scan => scan.hour === hour);
  if (hourlyScans.length >= config.employeeMaxScansPerHour) {
    throw new Error('Hourly scan limit exceeded');
  }
  
  // Check cooldown
  if (now - employeeData.lastScan < config.employeeCooldownBetweenScans * 1000) {
    throw new Error('Please wait before next scan');
  }
  
  // Check daily limit
  const today = new Date().toDateString();
  const dailyScans = employeeData.daily.filter(scan => scan.date === today);
  if (dailyScans.length >= config.employeeMaxScansPerDay) {
    throw new Error('Daily scan limit exceeded');
  }
  
  return true;
}

function recordEmployeeScan(employeeId, customerId) {
  const now = Date.now();
  const hour = Math.floor(now / (1000 * 60 * 60));
  const today = new Date().toDateString();
  
  if (!employeeScans.has(employeeId)) {
    employeeScans.set(employeeId, {
      hourly: [],
      daily: [],
      lastScan: 0
    });
  }
  
  const employeeData = employeeScans.get(employeeId);
  
  // Record scan
  employeeData.hourly.push({ hour, timestamp: now, customerId });
  employeeData.daily.push({ date: today, timestamp: now, customerId });
  employeeData.lastScan = now;
  
  // Clean up old data (keep only last 24 hours for hourly, last 7 days for daily)
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  
  employeeData.hourly = employeeData.hourly.filter(scan => scan.timestamp > oneDayAgo);
  employeeData.daily = employeeData.daily.filter(scan => scan.timestamp > oneWeekAgo);
}

// Customer rate limiting functions
function checkCustomerLimits(customerId) {
  const now = Date.now();
  const today = new Date().toDateString();
  
  if (!customerScans.has(customerId)) {
    customerScans.set(customerId, {
      daily: [],
      points: 0,
      lastScan: 0
    });
  }
  
  const customerData = customerScans.get(customerId);
  
  // Check daily scan limit
  const dailyScans = customerData.daily.filter(scan => scan.date === today);
  if (dailyScans.length >= config.customerMaxScansPerDay) {
    // Send notification to customer about scan limit reached
    notifyCustomerScanLimit(customerId, 'daily_scans', dailyScans.length, config.customerMaxScansPerDay);
    throw new Error('Daily scan limit exceeded');
  }
  
  // Check daily points limit
  if (customerData.points >= config.customerMaxPointsPerDay) {
    // Send notification to customer about points limit reached
    notifyCustomerScanLimit(customerId, 'daily_points', customerData.points, config.customerMaxPointsPerDay);
    throw new Error('Daily points limit exceeded');
  }
  
  // Send warning notifications when approaching limits
  const scanWarningThreshold = Math.floor(config.customerMaxScansPerDay * 0.8); // 80% of limit
  const pointsWarningThreshold = Math.floor(config.customerMaxPointsPerDay * 0.8); // 80% of limit
  
  if (dailyScans.length >= scanWarningThreshold && dailyScans.length < config.customerMaxScansPerDay) {
    notifyCustomerApproachingLimit(customerId, 'daily_scans', dailyScans.length, config.customerMaxScansPerDay);
  }
  
  if (customerData.points >= pointsWarningThreshold && customerData.points < config.customerMaxPointsPerDay) {
    notifyCustomerApproachingLimit(customerId, 'daily_points', customerData.points, config.customerMaxPointsPerDay);
  }
  
  return true;
}

function recordCustomerScan(customerId, pointsEarned = 1) {
  const now = Date.now();
  const today = new Date().toDateString();
  
  if (!customerScans.has(customerId)) {
    customerScans.set(customerId, {
      daily: [],
      points: 0,
      lastScan: 0
    });
  }
  
  const customerData = customerScans.get(customerId);
  
  // Record scan and points
  customerData.daily.push({ date: today, timestamp: now, points: pointsEarned });
  customerData.points += pointsEarned;
  customerData.lastScan = now;
  
  // Clean up old data (keep only last 7 days)
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  customerData.daily = customerData.daily.filter(scan => scan.timestamp > oneWeekAgo);
}

// Abuse detection functions
function detectAbuse(employeeId, customerId) {
  if (!config.enableSuspiciousPatternDetection) return false;
  
  const now = Date.now();
  const patterns = {
    sameCustomerMultipleTimes: checkRepeatedScans(employeeId, customerId),
    rapidFireScans: checkRapidScans(employeeId),
    unusualHours: checkScanHours(employeeId)
  };
  
  // Check for suspicious patterns
  if (patterns.sameCustomerMultipleTimes > config.abuseThresholdSameCustomer) {
    console.log(`🚨 [ABUSE DETECTION] Employee ${employeeId} scanning same customer ${customerId} repeatedly (${patterns.sameCustomerMultipleTimes} times)`);
    return true;
  }
  
  if (patterns.rapidFireScans > config.abuseThresholdRapidScans) {
    console.log(`🚨 [ABUSE DETECTION] Employee ${employeeId} scanning too rapidly (${patterns.rapidFireScans} scans)`);
    return true;
  }
  
  return false;
}

function checkRepeatedScans(employeeId, customerId) {
  if (!employeeScans.has(employeeId)) return 0;
  
  const employeeData = employeeScans.get(employeeId);
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  
  return employeeData.hourly.filter(scan => 
    scan.customerId === customerId && scan.timestamp > oneHourAgo
  ).length;
}

function checkRapidScans(employeeId) {
  if (!employeeScans.has(employeeId)) return 0;
  
  const employeeData = employeeScans.get(employeeId);
  const now = Date.now();
  const oneMinuteAgo = now - (60 * 1000);
  
  return employeeData.hourly.filter(scan => scan.timestamp > oneMinuteAgo).length;
}

function checkScanHours(employeeId) {
  if (!employeeScans.has(employeeId)) return false;
  
  const now = new Date();
  const hour = now.getHours();
  
  // Unusual hours: between 11 PM and 5 AM
  return hour >= 23 || hour <= 5;
}

// JWT token generation for QR codes
function generateQrToken(userId) {
  return jwt.sign(
    {
      userId: userId,
      sessionId: uuidv4(),
      type: 'qr_loyalty',
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET,
    { expiresIn: config.jwtQrExpiry }
  );
}

// JWT token validation
function validateJwtToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// Security headers middleware
function securityHeaders(req, res, next) {
  if (process.env.ENABLE_SECURITY_HEADERS === 'true') {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  }
  next();
}

// CORS security middleware
function corsSecurity(req, res, next) {
  if (process.env.ENABLE_CORS_SECURITY === 'true') {
    // Only allow specific origins in production
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:5001',
      'http://localhost:5002'
    ];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  next();
}

// Cleanup old data periodically
setInterval(() => {
  const now = Date.now();
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  
  // Clean up employee scans
  for (const [employeeId, data] of employeeScans.entries()) {
    data.hourly = data.hourly.filter(scan => scan.timestamp > oneWeekAgo);
    data.daily = data.daily.filter(scan => scan.timestamp > oneWeekAgo);
    
    if (data.hourly.length === 0 && data.daily.length === 0) {
      employeeScans.delete(employeeId);
    }
  }
  
  // Clean up customer scans
  for (const [customerId, data] of customerScans.entries()) {
    data.daily = data.daily.filter(scan => scan.timestamp > oneWeekAgo);
    
    if (data.daily.length === 0) {
      customerScans.delete(customerId);
    }
  }
  
  // Clean up IP requests
  for (const [ip, data] of ipRequests.entries()) {
    data.requests = data.requests.filter(timestamp => timestamp > oneWeekAgo);
    
    if (data.requests.length === 0) {
      ipRequests.delete(ip);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour

module.exports = {
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
};
