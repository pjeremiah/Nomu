const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const AbuseAlertService = require('../services/abuseAlertService');

// In-memory stores for rate limiting and abuse detection
// In production, use Redis for better performance and persistence
const employeeScans = new Map(); // employeeId -> { hourly: [], daily: [], lastScan: timestamp }
const customerScans = new Map(); // customerId -> { daily: [], points: 0, lastScan: timestamp }
const ipRequests = new Map(); // ip -> { requests: [], lastRequest: timestamp }
const abusePatterns = new Map(); // patternId -> { count: number, firstSeen: timestamp }

// Notification system for abuse detection
let io = null; // Socket.IO instance for real-time notifications

// Initialize notification system
function initializeNotifications(socketIO) {
  io = socketIO;
  console.log('🔔 [ABUSE NOTIFICATIONS] Security notification system initialized');
}

// Store abuse alert in web backend database
async function storeAbuseAlertInDatabase(alertData) {
  const webBackendUrl = process.env.WEB_BACKEND_URL || 'http://localhost:5000';
  
  try {
    const response = await fetch(`${webBackendUrl}/api/abuse-alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: alertData.type,
        employeeId: alertData.employeeId,
        customerId: alertData.customerId,
        abuseType: alertData.abuseType,
        details: alertData.details,
        severity: alertData.severity,
        message: generateAbuseMessage(alertData),
        violationCount: alertData.details?.count,
        timeWindow: alertData.details?.timeWindow,
        requiresAction: alertData.requiresAction,
        requiresImmediateAction: alertData.requiresImmediateAction || false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ [ABUSE ALERT] Stored in database with ID: ${result.alert.id}`);
    return result;
  } catch (error) {
    console.error('❌ [ABUSE ALERT] Failed to store in database:', error.message);
    throw error;
  }
}

// Generate abuse message based on alert data
function generateAbuseMessage(alertData) {
  const { type, employeeId, customerId, abuseType, details } = alertData;
  
  if (type === 'abuse_escalation') {
    return `Employee ${employeeId} has ${details?.violationCount || 0} abuse violations in ${details?.timeWindow || 'recent period'}`;
  }
  
  switch (abuseType) {
    case 'repeated_scans':
      return `Employee ${employeeId} scanned customer ${customerId} ${details?.count || 0} times repeatedly`;
    case 'rapid_fire':
      return `Employee ${employeeId} performed ${details?.count || 0} scans rapidly in ${details?.timeWindow || '1 minute'}`;
    case 'unusual_hours':
      return `Employee ${employeeId} scanning during unusual hours (${details?.currentHour || 'unknown'}:00)`;
    default:
      return `Abuse detected for employee ${employeeId}`;
  }
}

// Send abuse detection notification to managers and admins
async function notifyAbuseDetection(employeeId, customerId, abuseType, details) {
  const notification = {
    type: 'abuse_detected',
    employeeId: employeeId,
    customerId: customerId,
    abuseType: abuseType,
    details: details,
    severity: getAbuseSeverity(abuseType, details),
    timestamp: new Date().toISOString(),
    requiresAction: true
  };

  // Store abuse alert in web backend database
  try {
    await storeAbuseAlertInDatabase(notification);
    console.log(`✅ [ABUSE NOTIFICATIONS] Abuse alert stored in database for employee ${employeeId}`);
  } catch (error) {
    console.error('❌ [ABUSE NOTIFICATIONS] Failed to store abuse alert in database:', error);
  }

  // Send real-time notifications via Socket.IO (optional, for other clients)
  if (io) {
    try {
      // Send to all connected admin and super_admin users
      io.emit('admin_abuse_alert', notification);
      
      // Also send to general abuse monitoring
      io.emit('abuse_detected', notification);
      
      console.log(`🚨 [ABUSE NOTIFICATIONS] Real-time abuse alert sent:`, {
        employeeId,
        customerId,
        abuseType,
        severity: notification.severity
      });
    } catch (error) {
      console.error('❌ [ABUSE NOTIFICATIONS] Failed to send real-time abuse alert:', error);
    }
  } else {
    console.log('⚠️ [ABUSE NOTIFICATIONS] Socket.IO not initialized, skipping real-time notification');
  }

  // Send email notification
  try {
    await AbuseAlertService.sendAbuseAlert(notification);
    console.log(`📧 [ABUSE NOTIFICATIONS] Email abuse alert sent for employee ${employeeId}`);
  } catch (error) {
    console.error('❌ [ABUSE NOTIFICATIONS] Failed to send email abuse alert:', error);
  }
}

// Determine abuse severity level
function getAbuseSeverity(abuseType, details) {
  switch (abuseType) {
    case 'repeated_scans':
      if (details.count >= 10) return 'CRITICAL';
      if (details.count >= 7) return 'HIGH';
      return 'MEDIUM';
    case 'rapid_fire':
      if (details.count >= 50) return 'CRITICAL';
      if (details.count >= 30) return 'HIGH';
      return 'MEDIUM';
    case 'unusual_hours':
      return 'LOW';
    default:
      return 'MEDIUM';
  }
}

// Send escalation notification for repeated violations
async function notifyAbuseEscalation(employeeId, violationCount, timeWindow) {
  const notification = {
    type: 'abuse_escalation',
    employeeId: employeeId,
    violationCount: violationCount,
    timeWindow: timeWindow,
    severity: 'CRITICAL',
    message: `Employee ${employeeId} has ${violationCount} abuse violations in ${timeWindow}`,
    timestamp: new Date().toISOString(),
    requiresImmediateAction: true,
    details: {
      violationCount,
      timeWindow
    }
  };

  // Store abuse alert in web backend database
  try {
    await storeAbuseAlertInDatabase(notification);
    console.log(`✅ [ABUSE ESCALATION] Escalation alert stored in database for employee ${employeeId}`);
  } catch (error) {
    console.error('❌ [ABUSE ESCALATION] Failed to store escalation alert in database:', error);
  }

  // Send real-time notifications via Socket.IO (optional, for other clients)
  if (io) {
    try {
      // Send to super_admin only for escalations
      io.emit('admin_escalation_alert', notification);
      
      console.log(`🚨 [ABUSE ESCALATION] Real-time escalation alert sent for employee ${employeeId}:`, {
        violationCount,
        timeWindow
      });
    } catch (error) {
      console.error('❌ [ABUSE ESCALATION] Failed to send real-time escalation alert:', error);
    }
  } else {
    console.log('⚠️ [ABUSE ESCALATION] Socket.IO not initialized, skipping real-time escalation notification');
  }

  // Send email notification
  try {
    await AbuseAlertService.sendEscalationAlert(notification);
    console.log(`📧 [ABUSE ESCALATION] Email escalation alert sent for employee ${employeeId}`);
  } catch (error) {
    console.error('❌ [ABUSE ESCALATION] Failed to send email escalation alert:', error);
  }
}

// Configuration from environment variables
const config = {
  // IP-based rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // More realistic for production
  
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
    // Skip rate limiting for health checks only
    const shouldSkip = req.path === '/api/health';
    if (shouldSkip) {
      console.log(`🔓 [RATE LIMIT] Skipping rate limit for: ${req.path}`);
    }
    return shouldSkip;
  }
  // Removed custom keyGenerator - let express-rate-limit handle IP extraction automatically
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
    throw new Error('Daily scan limit exceeded');
  }
  
  // Check daily points limit
  if (customerData.points >= config.customerMaxPointsPerDay) {
    throw new Error('Daily points limit exceeded');
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
  
  // Check for suspicious patterns and send notifications
  if (patterns.sameCustomerMultipleTimes > config.abuseThresholdSameCustomer) {
    console.log(`🚨 [ABUSE DETECTION] Employee ${employeeId} scanning same customer ${customerId} repeatedly (${patterns.sameCustomerMultipleTimes} times)`);
    
    // Send abuse notification to managers
    notifyAbuseDetection(employeeId, customerId, 'repeated_scans', {
      count: patterns.sameCustomerMultipleTimes,
      threshold: config.abuseThresholdSameCustomer,
      timeWindow: '1 hour'
    });
    
    return true;
  }
  
  if (patterns.rapidFireScans > config.abuseThresholdRapidScans) {
    console.log(`🚨 [ABUSE DETECTION] Employee ${employeeId} scanning too rapidly (${patterns.rapidFireScans} scans)`);
    
    // Send abuse notification to managers
    notifyAbuseDetection(employeeId, customerId, 'rapid_fire', {
      count: patterns.rapidFireScans,
      threshold: config.abuseThresholdRapidScans,
      timeWindow: '1 minute'
    });
    
    return true;
  }
  
  if (patterns.unusualHours) {
    console.log(`🚨 [ABUSE DETECTION] Employee ${employeeId} scanning during unusual hours`);
    
    // Send abuse notification to managers
    notifyAbuseDetection(employeeId, customerId, 'unusual_hours', {
      currentHour: new Date().getHours(),
      timeWindow: '11 PM - 5 AM'
    });
    
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
  checkRepeatedScans,
  checkRapidScans,
  generateQrToken,
  validateJwtToken,
  securityHeaders,
  corsSecurity,
  config,
  initializeNotifications,
  notifyAbuseDetection,
  notifyAbuseEscalation
};
