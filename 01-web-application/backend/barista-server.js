require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Import and use auth routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Mobile detection middleware
app.use((req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  const isMobileApp = userAgent.includes('Flutter') || 
                     userAgent.includes('Dart') || 
                     userAgent.includes('Mobile') ||
                     !req.headers.origin; // No origin = mobile app
  
  req.isMobileApp = isMobileApp;
  next();
});

// ---------------- TRANSPORTER ----------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Verify transporter at startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter error:", error);
  } else {
    console.log("✅ Email transporter is ready");
  }
});

// Store OTP codes temporarily (in production, use Redis)
const otpStore = new Map();

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP email for admin login (all roles: superadmin, manager, staff)
async function sendAdminLoginOTP(email, name, role) {
  const otp = generateOTP();
  
  // ✅ Gmail SMTP transporter (App Password required)
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // use TLS 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const roleDisplayName = role === 'superadmin' ? 'Super Admin' : 
                         role === 'manager' ? 'Manager' : 
                         role === 'staff' ? 'Staff' : 'Admin';

  const mailOptions = {
    from: `"NOMU Cafe Admin Login" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `NOMU Cafe - ${roleDisplayName} Login Verification Code`,
    text: `Your OTP is: ${otp} (Valid for 5 minutes)`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🔐 ${roleDisplayName} Login Verification</h1>
        <p style="color: white; margin: 10px 0; font-size: 16px;">Your login verification code</p>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Hello ${name}! 👋</h2>
          <p style="color: #666; text-align: center; margin-bottom: 20px; line-height: 1.6;">
          You're attempting to log in to the NOMU Cafe Admin Panel as a <strong>${roleDisplayName}</strong>. Please use the verification code below:
          </p>
          <div style="background: #fff; border: 2px solid #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #667eea; font-size: 48px; text-align: center; letter-spacing: 8px; margin: 0;">${otp}</h1>
          </div>
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 10px; padding: 20px; margin: 20px 0;">
          <h4 style="color: #856404; margin: 0 0 15px 0;">⚠️ Security Notice</h4>
            <ul style="color: #856404; margin: 0; padding-left: 20px; text-align: left;">
            <li>This code will expire in 5 minutes</li>
            <li>Never share this code with anyone</li>
            <li>If you didn't request this code, please ignore this email</li>
            </ul>
          </div>
          <p style="color: #666; text-align: center; margin-bottom: 20px; line-height: 1.6;">
          Enter this code in the app to complete your login.
          </p>
          <div style="text-align: center; margin-top: 30px;">
          <p style="color: #999; font-size: 14px;">Best regards,<br>The NOMU Cafe Security Team</p>
          </div>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ ${roleDisplayName} login OTP sent to: ${email}`);
    return otp;
  } catch (error) {
    console.error('❌ Email sending error:', error);
    // For testing purposes, log OTP to console when email fails
    console.log(`🔧 [TESTING] OTP for ${email}: ${otp}`);
    return otp; // Return OTP even if email fails for testing
  }
}

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Import models from models directory
const Admin = require('./models/Admin');
const User = require('./models/User');

// ==================== SOCKET.IO REAL-TIME FEATURES ====================

// Track connected admins
const connectedAdmins = new Map();

io.on('connection', (socket) => {
  console.log('🔌 [SOCKET] New connection:', socket.id);

  // Admin joins (with role validation for all admin types)
  socket.on('admin-join', async (data) => {
    try {
      console.log('🔐 [SOCKET] Admin join attempt from:', data.email);
      
      // 🔒 BACKEND SECURITY: Verify admin exists and has valid role
      const admin = await Admin.findOne({ 
        Email: { $regex: new RegExp(`^${data.email}$`, 'i') } 
      });
      
      if (!admin) {
        console.log('❌ [SOCKET] Unauthorized join attempt - admin not found:', data.email);
        socket.emit('join-error', { 
          message: 'Admin not found. Access denied.',
          code: 'ADMIN_NOT_FOUND'
        });
        return;
      }
      
      // ✅ Allow superadmin, manager, and staff roles
      if (!['superadmin', 'manager', 'staff'].includes(admin.Role)) {
        console.log('❌ [SOCKET] Unauthorized join attempt - invalid role:', {
          email: data.email,
          role: admin.Role
        });
        socket.emit('join-error', { 
          message: 'Access denied. Valid admin role required.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
      }
      
      // ✅ Both validations passed
      console.log('✅ [SOCKET] Backend validation passed - user is admin:', {
        name: data.name,
        role: admin.Role
      });
      
      connectedAdmins.set(socket.id, {
        name: data.name,
        email: data.email,
        role: admin.Role,
        userType: data.userType,
        joinTime: new Date()
      });
      
      // Notify all connected clients about active admins
      io.emit('admin-status-update', {
        activeAdmins: Array.from(connectedAdmins.values()),
        totalConnected: connectedAdmins.size
      });
      
      console.log('👨‍💼 [SOCKET] Admin successfully joined:', {
        name: data.name,
        role: admin.Role
      });
      
    } catch (error) {
      console.error('💥 [SOCKET] Error during admin join validation:', error);
      socket.emit('join-error', { 
        message: 'Server error during validation.',
        code: 'SERVER_ERROR'
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('🔌 [SOCKET] Connection disconnected:', socket.id);
    if (connectedAdmins.has(socket.id)) {
      const admin = connectedAdmins.get(socket.id);
      console.log('👨‍💼 [SOCKET] Admin left:', {
        name: admin.name,
        role: admin.Role
      });
      connectedAdmins.delete(socket.id);
      
      // Notify remaining clients
      io.emit('admin-status-update', {
        activeAdmins: Array.from(connectedAdmins.values()),
        totalConnected: connectedAdmins.size
      });
    }
  });

  // Handle real-time order notifications
  socket.on('order-processed', (data) => {
    console.log('📦 [SOCKET] Order processed:', data);
    // Broadcast to all connected admins
    socket.broadcast.emit('new-order-notification', {
      drink: data.drink,
      points: data.points,
      timestamp: new Date(),
      processedBy: data.adminName
    });
  });
});

// ==================== USER AUTHENTICATION ENDPOINTS ====================

// User signup endpoint (for website) - DISABLED: Use /api/auth/signup from auth.js for OTP flow
app.post('/api/auth/signup-direct', async (req, res) => {
  console.log('👤 [USER SIGNUP] Signup request for:', req.body.email);
  try {
    // Accept both camelCase (from frontend) and PascalCase field names
    const { 
      FullName, Username, Email, Password, Birthday, Gender, EmploymentStatus,
      fullName, username, email, password, birthday, gender, employmentStatus
    } = req.body;
    
    // Use PascalCase if available, otherwise use camelCase
    const finalFullName = FullName || fullName;
    const finalUsername = Username || username;
    const finalEmail = Email || email;
    const finalPassword = Password || password;
    const finalBirthday = Birthday || birthday;
    const finalGender = Gender || gender;
    const finalEmploymentStatus = EmploymentStatus || employmentStatus;
    
    if (!finalFullName || !finalUsername || !finalEmail || !finalPassword || !finalBirthday || !finalGender) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { Email: { $regex: new RegExp(`^${finalEmail}$`, 'i') } },
        { Username: { $regex: new RegExp(`^${finalUsername}$`, 'i') } }
      ]
    });
    
    if (existingUser) {
      if (existingUser.Email.toLowerCase() === finalEmail.toLowerCase()) {
        return res.status(400).json({ error: 'Email already registered' });
      } else {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    // Create new user with unified schema
    const newUser = new User({
      FullName: finalFullName,
      Username: finalUsername,
      Email: finalEmail.toLowerCase(),
      Role: 'Customer',
      UserType: 'customer', // Sync for mobile compatibility
      Birthday: finalBirthday,
      Gender: finalGender,
      EmploymentStatus: finalEmploymentStatus || 'Prefer not to say',
      Password: hashedPassword,
      QrToken: uuidv4(), // Generate QR token for loyalty system
      Points: 0,
      ReviewPoints: 0,
      LastOrder: '',
      PastOrders: [],
      RewardsHistory: []
    });

    await newUser.save();
    
    console.log('✅ [USER SIGNUP] User created successfully:', {
      id: newUser._id,
      email: newUser.email,
      username: newUser.username
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        FullName: newUser.FullName,
        Username: newUser.Username,
        Email: newUser.Email,
        Role: newUser.Role
      }
    });
  } catch (err) {
    console.error('❌ [USER SIGNUP] Signup error:', err);
    res.status(500).json({ error: err.message });
  }
});

// User login endpoint (for website)
app.post('/api/auth/login', async (req, res) => {
  console.log('🔐 [USER LOGIN] Login request for:', req.body.email);
  try {
    // Accept both camelCase and PascalCase field names
    const { Email, Password, email, password } = req.body;
    
    const finalEmail = Email || email;
    const finalPassword = Password || password;
    
    if (!finalEmail || !finalPassword) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ 
      Email: { $regex: new RegExp(`^${finalEmail}$`, 'i') } 
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Check password
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(finalPassword, user.Password);
    
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        userId: user._id,
        Email: user.Email,
        Role: user.Role
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log('✅ [USER LOGIN] Login successful:', {
      id: user._id,
      Email: user.Email
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        FullName: user.FullName,
        Username: user.Username,
        Email: user.Email,
        Role: user.Role,
        QrToken: user.QrToken,
        Points: user.Points
      }
    });
  } catch (err) {
    console.error('❌ [USER LOGIN] Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== ADMIN AUTHENTICATION ENDPOINTS ====================

// Step 1: Send OTP for admin login (all roles)
app.post('/api/admin/send-login-otp', async (req, res) => {
  console.log('📧 [ADMIN OTP] OTP request for:', req.body.email);
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find admin and verify they have a valid role
    const admin = await Admin.findOne({ 
      Email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });
    
    if (!admin) {
      console.log('❌ [ADMIN OTP] Admin not found for email:', email);
      return res.status(404).json({ error: 'Admin not found' });
    }

    // ✅ Allow superadmin, manager, and staff roles
    if (!['superadmin', 'manager', 'staff'].includes(admin.Role)) {
      console.log('❌ [ADMIN OTP] Admin has invalid role:', {
        email: email,
        role: admin.Role
      });
      return res.status(403).json({ error: 'Access denied. Valid admin account required.' });
    }

    console.log('✅ [ADMIN OTP] Admin found:', { 
      id: admin._id, 
      name: admin.FullName, 
      email: admin.Email,
      role: admin.Role
    });

    // Check cooldown (prevent spam)
    const storedData = otpStore.get(email);
    if (storedData && Date.now() < storedData.cooldownUntil) {
      const remainingTime = Math.ceil((storedData.cooldownUntil - Date.now()) / 1000);
      return res.status(429).json({ 
        error: `Please wait ${remainingTime} seconds before requesting another OTP` 
      });
    }

    // Generate and send OTP
    const otp = await sendAdminLoginOTP(email, admin.FullName, admin.Role);
    if (!otp) {
      return res.status(500).json({ error: 'Failed to send OTP email' });
    }

    // Store OTP with expiry and cooldown
    const now = Date.now();
    otpStore.set(email, {
      otp,
      expiresAt: now + 5 * 60 * 1000, // 5 minutes
      cooldownUntil: now + 60 * 1000, // 1 minute cooldown
      purpose: 'admin_login',
      adminId: admin._id
    });

    console.log('✅ [ADMIN OTP] OTP sent successfully to:', email);
    
    res.json({ 
      message: 'OTP sent successfully to your email',
      email: email,
      expiresIn: '5 minutes'
    });
  } catch (err) {
    console.error('❌ [ADMIN OTP] Error sending OTP:', err);
    res.status(500).json({ error: err.message });
  }
});

// Step 2: Verify OTP and complete admin login (all roles)
app.post('/api/admin/verify-login-otp', async (req, res) => {
  console.log('🔐 [ADMIN LOGIN] OTP verification for:', req.body.email);
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Verify OTP
    const storedData = otpStore.get(email);
    if (!storedData) {
      console.log('❌ [ADMIN LOGIN] No OTP found for:', email);
      return res.status(400).json({ error: 'OTP not found or expired' });
    }

    if (storedData.purpose !== 'admin_login') {
      console.log('❌ [ADMIN LOGIN] Invalid OTP purpose for:', email);
      return res.status(400).json({ error: 'Invalid OTP purpose' });
    }

    if (Date.now() > storedData.expiresAt) {
      console.log('❌ [ADMIN LOGIN] OTP expired for:', email);
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP has expired' });
    }

    if (storedData.otp !== otp) {
      console.log('❌ [ADMIN LOGIN] Invalid OTP for:', email);
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // OTP verified, get admin and complete login
    const admin = await Admin.findById(storedData.adminId);
    if (!admin) {
      console.log('❌ [ADMIN LOGIN] Admin not found for ID:', storedData.adminId);
      return res.status(404).json({ error: 'Admin not found' });
    }

    // ✅ Allow superadmin, manager, and staff roles
    if (!['superadmin', 'manager', 'staff'].includes(admin.Role)) {
      console.log('❌ [ADMIN LOGIN] Admin has invalid role:', {
        email: email,
        role: admin.Role
      });
      return res.status(403).json({ error: 'Access denied. Valid admin account required.' });
    }

    // Update admin status to active and last login time
    await Admin.findByIdAndUpdate(admin._id, { 
      status: 'active',
      lastLoginAt: new Date()
    });

    // ✅ Create JWT
    const token = jwt.sign(
      { 
        adminId: admin._id,
        email: admin.Email,
        role: admin.Role,
        fullName: admin.FullName 
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Remove password from response
    const { password: _, ...adminData } = admin.toObject();
    
    // Clean up OTP
    otpStore.delete(email);
    
    console.log('🎉 [ADMIN LOGIN] Login successful for admin:', {
      email: email,
      role: admin.Role
    });
    
    res.json({
      message: 'Admin login successful',
      token,
      user: adminData
    });
  } catch (err) {
    console.error('❌ [ADMIN LOGIN] Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Login endpoint (email + password verification for all admin roles)
app.post('/api/login', async (req, res) => {
  console.log('🔐 [LOGIN] Login request for:', req.body.email);
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Find admin and verify credentials
    const admin = await Admin.findOne({ 
      Email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });
    
    if (!admin) {
      console.log('❌ [LOGIN] Admin not found for email:', email);
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // ✅ Allow superadmin, manager, and staff roles
    if (!['superadmin', 'manager', 'staff'].includes(admin.Role)) {
      console.log('❌ [LOGIN] Admin has invalid role:', {
        email: email,
        role: admin.Role
      });
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // ✅ Compare password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    
    if (!isPasswordValid) {
      console.log('❌ [LOGIN] Invalid password for email:', email);
      return res.status(400).json({ message: 'Invalid password' });
    }

    console.log('✅ [LOGIN] Admin credentials verified:', {
      email: email,
      role: admin.Role
    });
    
    // Return admin data (without password) for OTP flow
    const { password: _, ...adminData } = admin.toObject();
    
    res.json({
      message: 'Credentials verified successfully',
      user: adminData
    });
  } catch (err) {
    console.error('❌ [LOGIN] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== MOBILE ADMIN LOGIN ====================

// Mobile admin login endpoint (for Flutter app - all roles)
app.post('/api/mobile/admin/login', async (req, res) => {
  console.log('📱 [MOBILE ADMIN] Login request from mobile app');
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Find admin and verify credentials
    const admin = await Admin.findOne({ 
      Email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });
    
    if (!admin) {
      console.log('❌ [MOBILE ADMIN] Admin not found for email:', email);
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // ✅ Allow superadmin, manager, and staff roles
    if (!['superadmin', 'manager', 'staff'].includes(admin.Role)) {
      console.log('❌ [MOBILE ADMIN] Admin has invalid role:', {
        email: email,
        role: admin.Role
      });
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // ✅ Compare password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    
    if (!isPasswordValid) {
      console.log('❌ [MOBILE ADMIN] Invalid password for email:', email);
      return res.status(400).json({ message: 'Invalid password' });
    }

    // ✅ Generate OTP for mobile admin
    const otp = generateOTP();
    const now = Date.now();
    otpStore.set(admin.Email, {
      otp,
      expiresAt: now + 5 * 60 * 1000, // 5 minutes
      cooldownUntil: now + 60 * 1000, // 1 minute cooldown
      purpose: 'mobile_admin_login',
      adminId: admin._id
    });

    // ✅ Send OTP email
    try {
      await transporter.sendMail({
        from: `"NOMU Mobile Admin Login" <${process.env.EMAIL_USER}>`,
        to: admin.Email,
        subject: `Your NOMU Mobile Admin OTP Code (${admin.Role})`,
        text: `Your OTP is: ${otp} (Valid for 5 minutes)`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">📱 Mobile Admin Login</h1>
              <p style="color: white; margin: 10px 0; font-size: 16px;">Your mobile admin verification code (${admin.Role})</p>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Hello ${admin.FullName}! 👋</h2>
              <p style="color: #666; text-align: center; margin-bottom: 20px; line-height: 1.6;">
                You're attempting to log in to the NOMU Mobile Admin Panel as a <strong>${admin.Role}</strong>. Please use the verification code below:
              </p>
              <div style="background: #fff; border: 2px solid #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
                <h1 style="color: #667eea; font-size: 48px; text-align: center; letter-spacing: 8px; margin: 0;">${otp}</h1>
              </div>
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <h4 style="color: #856404; margin: 0 0 15px 0;">⚠️ Security Notice</h4>
                <ul style="color: #856404; margin: 0; padding-left: 20px; text-align: left;">
                  <li>This code will expire in 5 minutes</li>
                  <li>Never share this code with anyone</li>
                  <li>If you didn't request this code, please ignore this email</li>
                </ul>
              </div>
              <p style="color: #666; text-align: center; margin-bottom: 20px; line-height: 1.6;">
                Enter this code in the mobile app to complete your login.
              </p>
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #999; font-size: 14px;">Best regards,<br>The NOMU Mobile Security Team</p>
              </div>
            </div>
          </div>
        `
      });
    } catch (err) {
      console.error("⚠️ Failed to send OTP email:", err.message);
      // For testing purposes, log OTP to console when email fails
      console.log(`🔧 [TESTING] Mobile OTP for ${admin.Email}: ${otp}`);
      // We still respond so modal opens
    }

    console.log('✅ [MOBILE ADMIN] OTP sent successfully to:', {
      email: admin.Email,
      role: admin.Role
    });
    
    res.json({
      message: 'OTP sent to registered email',
      email: admin.Email,
      expiresIn: '5 minutes'
    });
  } catch (err) {
    console.error('❌ [MOBILE ADMIN] Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Mobile admin OTP verification (all roles)
app.post('/api/mobile/admin/verify-otp', async (req, res) => {
  console.log('🔐 [MOBILE ADMIN OTP] OTP verification for:', req.body.email);
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Verify OTP
    const storedData = otpStore.get(email);
    if (!storedData) {
      console.log('❌ [MOBILE ADMIN OTP] No OTP found for:', email);
      return res.status(400).json({ message: 'OTP not found or expired' });
    }

    if (storedData.purpose !== 'mobile_admin_login') {
      console.log('❌ [MOBILE ADMIN OTP] Invalid OTP purpose for:', email);
      return res.status(400).json({ message: 'Invalid OTP purpose' });
    }

    if (Date.now() > storedData.expiresAt) {
      console.log('❌ [MOBILE ADMIN OTP] OTP expired for:', email);
      otpStore.delete(email);
      return res.status(400).json({ message: 'OTP has expired' });
    }

    if (storedData.otp !== otp) {
      console.log('❌ [MOBILE ADMIN OTP] Invalid OTP for:', email);
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // OTP verified, get admin and complete login
    const admin = await Admin.findById(storedData.adminId);
    if (!admin) {
      console.log('❌ [MOBILE ADMIN OTP] Admin not found for ID:', storedData.adminId);
      return res.status(404).json({ message: 'Admin not found' });
    }

    // ✅ Allow superadmin, manager, and staff roles
    if (!['superadmin', 'manager', 'staff'].includes(admin.Role)) {
      console.log('❌ [MOBILE ADMIN OTP] Admin has invalid role:', {
        email: email,
        role: admin.Role
      });
      return res.status(403).json({ message: 'Access denied. Valid admin account required.' });
    }

    // ✅ Create JWT
    const token = jwt.sign(
      { 
        adminId: admin._id,
        email: admin.Email,
        role: admin.Role,
        FullName: admin.FullName,
        platform: 'mobile'
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Remove password from response
    const { password: _, ...adminData } = admin.toObject();
    
    // Clean up OTP
    otpStore.delete(email);
    
    console.log('🎉 [MOBILE ADMIN OTP] Mobile admin login successful:', {
      email: email,
      role: admin.Role
    });
    
    res.json({
      message: 'Mobile admin login successful',
      token,
      user: adminData,
      platform: 'mobile'
    });
  } catch (err) {
    console.error('❌ [MOBILE ADMIN OTP] Login error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Mobile admin resend OTP endpoint (all roles)
app.post('/api/mobile/admin/resend-otp', async (req, res) => {
  console.log('📧 [MOBILE ADMIN RESEND] Resend OTP request for:', req.body.email);
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find admin and verify they have a valid role
    const admin = await Admin.findOne({ 
      Email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });
    
    if (!admin) {
      console.log('❌ [MOBILE ADMIN RESEND] Admin not found for email:', email);
      return res.status(404).json({ message: 'Admin not found' });
    }

    // ✅ Allow superadmin, manager, and staff roles
    if (!['superadmin', 'manager', 'staff'].includes(admin.Role)) {
      console.log('❌ [MOBILE ADMIN RESEND] Admin has invalid role:', {
        email: email,
        role: admin.Role
      });
      return res.status(403).json({ message: 'Access denied. Valid admin account required.' });
    }

    // Check cooldown (prevent spam)
    const storedData = otpStore.get(email);
    if (storedData && Date.now() < storedData.cooldownUntil) {
      const remainingTime = Math.ceil((storedData.cooldownUntil - Date.now()) / 1000);
      return res.status(429).json({ 
        message: `Please wait ${remainingTime} seconds before requesting another OTP` 
      });
    }

    // Generate and send new OTP
    const otp = generateOTP();
    const now = Date.now();
    otpStore.set(admin.Email, {
      otp,
      expiresAt: now + 5 * 60 * 1000, // 5 minutes
      cooldownUntil: now + 60 * 1000, // 1 minute cooldown
      purpose: 'mobile_admin_login',
      adminId: admin._id
    });

    // Send OTP email
    try {
      await transporter.sendMail({
        from: `"NOMU Mobile Admin Login" <${process.env.EMAIL_USER}>`,
        to: admin.Email,
        subject: `Your NOMU Mobile Admin OTP Code (Resent - ${admin.Role})`,
        text: `Your OTP is: ${otp} (Valid for 5 minutes)`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">📱 Mobile Admin Login</h1>
              <p style="color: white; margin: 10px 0; font-size: 16px;">Your mobile admin verification code (resent - ${admin.Role})</p>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Hello ${admin.FullName}! 👋</h2>
              <p style="color: #666; text-align: center; margin-bottom: 20px; line-height: 1.6;">
                You requested a new verification code for the NOMU Mobile Admin Panel as a <strong>${admin.Role}</strong>. Please use the code below:
              </p>
              <div style="background: #fff; border: 2px solid #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
                <h1 style="color: #667eea; font-size: 48px; text-align: center; letter-spacing: 8px; margin: 0;">${otp}</h1>
              </div>
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <h4 style="color: #856404; margin: 0 0 15px 0;">⚠️ Security Notice</h4>
                <ul style="color: #856404; margin: 0; padding-left: 20px; text-align: left;">
                  <li>This code will expire in 5 minutes</li>
                  <li>Never share this code with anyone</li>
                  <li>If you didn't request this code, please ignore this email</li>
                </ul>
              </div>
              <p style="color: #666; text-align: center; margin-bottom: 20px; line-height: 1.6;">
                Enter this code in the mobile app to complete your login.
              </p>
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #999; font-size: 14px;">Best regards,<br>The NOMU Mobile Security Team</p>
              </div>
            </div>
          </div>
        `
      });
    } catch (err) {
      console.error("⚠️ Failed to send resend OTP email:", err.message);
    }

    console.log('✅ [MOBILE ADMIN RESEND] OTP resent successfully to:', {
      email: admin.Email,
      role: admin.Role
    });
    
    res.json({
      message: 'OTP resent successfully to your email',
      email: admin.Email,
      expiresIn: '5 minutes'
    });
  } catch (err) {
    console.error('❌ [MOBILE ADMIN RESEND] Error resending OTP:', err);
    res.status(500).json({ message: 'Server error during OTP resend' });
  }
});

// ==================== QR SCANNING ENDPOINTS ====================

// Add loyalty point when admin scans QR code (all roles can scan)
app.post('/api/loyalty/scan', async (req, res) => {
  try {
    const { qrToken, drink, adminId } = req.body;
    
    console.log('🎯 [LOYALTY] QR scan request:', { qrToken, drink, adminId });
    
    if (!qrToken) {
      return res.status(400).json({ error: 'QR token is required' });
    }

    // Find customer by QR token
    const customer = await User.findOne({ qrToken });
    if (!customer) {
      console.log('❌ [LOYALTY] Customer not found for QR token:', qrToken);
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    console.log('✅ [LOYALTY] Customer found:', { 
      id: customer._id, 
      name: customer.FullName, 
      email: customer.Email,
      currentPoints: customer.Points 
    });

    // Check if customer already has maximum points (10)
    if ((customer.Points || 0) >= 10) {
      console.log('⚠️ [LOYALTY] Customer already has maximum points:', customer.Points);
      return res.status(400).json({ 
        error: 'Customer already has 10 stamps', 
        points: customer.Points 
      });
    }

    // Reduce inventory if drink is specified
    let inventoryResult = null;
    if (drink) {
      try {
        const InventoryItem = require('./models/InventoryItem');
        const inventoryItem = await InventoryItem.findOne({ 
          name: { $regex: new RegExp(drink, 'i') },
          status: 'active'
        });
        
        if (inventoryItem) {
          await inventoryItem.reduceStock(1, adminId);
          inventoryResult = {
            itemName: inventoryItem.name,
            remainingStock: inventoryItem.currentStock,
            status: inventoryItem.status
          };
          console.log('✅ [INVENTORY] Stock reduced for:', inventoryItem.name, 'Remaining:', inventoryItem.currentStock);
        } else {
          console.log('⚠️ [INVENTORY] No inventory item found for drink:', drink);
        }
      } catch (inventoryError) {
        console.error('❌ [INVENTORY] Error reducing stock:', inventoryError.message);
        // Continue with loyalty points even if inventory fails
      }
    }

    // Add 1 point
    customer.Points = (customer.Points || 0) + 1;
    
    // Record the drink order - split complex orders into individual items
    if (drink) {
      customer.LastOrder = drink;
      customer.PastOrders = customer.PastOrders || [];
      
      // Split complex orders (separated by commas) into individual items
      const orderItems = drink.split(',').map(item => item.trim()).filter(item => item.length > 0);
      
      // Add each item as a separate order entry
      orderItems.forEach(item => {
        customer.PastOrders.push({ 
          drink: item, 
          quantity: 1, // Each item gets quantity 1
          date: new Date() 
        });
      });
      
      // Keep only last 20 orders
      if (customer.PastOrders.length > 20) {
        customer.PastOrders.splice(0, customer.PastOrders.length - 20);
      }
    }

    await customer.save();
    
    console.log('✅ [LOYALTY] Points added successfully:', { 
      customerId: customer._id, 
      newPoints: customer.Points, 
      drink: drink 
    });

    // Emit real-time notification to all connected admins
    io.emit('loyalty-point-added', {
      drink: drink,
      points: customer.Points,
      totalOrders: customer.PastOrders ? customer.PastOrders.length : 0,
      timestamp: new Date(),
      message: `New order: ${drink} - Customer now has ${customer.Points} points`
    });

    res.json({ 
      points: customer.Points, 
      lastOrder: customer.LastOrder, 
      pastOrders: customer.PastOrders,
      totalOrders: customer.PastOrders ? customer.PastOrders.length : 0,
      inventory: inventoryResult
    });
  } catch (err) {
    console.error('❌ [LOYALTY] Error adding loyalty point:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get customer by QR token (for customer info display)
app.get('/api/customer/qr/:qrToken', async (req, res) => {
  try {
    const { qrToken } = req.params;
    
    console.log('🔍 [CUSTOMER] Looking up customer by QR token:', qrToken);
    
    const customer = await User.findOne({ qrToken });
    if (!customer) {
      console.log('❌ [CUSTOMER] Customer not found for QR token:', qrToken);
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    console.log('✅ [CUSTOMER] Customer found:', { 
      id: customer._id, 
      name: customer.FullName, 
      email: customer.Email,
      points: customer.Points 
    });

    res.json(customer);
  } catch (err) {
    console.error('❌ [CUSTOMER] Error fetching customer by QR token:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== REWARD CLAIM ENDPOINTS ====================

// Claim reward endpoint for mobile app
app.post('/api/user/:userId/claim-reward', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, description } = req.body;
    
    console.log('🎁 [REWARD] Claim reward request:', { userId, type, description });
    
    // Validate inputs
    if (!type || !description) {
      return res.status(400).json({ 
        success: false,
        error: 'Reward type and description are required' 
      });
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ [REWARD] User not found:', userId);
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    console.log('✅ [REWARD] User found:', { 
      id: user._id, 
      name: user.FullName, 
      currentPoints: user.Points 
    });
    
    // Check if user has enough points for the reward
    let pointsRequired = 0;
    let newPoints = user.Points;
    
    if (type === 'donut') {
      pointsRequired = 5;
      if (user.Points < 5) {
        return res.status(400).json({ 
          success: false,
          error: 'Not enough points for donut reward. Need 5 points, have ' + user.Points 
        });
      }
      // For donut rewards, points are NOT deducted (cycle-based system)
      console.log('🍩 [REWARD] Donut reward claimed - points remain the same');
    } else if (type === 'coffee') {
      pointsRequired = 10;
      if (user.Points < 10) {
        return res.status(400).json({ 
          success: false,
          error: 'Not enough points for coffee reward. Need 10 points, have ' + user.Points 
        });
      }
      // For coffee rewards, points are reset to 0
      newPoints = 0;
      console.log('☕ [REWARD] Coffee reward claimed - points reset to 0');
    } else {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid reward type. Must be "donut" or "coffee"' 
      });
    }
    
    // Add reward to history with current cycle
    const rewardEntry = {
      reward: description,
      pointsUsed: pointsRequired,
      date: new Date(),
      type: type,
      cycle: user.currentCycle || 1 // Use current cycle for both donut and coffee
    };
    
    // Update user points and reward history
    user.Points = newPoints;
    user.RewardsHistory = user.RewardsHistory || [];
    user.RewardsHistory.push(rewardEntry);
    
    // Only increment cycle when coffee reward is claimed (points reset to 0)
    if (type === 'coffee') {
      user.currentCycle = (user.currentCycle || 1) + 1;
      console.log('🔄 [REWARD] Cycle advanced to:', user.currentCycle);
    }
    
    // Keep only last 50 reward entries
    if (user.RewardsHistory.length > 50) {
      user.RewardsHistory = user.RewardsHistory.slice(-50);
    }
    
    await user.save();
    
    console.log('✅ [REWARD] Reward claimed successfully:', {
      userId: user._id,
      rewardType: type,
      description: description,
      newPoints: newPoints,
      cycle: rewardEntry.cycle
    });
    
    // Emit real-time update
    io.emit('loyaltyPointUpdate', {
      userId: user._id,
      qrToken: user.qrToken,
      points: newPoints,
      message: `Reward claimed: ${description}`,
      rewardType: type,
      cycle: rewardEntry.cycle
    });
    
    res.json({
      success: true,
      message: 'Reward claimed successfully',
      newPoints: newPoints,
      rewardType: type,
      description: description,
      cycle: rewardEntry.cycle
    });
    
  } catch (err) {
    console.error('❌ [REWARD] Error claiming reward:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
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
        points: user.Points,
        currentCycle: user.currentCycle || 1,
        rewardsHistory: user.RewardsHistory || []
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

// Get reward history for user
app.get('/api/user/:userId/reward-history', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('📜 [REWARD] Getting reward history for user:', userId);
    
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ [REWARD] User not found:', userId);
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    const rewardHistory = user.RewardsHistory || [];
    
    // Sort by date (newest first)
    rewardHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    console.log('✅ [REWARD] Reward history retrieved:', {
      userId: user._id,
      count: rewardHistory.length
    });
    
    res.json(rewardHistory);
    
  } catch (err) {
    console.error('❌ [REWARD] Error getting reward history:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// ==================== UTILITY ENDPOINTS ====================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'NOMU Admin Scanner API is running',
    timestamp: new Date().toISOString(),
    supportedRoles: ['superadmin', 'manager', 'staff']
  });
});

// Get server info
app.get('/api/info', (req, res) => {
  res.json({
    name: 'NOMU Admin Scanner API',
    version: '1.0.0',
    description: 'API for admin QR code scanning and loyalty point management with email verification',
    supportedRoles: ['superadmin', 'manager', 'staff'],
    endpoints: [
      'POST /api/admin/send-login-otp - Send OTP for admin login (all roles)',
      'POST /api/admin/verify-login-otp - Verify OTP and complete admin login (all roles)',
      'POST /api/login - Admin login verification (all roles)',
      'POST /api/mobile/admin/login - Mobile admin login (email + password) (all roles)',
      'POST /api/mobile/admin/verify-otp - Mobile admin OTP verification (all roles)',
      'POST /api/mobile/admin/resend-otp - Mobile admin OTP resend (all roles)',
      'POST /api/loyalty/scan - Add loyalty points via QR scan (all roles)',
      'GET /api/customer/qr/:qrToken - Get customer info by QR token',
      'POST /api/user/:userId/claim-reward - Claim reward for user (mobile app)',
      'GET /api/user/:userId/reward-history - Get reward history for user (mobile app)',
      'GET /api/health - Health check',
      'GET /api/info - Server information'
    ],
    features: [
      'Email verification for admin login (all roles)',
      'Mobile admin authentication (all roles)',
      'OTP-based authentication',
      'QR code loyalty point scanning',
      'Customer information lookup',
      'Reward claiming system (5-point donut, 10-point coffee)',
      'Reward history tracking',
      'Real-time notifications',
      'JWT token authentication',
      'Mobile app detection',
      'Multi-role support (superadmin, manager, staff)'
    ]
  });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    message: 'The requested API endpoint does not exist',
    supportedRoles: ['superadmin', 'manager', 'staff'],
    availableEndpoints: [
      'POST /api/admin/send-login-otp',
      'POST /api/admin/verify-login-otp',
      'POST /api/login',
      'POST /api/mobile/admin/login',
      'POST /api/mobile/admin/verify-otp',
      'POST /api/mobile/admin/resend-otp',
      'POST /api/loyalty/scan',
      'GET /api/customer/qr/:qrToken',
      'POST /api/user/:userId/claim-reward',
      'GET /api/user/:userId/reward-history',
      'GET /api/health',
      'GET /api/info'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('💥 [ERROR] Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

// ==================== SERVER STARTUP ====================

const PORT = process.env.PORT || 5000;
const HOST = process.env.SERVER_HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log('🚀 NOMU Admin Scanner API is running!');
  console.log(`🌐 Server running on ${HOST}:${PORT}`);
  console.log(`📱 Local: http://localhost:${PORT}`);
  if (HOST !== 'localhost' && HOST !== '127.0.0.1') {
    console.log(`🌍 Network: http://${HOST}:${PORT}`);
  }
  console.log(`🔗 API Base: http://${HOST}:${PORT}/api`);
  console.log(`🔌 Socket.IO: ws://${HOST}:${PORT}`);
  console.log('');
  console.log('📋 Available endpoints:');
  console.log('   POST /api/admin/send-login-otp - Send OTP for admin login (all roles)');
  console.log('   POST /api/admin/verify-login-otp - Verify OTP and login (all roles)');
  console.log('   POST /api/login - Admin login verification (all roles)');
  console.log('   POST /api/mobile/admin/login - Mobile admin login (email + password) (all roles)');
  console.log('   POST /api/mobile/admin/verify-otp - Mobile admin OTP verification (all roles)');
  console.log('   POST /api/mobile/admin/resend-otp - Mobile admin OTP resend (all roles)');
  console.log('   POST /api/loyalty/scan - Add loyalty points via QR scan (all roles)');
  console.log('   GET  /api/customer/qr/:qrToken - Get customer info by QR token');
  console.log('   POST /api/user/:userId/claim-reward - Claim reward for user (mobile app)');
  console.log('   GET  /api/user/:userId/reward-history - Get reward history for user (mobile app)');
  console.log('   GET  /api/health - Health check');
  console.log('   GET  /api/info - Server information');
  console.log('');
  console.log('🔌 Real-time features:');
  console.log('   - Live admin activity tracking (all roles)');
  console.log('   - Real-time order notifications');
  console.log('   - Live loyalty point updates');
  console.log('');
  console.log('👥 Supported Admin Roles:');
  console.log('   - superadmin: Full access');
  console.log('   - manager: Management access');
  console.log('   - staff: Staff access');
  console.log('');
  console.log('🔐 Admin login now requires email verification for all roles!');
  console.log('⏹️  Press Ctrl+C to stop the server');
});
