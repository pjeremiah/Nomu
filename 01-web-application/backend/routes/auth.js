const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Admin = require('../models/Admin');
const TempSignup = require('../models/TempSignup');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');

// Import security middleware
const { authRateLimiter, signupRateLimiter, sanitizeInput, validateInput } = require('../middleware/securityMiddleware');

// Import failed attempt middleware
const { checkFailedAttempts, recordFailedAttempt, clearFailedAttempts } = require('../middleware/failedAttemptMiddleware');

// Import OTP service
const otpService = require('../services/otpService');

require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;

// Email validation function - only allow @gmail.com
const isValidEmail = (email) => email.toLowerCase().endsWith('@gmail.com');

// POST /signup - Request OTP for customer signup
router.post('/signup', 
  signupRateLimiter,
  sanitizeInput,
  [
    body('fullName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Full name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Full name can only contain letters and spaces'),
    
    body('username')
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('Username must be between 3 and 20 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .custom((value) => {
        if (!isValidEmail(value)) {
          throw new Error('Please use a valid Gmail address (ending with @gmail.com)');
        }
        return true;
      })
      .normalizeEmail(),
    
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]+$/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
    body('birthday')
      .isISO8601()
      .withMessage('Please provide a valid birthday')
      .custom((value) => {
        const birthday = new Date(value);
        const today = new Date();
        const ageInYears = today.getFullYear() - birthday.getFullYear();
        const monthDiff = today.getMonth() - birthday.getMonth();
        
        // Check if birthday has passed this year
        const hasBirthdayPassed = monthDiff > 0 || (monthDiff === 0 && today.getDate() >= birthday.getDate());
        const actualAge = hasBirthdayPassed ? ageInYears : ageInYears - 1;
        
        if (actualAge < 1) {
          throw new Error('You must be at least 1 year old to create an account');
        }
        return true;
      }),
    
    body('gender')
      .isIn(['Male', 'Female', 'Prefer not to say'])
      .withMessage('Gender must be Male, Female, or Prefer not to say')
  ],
  validateInput,
  async (req, res) => {
    // Get data from request body (frontend sends camelCase)
    const { 
      fullName, username, email, birthday, gender, password
    } = req.body;

    // Use camelCase directly for database
    const finalFullName = fullName;
    const finalUsername = username;
    const finalEmail = email;
    const finalBirthday = birthday;
    const finalGender = gender;
    const finalPassword = password;
    
    try {
      // Additional server-side validation
      if (!finalFullName || !finalUsername || !finalEmail || !finalBirthday || !finalGender || !finalPassword) {
        return res.status(400).json({ 
          message: 'All fields are required' 
        });
      }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: finalEmail.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ 
        message: 'Email already in use' 
      });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: finalUsername });
    if (existingUsername) {
      return res.status(400).json({ 
        message: 'Username already taken' 
      });
    }

      // Store signup data temporarily
      const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
      const userAgent = req.get('User-Agent') || '';
      
      // Hash password before storing
      const hashedPassword = await bcrypt.hash(finalPassword, 10);

      // Store in temporary collection
      const tempSignup = new TempSignup({
        email: finalEmail.toLowerCase(),
        fullName: finalFullName,
        username: finalUsername,
        password: hashedPassword,
        birthday: finalBirthday,
        gender: finalGender,
        ipAddress,
        userAgent
      });
      
      await tempSignup.save();

      // Generate and send OTP (force new for resend functionality)
      const otpResult = await otpService.createAndSendOTP(finalEmail, 'email_verification', true);
      
      if (!otpResult.success) {
        return res.status(500).json({ 
          message: 'Failed to send verification email', 
          error: otpResult.error 
        });
      }

        res.status(200).json({
          message: 'Verification code sent to your email address',
          requiresOTP: true,
          userType: 'signup',
          expiresAt: otpResult.expiresAt
      });

  } catch (err) {

    
    // Handle mongoose validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Invalid input data', 
        error: err.message 
      });
    }

    // Handle duplicate key errors
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: 'Email or username already exists' 
      });
    }

    res.status(500).json({ 
      message: 'Server error', 
      error: err.message 
    });
  }
  }
);

// POST /signup/verify-otp - Verify OTP and complete customer signup
router.post('/signup/verify-otp',
  checkFailedAttempts,
  sanitizeInput,
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    
    body('otp')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
      .isNumeric()
      .withMessage('OTP must contain only numbers')
  ],
  validateInput,
  async (req, res) => {
    const { email, otp } = req.body;
    
    try {
      // Verify OTP
      const otpResult = await otpService.verifyOTP(email, otp, 'email_verification');
      
      if (!otpResult.success) {
        // Record failed OTP attempt
        req.shouldRecordFailedAttempt = true;
        await recordFailedAttempt(req, res, () => {});
        return res.status(400).json({ message: otpResult.message });
      }

      // Get temporary signup data
      const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
      const tempSignup = await TempSignup.findOne({
        email: email.toLowerCase(),
        ipAddress: ipAddress
      });

      if (!tempSignup) {
        return res.status(400).json({ 
          message: 'Signup session expired. Please start the signup process again.' 
        });
      }

      // Check if email or username still available (in case of race conditions)
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        await TempSignup.findByIdAndDelete(tempSignup._id);
        return res.status(400).json({ 
          message: 'Email already in use' 
        });
      }

      const existingUsername = await User.findOne({ username: tempSignup.username });
      if (existingUsername) {
        await TempSignup.findByIdAndDelete(tempSignup._id);
        return res.status(400).json({ 
          message: 'Username already taken' 
        });
      }

      // Create new user
      const newUser = new User({
        fullName: tempSignup.fullName,
        username: tempSignup.username,
        email: tempSignup.email,
        birthday: tempSignup.birthday,
        gender: tempSignup.gender,
        password: tempSignup.password,
        role: 'Customer'
      });

      // Save user to database
      await newUser.save();

      // Send congratulatory email
      const emailService = require('../services/emailService');
      const congratsResult = await emailService.sendCongratsEmail(email, 'signup_success', {
        fullName: newUser.fullName,
        email: newUser.email,
        username: newUser.username
      });

      if (!congratsResult.success) {

        // Don't fail the signup if email fails, just log it
      }

      // Clean up temporary data
      await TempSignup.findByIdAndDelete(tempSignup._id);

      // Clear any failed attempts
      req.shouldClearFailedAttempts = true;
      await clearFailedAttempts(req, res, () => {});

      res.status(201).json({ 
        message: 'Account created successfully! Please sign in to continue.',
        user: {
          id: newUser._id,
          email: newUser.email,
          username: newUser.username,
          fullName: newUser.fullName
        }
      });

    } catch (err) {

      
      // Handle mongoose validation errors
      if (err.name === 'ValidationError') {
        return res.status(400).json({ 
          message: 'Invalid input data', 
          error: err.message 
        });
      }

      // Handle duplicate key errors
      if (err.code === 11000) {
        return res.status(400).json({ 
          message: 'Email or username already exists' 
        });
      }

      res.status(500).json({ 
        message: 'Server error', 
        error: err.message 
      });
    }
  }
);

// POST /forgot-password - Request OTP for password reset
router.post('/forgot-password',
  authRateLimiter,
  checkFailedAttempts,
  sanitizeInput,
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .custom((value) => {
        if (!isValidEmail(value)) {
          throw new Error('Please use a valid Gmail address (ending with @gmail.com)');
        }
        return true;
      })
      .normalizeEmail()
  ],
  validateInput,
  async (req, res) => {
    const { email } = req.body;
    
    try {
      // Check if user exists
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Record failed attempt for non-existent email
        req.shouldRecordFailedAttempt = true;
        await recordFailedAttempt(req, res, () => {});
        return res.status(400).json({ 
          message: 'No account found with this email address' 
        });
      }

      // Generate and send OTP (force new for resend functionality)
      const otpResult = await otpService.createAndSendOTP(email, 'password_reset', true);
      
      if (!otpResult.success) {
        return res.status(500).json({ 
          message: 'Failed to send reset code', 
          error: otpResult.error 
        });
      }

      // Clear any failed attempts
      req.shouldClearFailedAttempts = true;
      await clearFailedAttempts(req, res, () => {});

      res.status(200).json({
        message: 'Password reset code sent to your email address',
        requiresOTP: true,
        userType: 'password_reset',
        expiresAt: otpResult.expiresAt
      });

    } catch (err) {

      res.status(500).json({ 
        message: 'Server error', 
        error: err.message 
      });
    }
  }
);

// POST /reset-password - Verify OTP and reset password
router.post('/reset-password',
  authRateLimiter,
  checkFailedAttempts,
  sanitizeInput,
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    
    body('otp')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
      .isNumeric()
      .withMessage('OTP must contain only numbers'),
    
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]+$/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  ],
  validateInput,
  async (req, res) => {
    const { email, otp, newPassword } = req.body;
    
    try {
      // Verify OTP
      const otpResult = await otpService.verifyOTP(email, otp, 'password_reset');
      
      if (!otpResult.success) {
        // Record failed OTP attempt
        req.shouldRecordFailedAttempt = true;
        await recordFailedAttempt(req, res, () => {});
        return res.status(400).json({ message: otpResult.message });
      }

      // Find user
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(400).json({ 
          message: 'User not found' 
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      await User.findByIdAndUpdate(user._id, { 
        password: hashedPassword 
      });

      // Send congratulatory email
      const emailService = require('../services/emailService');
      const congratsResult = await emailService.sendCongratsEmail(email, 'password_reset_success', {
        fullName: user.fullName,
        email: user.email,
        username: user.username
      });

      if (!congratsResult.success) {

        // Don't fail the password reset if email fails, just log it
      }

      // Clear any failed attempts
      req.shouldClearFailedAttempts = true;
      await clearFailedAttempts(req, res, () => {});

      res.status(200).json({ 
        message: 'Password reset successfully! You can now sign in with your new password.'
      });

    } catch (err) {

      res.status(500).json({ 
        message: 'Server error', 
        error: err.message 
      });
    }
  }
);

// POST /admin/request-otp - Request OTP for admin login
router.post('/admin/request-otp',
  authRateLimiter,
  checkFailedAttempts,
  sanitizeInput,
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  validateInput,
  async (req, res) => {
    const { email, password } = req.body;
    
    try {
      // First verify admin credentials
      const admin = await Admin.findOne({ email: email.toLowerCase() });
      if (!admin) {
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        // Record failed attempt
        req.shouldRecordFailedAttempt = true;
        await recordFailedAttempt(req, res, () => {});
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      // Generate and send OTP (force new for resend functionality)
      const otpResult = await otpService.createAndSendOTP(email, 'admin_login', true);
      
      if (!otpResult.success) {
        return res.status(500).json({ 
          message: 'Failed to send OTP', 
          error: otpResult.error 
        });
      }

      // Clear any previous failed attempts on successful credential verification
      req.shouldClearFailedAttempts = true;
      await clearFailedAttempts(req, res, () => {});

      res.status(200).json({
        message: 'OTP sent to your email address',
        expiresAt: otpResult.expiresAt
      });

    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// POST /admin/send-login-otp - Alias for /admin/request-otp (mobile compatibility)
router.post('/admin/send-login-otp',
  authRateLimiter,
  checkFailedAttempts,
  sanitizeInput,
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail()
  ],
  validateInput,
  async (req, res) => {
    const { email } = req.body;
    
    try {
      // Check if admin exists
      const admin = await Admin.findOne({ email: email.toLowerCase() });
      if (!admin) {
        return res.status(400).json({ message: 'Admin not found' });
      }

      // Generate and send OTP
      const otpResult = await otpService.createAndSendOTP(email, 'admin_login', true);
      
      if (!otpResult.success) {
        return res.status(500).json({ 
          message: 'Failed to send OTP', 
          error: otpResult.error 
        });
      }

      res.status(200).json({
        message: 'OTP sent to your email address',
        expiresAt: otpResult.expiresAt
      });

    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// POST /admin/verify-login-otp - Alias for /admin/verify-otp (mobile compatibility)
router.post('/admin/verify-login-otp',
  checkFailedAttempts,
  sanitizeInput,
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    
    body('otp')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
      .isNumeric()
      .withMessage('OTP must contain only numbers')
  ],
  validateInput,
  async (req, res) => {
    const { email, otp } = req.body;
    
    try {
      // Verify OTP
      const otpResult = await otpService.verifyOTP(email, otp, 'admin_login');
      
      if (!otpResult.success) {
        req.shouldRecordFailedAttempt = true;
        await recordFailedAttempt(req, res, () => {});
        await otpService.incrementFailedAttempt(email, otp, 'admin_login');
        return res.status(400).json({ message: otpResult.message });
      }

      // Get admin details
      const admin = await Admin.findOne({ email: email.toLowerCase() });
      if (!admin) {
        return res.status(400).json({ message: 'Admin not found' });
      }

      // Update admin status and last login
      await Admin.findByIdAndUpdate(admin._id, { 
        status: 'active',
        lastLoginAt: new Date(),
        firstLoginCompleted: true
      });

      const role = admin.role || 'staff';
      
      // Clear failed attempts on successful login
      req.shouldClearFailedAttempts = true;
      await clearFailedAttempts(req, res, () => {});

      const token = jwt.sign({ 
        userId: admin._id, 
        email: admin.email, 
        role: role, 
        principalType: 'admin' 
      }, JWT_SECRET, { expiresIn: '1d' });
      
      res.status(200).json({
        message: 'Admin login successful',
        token,
        user: {
          id: admin._id,
          email: admin.email,
          fullName: admin.fullName,
          role: role,
          status: 'active',
          isFirstLogin: true
        }
      });

    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// POST /admin/verify-otp - Verify OTP and complete admin login
router.post('/admin/verify-otp',
  checkFailedAttempts,
  sanitizeInput,
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    
    body('otp')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
      .isNumeric()
      .withMessage('OTP must contain only numbers')
  ],
  validateInput,
  async (req, res) => {
    const { email, otp, rememberFor30Days } = req.body;
    
    try {
      // Verify OTP
      const otpResult = await otpService.verifyOTP(email, otp, 'admin_login');
      
      if (!otpResult.success) {
        // Record failed OTP attempt
        req.shouldRecordFailedAttempt = true;
        await recordFailedAttempt(req, res, () => {});
        // Also increment OTP service failed attempt
        await otpService.incrementFailedAttempt(email, otp, 'admin_login');
        return res.status(400).json({ message: otpResult.message });
      }

      // Get admin details
      const admin = await Admin.findOne({ email: email.toLowerCase() });
      if (!admin) {
        return res.status(400).json({ message: 'Admin not found' });
      }

      // Always show "Welcome" for admin accounts (not "Welcome Back")
      const isFirstLogin = true;
      
      // Calculate rememberUntil date if rememberFor30Days is true
      const rememberUntil = rememberFor30Days ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;
      
      // Update admin status, last login, and mark first login as completed
      await Admin.findByIdAndUpdate(admin._id, { 
        status: 'active',
        lastLoginAt: new Date(),
        firstLoginCompleted: true,
        rememberUntil: rememberUntil
      });

      const role = admin.role || 'staff';
      
      // Clear failed attempts on successful login
      req.shouldClearFailedAttempts = true;
      await clearFailedAttempts(req, res, () => {});

      const tokenExpiry = rememberFor30Days ? '30d' : '1d';
      
      const token = jwt.sign({ 
        userId: admin._id, 
        email: admin.email, 
        role: role, 
        principalType: 'admin' 
      }, JWT_SECRET, { expiresIn: tokenExpiry });

      res.status(200).json({
        message: 'Admin login successful',
        token,
        user: {
          id: admin._id,
          email: admin.email,
          fullName: admin.fullName,
          role: role,
          status: 'active',
          isFirstLogin: isFirstLogin
        }
      });

    } catch (err) {
      console.error('❌ [ADMIN OTP VERIFY] Error:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// POST /login - Alias for signin (for frontend compatibility)
router.post('/login', 
  authRateLimiter,
  checkFailedAttempts,
  sanitizeInput,
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  validateInput,
  async (req, res) => {
    // Call signin logic directly
    const { email, password } = req.body;
    
    try {
      // Check if this is an admin login
      const admin = await Admin.findOne({ email: email.toLowerCase() });
      if (admin) {
        // Verify admin password first before proceeding to OTP
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
          // Record failed attempt for wrong admin password
          req.shouldRecordFailedAttempt = true;
          await recordFailedAttempt(req, res, () => {});
          return res.status(400).json({ message: 'Invalid email or password' });
        }
        
        // Check if admin has valid rememberUntil date (skip OTP if still valid)
        if (admin.rememberUntil && new Date() < admin.rememberUntil) {
          // Update last login time and set status to active
          await Admin.findByIdAndUpdate(admin._id, { 
            lastLoginAt: new Date(),
            status: 'active'
          });
          
          // Clear failed attempts on successful login
          req.shouldClearFailedAttempts = true;
          await clearFailedAttempts(req, res, () => {});
          
          const role = admin.role || 'staff';
          const token = jwt.sign({ 
            userId: admin._id, 
            email: admin.email, 
            role: role, 
            principalType: 'admin' 
          }, JWT_SECRET, { expiresIn: '30d' });
          
          return res.status(200).json({
            message: 'Admin login successful',
            token,
            user: {
              id: admin._id,
              email: admin.email,
              fullName: admin.fullName,
              role: role,
              status: 'active',
              isFirstLogin: false
            }
          });
        }
        
        // Admin credentials are correct, proceed to OTP flow
        return res.status(200).json({
          message: 'Admin login requires OTP verification',
          requiresOTP: true,
          userType: 'admin'
        });
      }

      // Handle customer login
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Record failed attempt for non-existent user
        req.shouldRecordFailedAttempt = true;
        await recordFailedAttempt(req, res, () => {});
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        // Record failed attempt for wrong password
        req.shouldRecordFailedAttempt = true;
        await recordFailedAttempt(req, res, () => {});
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      // Clear failed attempts on successful login
      req.shouldClearFailedAttempts = true;
      await clearFailedAttempts(req, res, () => {});

      const role = user.role || 'Customer';
      const token = jwt.sign({ 
        userId: user._id, 
        email: user.email, 
        role: role,
        principalType: 'Customer' 
      }, JWT_SECRET, { expiresIn: '1d' });

      res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          birthday: user.birthday,
          gender: user.gender,
          employmentStatus: user.employmentStatus,
          profilePicture: user.profilePicture || '',
          role: role
        },
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// POST /register - Alias for signup (for frontend compatibility)
router.post('/register', 
  signupRateLimiter,
  sanitizeInput,
  [
    body('fullName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Full name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Full name can only contain letters and spaces'),
    
    body('username')
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('Username must be between 3 and 20 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .custom((value) => {
        if (!isValidEmail(value)) {
          throw new Error('Please use a valid Gmail address (ending with @gmail.com)');
        }
        return true;
      })
      .normalizeEmail(),
    
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]+$/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
    body('birthday')
      .isISO8601()
      .withMessage('Please provide a valid birthday')
      .custom((value) => {
        const birthday = new Date(value);
        const today = new Date();
        const ageInYears = today.getFullYear() - birthday.getFullYear();
        const monthDiff = today.getMonth() - birthday.getMonth();
        
        // Check if birthday has passed this year
        const hasBirthdayPassed = monthDiff > 0 || (monthDiff === 0 && today.getDate() >= birthday.getDate());
        const actualAge = hasBirthdayPassed ? ageInYears : ageInYears - 1;
        
        if (actualAge < 1) {
          throw new Error('You must be at least 1 year old to create an account');
        }
        return true;
      }),
    
    body('gender')
      .isIn(['Male', 'Female', 'Prefer not to say'])
      .withMessage('Gender must be Male, Female, or Prefer not to say')
  ],
  validateInput,
  async (req, res) => {
    // Call signup logic directly
    const { 
      fullName, username, email, birthday, gender, password
    } = req.body;

    // Use camelCase directly for database
    const finalFullName = fullName;
    const finalUsername = username;
    const finalEmail = email;
    const finalBirthday = birthday;
    const finalGender = gender;
    const finalPassword = password;
    
    try {
      // Additional server-side validation
      if (!finalFullName || !finalUsername || !finalEmail || !finalBirthday || !finalGender || !finalPassword) {
        return res.status(400).json({ 
          message: 'All fields are required' 
        });
      }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: finalEmail.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ 
        message: 'Email already in use' 
      });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: finalUsername });
    if (existingUsername) {
      return res.status(400).json({ 
        message: 'Username already taken' 
      });
    }

      // Store signup data temporarily
      const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
      const userAgent = req.get('User-Agent') || '';
      
      // Hash password before storing
      const hashedPassword = await bcrypt.hash(finalPassword, 10);

      // Store in temporary collection
      const tempSignup = new TempSignup({
        email: finalEmail.toLowerCase(),
        fullName: finalFullName,
        username: finalUsername,
        password: hashedPassword,
        birthday: finalBirthday,
        gender: finalGender,
        ipAddress,
        userAgent
      });
      
      await tempSignup.save();

      // Generate and send OTP (force new for resend functionality)
      const otpResult = await otpService.createAndSendOTP(finalEmail, 'email_verification', true);
      
      if (!otpResult.success) {
        return res.status(500).json({ 
          message: 'Failed to send verification email', 
          error: otpResult.error 
        });
      }

        res.status(200).json({
          message: 'Verification code sent to your email address',
          requiresOTP: true,
          userType: 'signup',
          expiresAt: otpResult.expiresAt
      });

  } catch (err) {

    
    // Handle mongoose validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Invalid input data', 
        error: err.message 
      });
    }

    // Handle duplicate key errors
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: 'Email or username already exists' 
      });
    }

    res.status(500).json({ 
      message: 'Server error', 
      error: err.message 
    });
  }
  }
);

// POST /verify-otp - Alias for signup/verify-otp (for frontend compatibility)
router.post('/verify-otp',
  checkFailedAttempts,
  sanitizeInput,
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    
    body('otp')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
      .isNumeric()
      .withMessage('OTP must contain only numbers')
  ],
  validateInput,
  async (req, res) => {
    // Call signup/verify-otp logic directly
    const { email, otp } = req.body;
    
    try {
      // Verify OTP
      const otpResult = await otpService.verifyOTP(email, otp, 'email_verification');
      
      if (!otpResult.success) {
        // Record failed OTP attempt
        req.shouldRecordFailedAttempt = true;
        await recordFailedAttempt(req, res, () => {});
        return res.status(400).json({ message: otpResult.message });
      }

      // Get temporary signup data
      const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
      const tempSignup = await TempSignup.findOne({
        email: email.toLowerCase(),
        ipAddress: ipAddress
      });

      if (!tempSignup) {
        return res.status(400).json({ 
          message: 'Signup session expired. Please start the signup process again.' 
        });
      }

      // Check if email or username still available (in case of race conditions)
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        await TempSignup.findByIdAndDelete(tempSignup._id);
        return res.status(400).json({ 
          message: 'Email already in use' 
        });
      }

      const existingUsername = await User.findOne({ username: tempSignup.username });
      if (existingUsername) {
        await TempSignup.findByIdAndDelete(tempSignup._id);
        return res.status(400).json({ 
          message: 'Username already taken' 
        });
      }

      // Create new user
      const newUser = new User({
        fullName: tempSignup.fullName,
        username: tempSignup.username,
        email: tempSignup.email,
        birthday: tempSignup.birthday,
        gender: tempSignup.gender,
        password: tempSignup.password,
        role: 'Customer'
      });

      // Save user to database
      await newUser.save();

      // Send congratulatory email
      const emailService = require('../services/emailService');
      const congratsResult = await emailService.sendCongratsEmail(email, 'signup_success', {
        fullName: newUser.fullName,
        email: newUser.email,
        username: newUser.username
      });

      if (!congratsResult.success) {

        // Don't fail the signup if email fails, just log it
      }

      // Clean up temporary data
      await TempSignup.findByIdAndDelete(tempSignup._id);

      // Clear any failed attempts
      req.shouldClearFailedAttempts = true;
      await clearFailedAttempts(req, res, () => {});

      res.status(201).json({ 
        message: 'Account created successfully! Please sign in to continue.',
        user: {
          id: newUser._id,
          email: newUser.email,
          username: newUser.username,
          fullName: newUser.fullName
        }
      });

    } catch (err) {

      
      // Handle mongoose validation errors
      if (err.name === 'ValidationError') {
        return res.status(400).json({ 
          message: 'Invalid input data', 
          error: err.message 
        });
      }

      // Handle duplicate key errors
      if (err.code === 11000) {
        return res.status(400).json({ 
          message: 'Email or username already exists' 
        });
      }

      res.status(500).json({ 
        message: 'Server error', 
        error: err.message 
      });
    }
  }
);

// POST /signin
router.post('/signin', 
  authRateLimiter,
  checkFailedAttempts,
  sanitizeInput,
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  validateInput,
  async (req, res) => {
    const { email, password } = req.body;
    
    try {
      // Check if this is an admin login
      const admin = await Admin.findOne({ email: email.toLowerCase() });
      if (admin) {
        // Verify admin password first before proceeding to OTP
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
          // Record failed attempt for wrong admin password
          req.shouldRecordFailedAttempt = true;
          await recordFailedAttempt(req, res, () => {});
          return res.status(400).json({ message: 'Invalid email or password' });
        }
        
        // Check if admin has valid rememberUntil date (skip OTP if still valid)
        if (admin.rememberUntil && new Date() < admin.rememberUntil) {
          // Update last login time and set status to active
          await Admin.findByIdAndUpdate(admin._id, { 
            lastLoginAt: new Date(),
            status: 'active'
          });
          
          // Clear failed attempts on successful login
          req.shouldClearFailedAttempts = true;
          await clearFailedAttempts(req, res, () => {});
          
          const role = admin.role || 'staff';
          const token = jwt.sign({ 
            userId: admin._id, 
            email: admin.email, 
            role: role, 
            principalType: 'admin' 
          }, JWT_SECRET, { expiresIn: '30d' });
          
          return res.status(200).json({
            message: 'Admin login successful',
            token,
            user: {
              id: admin._id,
              email: admin.email,
              fullName: admin.fullName,
              role: role,
              status: 'active',
              isFirstLogin: false
            }
          });
        }
        
        // Admin credentials are correct, proceed to OTP flow
        return res.status(200).json({
          message: 'Admin login requires OTP verification',
          requiresOTP: true,
          userType: 'admin'
        });
      }

      // Handle customer login
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Record failed attempt for non-existent user
        req.shouldRecordFailedAttempt = true;
        await recordFailedAttempt(req, res, () => {});
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        // Record failed attempt for wrong password
        req.shouldRecordFailedAttempt = true;
        await recordFailedAttempt(req, res, () => {});
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      // Clear failed attempts on successful login
      req.shouldClearFailedAttempts = true;
      await clearFailedAttempts(req, res, () => {});

      const role = user.role || 'Customer';
      const token = jwt.sign({ 
        userId: user._id, 
        email: user.email, 
        role: role,
        principalType: 'Customer' 
      }, JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({
      message: 'Login successful',
      token,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          birthday: user.birthday,
          gender: user.gender,
          employmentStatus: user.employmentStatus,
          profilePicture: user.profilePicture || '',
          role: role
        },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ✅ GET /me - Protected Route
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;
    if (role === 'staff' || role === 'manager' || role === 'superadmin') {
      const admin = await Admin.findById(req.user.userId).select('-password');
      if (!admin) return res.status(404).json({ message: 'Admin not found' });
      // Always show "Welcome" for admin accounts (not "Welcome Back")
      const isFirstLogin = true;
      
      return res.status(200).json({
        id: admin._id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
        status: admin.status,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
        lastLoginAt: admin.lastLoginAt,
        firstLoginCompleted: admin.firstLoginCompleted,
        isFirstLogin: isFirstLogin
      });
    }

    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({
      id: user._id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      name: user.fullName, // For mobile app compatibility
      birthday: user.birthday,
      gender: user.gender,
      employmentStatus: user.employmentStatus,
      profilePicture: user.profilePicture || '',
      role: user.role,
      // Loyalty system fields
      qrToken: user.qrToken,
      points: user.points || 0,
      reviewPoints: user.reviewPoints || 0,
      lastOrder: user.lastOrder || '',
      pastOrders: user.pastOrders || [],
      rewardsHistory: user.rewardsHistory || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ==================== MOBILE ADMIN ENDPOINTS ====================

// POST /mobile/admin/login - Mobile admin login (email + password)
router.post('/mobile/admin/login',
  authRateLimiter,
  checkFailedAttempts,
  sanitizeInput,
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  validateInput,
  async (req, res) => {
    const { email, password } = req.body;
    
    try {
      // Check if this is an admin login
      const admin = await Admin.findOne({ email: email.toLowerCase() });
      if (!admin) {
        req.shouldRecordFailedAttempt = true;
        await recordFailedAttempt(req, res, () => {});
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      // Verify admin password
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        req.shouldRecordFailedAttempt = true;
        await recordFailedAttempt(req, res, () => {});
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      // Check if admin has valid rememberUntil date (skip OTP if still valid)
      if (admin.rememberUntil && new Date() < admin.rememberUntil) {
        // Update last login time and set status to active
        await Admin.findByIdAndUpdate(admin._id, { 
          lastLoginAt: new Date(),
          status: 'active'
        });
        
        // Clear failed attempts on successful login
        req.shouldClearFailedAttempts = true;
        await clearFailedAttempts(req, res, () => {});
        
        const role = admin.role || 'staff';
        const token = jwt.sign({ 
          userId: admin._id, 
          email: admin.email, 
          role: role, 
          principalType: 'admin' 
        }, JWT_SECRET, { expiresIn: '30d' });
        
        return res.status(200).json({
          message: 'Admin login successful',
          token,
          user: {
            id: admin._id,
            email: admin.email,
            fullName: admin.fullName,
            role: role,
            status: 'active',
            isFirstLogin: false
          }
        });
      }
      
      // Admin credentials are correct, proceed to OTP flow
      return res.status(200).json({
        message: 'Admin login requires OTP verification',
        requiresOTP: true,
        userType: 'admin'
      });

    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// POST /mobile/admin/verify-otp - Mobile admin OTP verification
router.post('/mobile/admin/verify-otp',
  checkFailedAttempts,
  sanitizeInput,
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    
    body('otp')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
      .isNumeric()
      .withMessage('OTP must contain only numbers')
  ],
  validateInput,
  async (req, res) => {
    const { email, otp } = req.body;
    
    try {
      // Verify OTP
      const otpResult = await otpService.verifyOTP(email, otp, 'admin_login');
      
      if (!otpResult.success) {
        req.shouldRecordFailedAttempt = true;
        await recordFailedAttempt(req, res, () => {});
        await otpService.incrementFailedAttempt(email, otp, 'admin_login');
        return res.status(400).json({ message: otpResult.message });
      }

      // Get admin details
      const admin = await Admin.findOne({ email: email.toLowerCase() });
      if (!admin) {
        return res.status(400).json({ message: 'Admin not found' });
      }

      // Update admin status and last login
      await Admin.findByIdAndUpdate(admin._id, { 
        status: 'active',
        lastLoginAt: new Date(),
        firstLoginCompleted: true
      });

      const role = admin.role || 'staff';
      
      // Clear failed attempts on successful login
      req.shouldClearFailedAttempts = true;
      await clearFailedAttempts(req, res, () => {});

      const token = jwt.sign({ 
        userId: admin._id, 
        email: admin.email, 
        role: role, 
        principalType: 'admin' 
      }, JWT_SECRET, { expiresIn: '1d' });
      
      res.status(200).json({
        message: 'Admin login successful',
        token,
        user: {
          id: admin._id,
          email: admin.email,
          fullName: admin.fullName,
          role: role,
          status: 'active',
          isFirstLogin: true
        }
      });

    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// POST /mobile/admin/resend-otp - Mobile admin resend OTP
router.post('/mobile/admin/resend-otp',
  authRateLimiter,
  checkFailedAttempts,
  sanitizeInput,
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail()
  ],
  validateInput,
  async (req, res) => {
    const { email } = req.body;
    
    try {
      // Check if admin exists
      const admin = await Admin.findOne({ email: email.toLowerCase() });
      if (!admin) {
        return res.status(400).json({ message: 'Admin not found' });
      }

      // Generate and send OTP
      const otpResult = await otpService.createAndSendOTP(email, 'admin_login', true);
      
      if (!otpResult.success) {
        return res.status(500).json({ 
          message: 'Failed to send OTP', 
          error: otpResult.error 
        });
      }

      res.status(200).json({
        message: 'OTP sent to your email address',
        expiresAt: otpResult.expiresAt
      });

    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

// Import GridFS storage for profile pictures
const { profileUpload } = require('../config/gridfs');

// PUT /me - update profile fields (not password here)
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { fullName, username, birthday, gender, employmentStatus } = req.body; // email is read-only in UI
    const update = {};
    if (fullName !== undefined) update.fullName = fullName;
    if (username !== undefined) update.username = username;
    if (birthday !== undefined) update.birthday = birthday;
    if (gender !== undefined) update.gender = gender;
    if (employmentStatus !== undefined) update.employmentStatus = employmentStatus;

    // Prevent empty update
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    // Enforce unique constraints for username/email if changed
    if (update.username) {
      const existingUsername = await User.findOne({ username: update.username, _id: { $ne: req.user.userId } });
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: update },
      { new: true, runValidators: true, context: 'query' }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({
      id: user._id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      birthday: user.birthday,
      gender: user.gender,
      employmentStatus: user.employmentStatus,
      profilePicture: user.profilePicture || ''
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /heartbeat - keep admin status active while using the system
router.post('/heartbeat', authMiddleware, async (req, res) => {
  try {
    const { role, userId } = req.user;
    
    // If admin, keep status as 'active' and update last activity
    if (role === 'staff' || role === 'manager' || role === 'superadmin') {
      await Admin.findByIdAndUpdate(userId, { 
        status: 'active',
        lastLoginAt: new Date()
      });
    }
    
    res.status(200).json({ message: 'Heartbeat received' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /logout - logout and set admin status to inactive
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;
    
    // If admin, set status to 'inactive' on logout
    if (role === 'staff' || role === 'manager' || role === 'superadmin') {
      await Admin.findByIdAndUpdate(req.user.userId, { status: 'inactive' });
    }
    
    res.status(200).json({ message: 'Logout successful' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /me/avatar - upload profile picture
router.post('/me/avatar', authMiddleware, profileUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const profilePicturePath = `/api/images/profile/${req.file.id}`; // GridFS file ID for serving images
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { profilePicture: profilePicturePath } },
      { new: true }
    ).select('-password');

    res.status(200).json({
      message: 'Profile picture updated',
      profilePicture: profilePicturePath,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        birthday: user.birthday,
        gender: user.gender,
        employmentStatus: user.employmentStatus,
        profilePicture: user.profilePicture || ''
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
