const FailedAttempt = require('../models/FailedAttempt');

// Middleware to check if user is locked due to failed attempts
const checkFailedAttempts = async (req, res, next) => {
  try {
    const email = req.body.email;
    const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent') || '';
    
    if (!email) {
      return next();
    }
    
    // Check if user is locked
    const lockedAttempt = await FailedAttempt.isUserLocked(email, ipAddress);
    
    if (lockedAttempt) {
      const remainingTime = Math.ceil((lockedAttempt.lockedUntil - new Date()) / 1000 / 60); // in minutes
      
      return res.status(429).json({
        error: 'Account temporarily locked',
        message: `Too many failed login attempts. Please try again in ${remainingTime} minutes.`,
        lockedUntil: lockedAttempt.lockedUntil,
        remainingMinutes: remainingTime,
        attemptCount: lockedAttempt.attemptCount
      });
    }
    
    // Store email and IP for later use
    req.failedAttemptData = { email, ipAddress, userAgent };
    next();
  } catch (error) {

    next(); // Continue if there's an error
  }
};

// Middleware to record failed attempt
const recordFailedAttempt = async (req, res, next) => {
  try {
    if (req.failedAttemptData && req.shouldRecordFailedAttempt) {
      const { email, ipAddress, userAgent } = req.failedAttemptData;
      const type = req.body.otp ? 'otp' : 'login'; // Determine attempt type
      
      const attempt = await FailedAttempt.recordFailedAttempt(email, ipAddress, userAgent, type);
      
      // Add attempt info to response for debugging
      req.failedAttemptInfo = {
        attemptCount: attempt.attemptCount,
        isLocked: attempt.isLocked,
        lockedUntil: attempt.lockedUntil
      };
    }
    next();
  } catch (error) {

    next(); // Continue if there's an error
  }
};

// Middleware to clear failed attempts on successful login
const clearFailedAttempts = async (req, res, next) => {
  try {
    if (req.failedAttemptData && req.shouldClearFailedAttempts) {
      const { email, ipAddress } = req.failedAttemptData;
      const type = req.body.otp ? 'otp' : 'login';
      
      await FailedAttempt.clearFailedAttempts(email, ipAddress, type);
    }
    next();
  } catch (error) {

    next(); // Continue if there's an error
  }
};

// Helper function to get remaining lock time
const getRemainingLockTime = async (email, ipAddress, type = 'login') => {
  try {
    return await FailedAttempt.getRemainingLockTime(email, ipAddress, type);
  } catch (error) {

    return 0;
  }
};

module.exports = {
  checkFailedAttempts,
  recordFailedAttempt,
  clearFailedAttempts,
  getRemainingLockTime
};
