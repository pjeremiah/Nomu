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
const os = require('os');
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
  notifyAbuseDetection,
  notifyAbuseEscalation
} = require('./middleware/securityMiddleware');
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize security notification system
initializeNotifications(io);

// Apply high-volume security middleware
app.use(securityHeaders);
app.use(corsSecurity);
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(ipRateLimit);

// Mobile detection middleware
app.use((req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  const isMobileApp = userAgent.includes('Flutter') || 
                     userAgent.includes('Dart') || 
                     (userAgent.includes('Mobile') && !userAgent.includes('Mozilla'));
  
  req.isMobileApp = isMobileApp;
  console.log('🔍 [DETECTION] User-Agent:', userAgent);
  console.log('🔍 [DETECTION] Is Mobile App:', isMobileApp);
  next();
});

// ---------------- ADMIN EMAIL TRANSPORTER ----------------
// Create admin email transporter for OTP verification
const adminEmailTransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use TLS 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Verify admin email transporter at startup
adminEmailTransporter.verify((error, success) => {
  if (error) {                                      
    console.error("❌ Admin email transporter error:", error);
  } else {
    console.log("✅ Admin email transporter is ready");
    console.log("📧 Using email:", process.env.EMAIL_USER);
  }
});

// Store OTP codes temporarily (in production, use Redis)
const otpStore = new Map();

/** Same validity window as web admin (`otpService.js` / `emailService.js`): 10 minutes. */
const ADMIN_OTP_TTL_MS = 10 * 60 * 1000;

/** Minimum seconds between OTP send/resend (barista app verification UI). */
const ADMIN_OTP_RESEND_COOLDOWN_MS = 25 * 1000;

/**
 * HTML for admin login OTP — matches `01-web-application/backend/services/emailService.js`
 * `getOTPEmailTemplate(otpCode, 'admin_login')` so web and barista emails look identical.
 */
function buildNomuAdminLoginOtpEmailHtml(otpCode) {
  const typeText = 'Admin Login Verification';
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nomu Cafe - ${typeText}</title>
    </head>
    <body style="margin:0; padding:20px; background-color:#f4f4f4;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px; margin:0 auto;">
            <tr><td style="background:#fff; padding:30px; border-radius:10px; box-shadow:0 0 20px rgba(0,0,0,0.1); text-align:left;">
                <div style="margin-bottom:24px; text-align:center;">
                    <div style="font-size:28px; font-weight:bold; color:#232c53;">☕ Nomu Cafe</div>
                    <h2 style="margin:10px 0 0 0; font-size:20px; font-weight:bold; color:#232c53;">${typeText}</h2>
                </div>
                <p style="font-size:14px; color:#333; margin:0 0 16px 0;">Hello,</p>
                <p style="font-size:14px; color:#333; margin:0 0 16px 0;">You have requested ${typeText.toLowerCase()} for your Nomu Cafe admin account. Please use the following verification code:</p>
                <div style="background-color:#232c53; color:white; font-size:32px; font-weight:bold; text-align:center; padding:20px; border-radius:8px; letter-spacing:5px; margin:20px 0; font-family:'Courier New',monospace;">${otpCode}</div>
                <div style="background-color:#fff3cd; border:1px solid #ffeaa7; color:#856404; padding:15px; border-radius:5px; margin:20px 0;">
                    <p style="margin:0 0 10px 0; font-size:14px; font-weight:bold;">⚠️ Important:</p>
                    <ul style="margin:0; padding-left:20px;">
                        <li style="margin-bottom:6px;">This code will expire in <strong>10 minutes</strong></li>
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
                <p style="font-size:14px; color:#333; margin:0 0 16px 0;">If you have any questions or concerns, please contact our support team.</p>
                <div style="margin-top:28px; padding-top:20px; border-top:1px solid #eee; font-size:12px; color:#666; text-align:center;">© 2024 Nomu Cafe. This is an automated message; please do not reply.</div>
            </td></tr>
        </table>
    </body>
    </html>
    `;
}

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate QR Token for customers
function generateQRToken() {
  return uuidv4();
}

// Send OTP email for admin login (all roles: superadmin, manager, staff)
// Uses same HTML as web admin (`emailService.getOTPEmailTemplate` admin_login).
async function sendAdminLoginOTP(email, name, role) {
  const otp = generateOTP();

  const mailOptions = {
    from: `"Nomu Cafe" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Nomu Cafe - Admin Login Verification Code',
    text: `Your Nomu Cafe admin login verification code is: ${otp}. It expires in 10 minutes.`,
    html: buildNomuAdminLoginOtpEmailHtml(otp),
  };

  try {
    await adminEmailTransporter.sendMail(mailOptions);
    const roleLabel = role === 'superadmin' ? 'Super Admin' : role === 'manager' ? 'Manager' : role === 'staff' ? 'Staff' : 'Admin';
    console.log(`✅ ${roleLabel} login OTP sent to: ${email}`);
    return otp;
  } catch (error) {
    console.error('❌ Admin email sending error:', error);
    return null;
  }
}

// MongoDB Connection
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/nomu_cafe';
console.log('🔗 Attempting to connect to MongoDB:', mongoUri);

mongoose.connect(mongoUri)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.log('💡 Please make sure MongoDB is running or update MONGO_URI in .env file');
  });

// Admin Schema (matching your existing database structure)
const adminSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true },
  role: { type: String, enum: ['superadmin', 'manager', 'staff'] },
  password: String,
  status: { type: String, default: 'inactive' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: Date.now },
  firstLoginCompleted: { type: Boolean, default: true },
  /** When set, password login skips OTP until this time (aligned with web admin remember-for-24h). */
  rememberUntil: { type: Date, default: null },
});

const Admin = mongoose.model('Admin', adminSchema);

// Customer Schema (for QR token loyalty system)
const customerSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  qrToken: { type: String, unique: true },
  points: { type: Number, default: 0 },
  reviewPoints: { type: Number, default: 0 },
  lastOrder: { type: String, default: '' },
  pastOrders: [
    {
      drink: String,
      quantity: { type: Number, default: 1 },
      date: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now },
  profilePicture: String,
});

const Customer = mongoose.model('Customer', customerSchema);

// User Schema (for existing users collection)
const userSchema = new mongoose.Schema({
  name: String,
  username: String,
  email: { type: String, unique: true },
  birthday: String,
  gender: String,
  userType: String,
  password: String,
  qrToken: { type: String, unique: true },
  points: { type: Number, default: 0 },
  reviewPoints: { type: Number, default: 0 },
  lastOrder: { type: String, default: '' },
  pastOrders: [
    {
      drink: String,
      quantity: { type: Number, default: 1 },
      date: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now },
  profilePicture: String,
});

const User = mongoose.model('User', userSchema);

// ==================== SOCKET.IO REAL-TIME FEATURES ====================

// Track connected admins
const connectedAdmins = new Map();

io.on('connection', (socket) => {
  console.log('🔌 [SOCKET] New connection:', socket.id);

  // Barista joins (with role validation for all admin types)
  socket.on('barista-join', async (data) => {
    try {
      console.log('🔐 [SOCKET] Barista join attempt from:', data.email);
      
      // 🔒 BACKEND SECURITY: Verify admin exists and has valid role
      const admin = await Admin.findOne({ 
        email: { $regex: new RegExp(`^${data.email}$`, 'i') } 
      });
      
      if (!admin) {
        console.log('❌ [SOCKET] Unauthorized join attempt - barista not found:', data.email);
        socket.emit('join-error', { 
          message: 'Admin not found. Access denied.',
          code: 'ADMIN_NOT_FOUND'
        });
        return;
      }
      
      // ✅ Allow superadmin, manager, and staff roles
      if (!['superadmin', 'manager', 'staff'].includes(admin.role)) {
        console.log('❌ [SOCKET] Unauthorized join attempt - invalid role:', {
          email: data.email,
          role: admin.role
        });
        socket.emit('join-error', { 
          message: 'Access denied. Valid admin role required.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
      }
      
      // ✅ Both validations passed
      console.log('✅ [SOCKET] Backend validation passed - user is barista:', {
        name: data.name,
        role: admin.role
      });
      
      connectedAdmins.set(socket.id, {
        name: data.name,
        email: data.email,
        role: admin.role,
        userType: data.userType,
        joinTime: new Date()
      });
      
      // Notify all connected clients about active admins
      io.emit('admin-status-update', {
        activeAdmins: Array.from(connectedAdmins.values()),
        totalConnected: connectedAdmins.size
      });
      
      console.log('👨‍💼 [SOCKET] Barista successfully joined:', {
        name: data.name,
        role: admin.role
      });
      
    } catch (error) {
      console.error('💥 [SOCKET] Error during barista join validation:', error);
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
      console.log('👨‍💼 [SOCKET] Barista left:', {
        name: admin.name,
        role: admin.role
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

// ==================== AUTHENTICATION ENDPOINTS ====================

// ==================== USER/CUSTOMER LOGIN ====================

// Regular user/customer login (for client-side app)
app.post('/api/user/login', async (req, res) => {
  console.log('👤 [USER LOGIN] Login request for:', req.body.email);
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Find user in customers collection first
    let user = await Customer.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });
    
    // If not found in customers, try users collection
    if (!user) {
      user = await User.findOne({ 
        email: { $regex: new RegExp(`^${email}$`, 'i') } 
      });
    }
    
    if (!user) {
      console.log('❌ [USER LOGIN] User not found for email:', email);
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ [USER LOGIN] Invalid password for email:', email);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    console.log('✅ [USER LOGIN] User credentials verified:', {
      email: email,
      name: user.name || user.fullName,
      points: user.points || 0
    });
    
    // Update last login
    user.lastLoginAt = new Date();
    user.updatedAt = new Date();
    await user.save();
    
    // Return user data (without password)
    const { password: _, ...userData } = user.toObject();
    
    res.json({
      message: 'Login successful',
      user: userData
    });
  } catch (err) {
    console.error('❌ [USER LOGIN] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// User registration (for client-side app)
app.post('/api/user/register', async (req, res) => {
  console.log('👤 [USER REGISTER] Registration request for:', req.body.email);
  try {
    const { name, email, password, birthday, gender } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    
    // Check if user already exists
    let existingUser = await Customer.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });
    
    if (!existingUser) {
      existingUser = await User.findOne({ 
        email: { $regex: new RegExp(`^${email}$`, 'i') } 
      });
    }
    
    if (existingUser) {
      console.log('❌ [USER REGISTER] User already exists:', email);
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate QR token
    const qrToken = generateQRToken();
    
    // Create new user in customers collection
    const newUser = new Customer({
      name,
      email,
      password: hashedPassword,
      birthday: birthday || '',
      gender: gender || '',
      points: 0,
      qrToken,
      lastOrder: null,
      pastOrders: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newUser.save();
    
    console.log('✅ [USER REGISTER] User registered successfully:', {
      email: email,
      name: name,
      qrToken: qrToken
    });
    
    // Return user data (without password)
    const { password: _, ...userData } = newUser.toObject();
    
    res.status(201).json({
      message: 'Registration successful',
      user: userData
    });
  } catch (err) {
    console.error('❌ [USER REGISTER] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== ADMIN LOGIN ====================

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
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });
    
    if (!admin) {
      console.log('❌ [ADMIN OTP] Admin not found for email:', email);
      return res.status(404).json({ error: 'Admin not found' });
    }

    // ✅ Allow superadmin, manager, and staff roles
    if (!['superadmin', 'manager', 'staff'].includes(admin.role)) {
      console.log('❌ [ADMIN OTP] Admin has invalid role:', {
        email: email,
        role: admin.role
      });
      return res.status(403).json({ error: 'Access denied. Valid admin account required.' });
    }

    console.log('✅ [ADMIN OTP] Admin found:', { 
      id: admin._id, 
      name: admin.fullName, 
      email: admin.email,
      role: admin.role
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
    const otp = await sendAdminLoginOTP(email, admin.fullName, admin.role);
    if (!otp) {
      return res.status(500).json({ error: 'Failed to send OTP email' });
    }

    // Store OTP with expiry and cooldown
    const now = Date.now();
    otpStore.set(email, {
      otp,
      expiresAt: now + ADMIN_OTP_TTL_MS,
      cooldownUntil: now + ADMIN_OTP_RESEND_COOLDOWN_MS,
      purpose: 'admin_login',
      adminId: admin._id
    });

    console.log('✅ [ADMIN OTP] OTP sent successfully to:', email);
    
    res.json({ 
      message: 'OTP sent successfully to your email',
      email: email,
      expiresIn: '10 minutes'
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
    if (!['superadmin', 'manager', 'staff'].includes(admin.role)) {
      console.log('❌ [ADMIN LOGIN] Admin has invalid role:', {
        email: email,
        role: admin.role
      });
      return res.status(403).json({ error: 'Access denied. Valid admin account required.' });
    }

    // ✅ Update admin status to active and lastLoginAt
    admin.status = 'active';
    admin.lastLoginAt = new Date();
    admin.updatedAt = new Date();
    await admin.save();

    // ✅ Create JWT
    const token = jwt.sign(
      { 
        adminId: admin._id,
        email: admin.email,
        role: admin.role,
        fullName: admin.fullName 
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
      role: admin.role
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

// Step 1: Send OTP for barista login
app.post('/api/barista/send-login-otp', async (req, res) => {
  console.log('📧 [BARISTA OTP] OTP request for:', req.body.email);
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find admin and verify they have a valid role
    const admin = await Admin.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });
    
    if (!admin) {
      console.log('❌ [BARISTA OTP] Admin not found for email:', email);
      return res.status(404).json({ error: 'Admin not found' });
    }

    // ✅ Allow superadmin, manager, and staff roles
    if (!['superadmin', 'manager', 'staff'].includes(admin.role)) {
      console.log('❌ [BARISTA OTP] Admin has invalid role:', {
        email: email,
        role: admin.role
      });
      return res.status(403).json({ error: 'Access denied. Valid admin account required.' });
    }

    console.log('✅ [BARISTA OTP] Admin found:', { 
      id: admin._id, 
      name: admin.fullName, 
      email: admin.email,
      role: admin.role
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
    const otp = await sendAdminLoginOTP(email, admin.fullName, admin.role);
    if (!otp) {
      return res.status(500).json({ error: 'Failed to send OTP email' });
    }

    // Store OTP with expiry and cooldown
    const now = Date.now();
    otpStore.set(email, {
      otp,
      expiresAt: now + ADMIN_OTP_TTL_MS,
      cooldownUntil: now + ADMIN_OTP_RESEND_COOLDOWN_MS,
      purpose: 'barista_login',
      adminId: admin._id
    });

    console.log('✅ [BARISTA OTP] OTP sent successfully to:', email);
    
    res.json({ 
      message: 'OTP sent successfully to your email',
      email: email,
      expiresIn: '10 minutes'
    });
  } catch (err) {
    console.error('❌ [BARISTA OTP] Error sending OTP:', err);
    res.status(500).json({ error: err.message });
  }
});

// Step 2: Verify OTP and complete barista login
app.post('/api/barista/verify-login-otp', async (req, res) => {
  console.log('🔐 [BARISTA LOGIN] OTP verification for:', req.body.email);
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Verify OTP
    const storedData = otpStore.get(email);
    if (!storedData) {
      console.log('❌ [BARISTA LOGIN] No OTP found for:', email);
      return res.status(400).json({ error: 'OTP not found or expired' });
    }

    if (storedData.purpose !== 'barista_login') {
      console.log('❌ [BARISTA LOGIN] Invalid OTP purpose for:', email);
      return res.status(400).json({ error: 'Invalid OTP purpose' });
    }

    if (Date.now() > storedData.expiresAt) {
      console.log('❌ [BARISTA LOGIN] OTP expired for:', email);
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP has expired' });
    }

    if (storedData.otp !== otp) {
      console.log('❌ [BARISTA LOGIN] Invalid OTP for:', email);
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // OTP verified, get admin and complete login
    const admin = await Admin.findById(storedData.adminId);
    if (!admin) {
      console.log('❌ [BARISTA LOGIN] Admin not found for ID:', storedData.adminId);
      return res.status(404).json({ error: 'Admin not found' });
    }

    // ✅ Allow superadmin, manager, and staff roles
    if (!['superadmin', 'manager', 'staff'].includes(admin.role)) {
      console.log('❌ [BARISTA LOGIN] Admin has invalid role:', {
        email: email,
        role: admin.role
      });
      return res.status(403).json({ error: 'Access denied. Valid admin account required.' });
    }

    // ✅ Update admin status to active and lastLoginAt
    admin.status = 'active';
    admin.lastLoginAt = new Date();
    admin.updatedAt = new Date();
    await admin.save();

    // ✅ Create JWT
    const token = jwt.sign(
      { 
        adminId: admin._id,
        email: admin.email,
        role: admin.role,
        fullName: admin.fullName 
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Remove password from response
    const { password: _, ...adminData } = admin.toObject();
    
    // Clean up OTP
    otpStore.delete(email);
    
    console.log('🎉 [BARISTA LOGIN] Login successful for barista:', email);
    
    res.json({
      message: 'Barista login successful',
      token,
      user: adminData
    });
  } catch (err) {
    console.error('❌ [BARISTA LOGIN] Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Login endpoint (email + password verification for barista)
app.post('/api/login', async (req, res) => {
  console.log('🔐 [LOGIN] Login request for:', req.body.email);
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Find admin and verify credentials
    const admin = await Admin.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });
    
    if (!admin) {
      console.log('❌ [LOGIN] Admin not found for email:', email);
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // ✅ Allow superadmin, manager, and staff roles
    if (!['superadmin', 'manager', 'staff'].includes(admin.role)) {
      console.log('❌ [LOGIN] Admin has invalid role:', {
        email: email,
        role: admin.role
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
      role: admin.role
    });
    
    // ✅ Update admin status to active and lastLoginAt
    admin.status = 'active';
    admin.lastLoginAt = new Date();
    admin.updatedAt = new Date();
    await admin.save();
    
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

// Mobile admin login endpoint (for Flutter app)
app.post('/api/mobile/admin/login', async (req, res) => {
  console.log('📱 [MOBILE ADMIN] Login request from mobile app');
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Find admin and verify credentials
    const admin = await Admin.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });
    
    if (!admin) {
      console.log('❌ [MOBILE ADMIN] Admin not found for email:', email);
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // ✅ Allow superadmin, manager, and staff roles
    if (!['superadmin', 'manager', 'staff'].includes(admin.role)) {
      console.log('❌ [MOBILE ADMIN] Admin has invalid role:', {
        email: email,
        role: admin.role
      });
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // ✅ Compare password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    
    if (!isPasswordValid) {
      console.log('❌ [MOBILE ADMIN] Invalid password for email:', email);
      return res.status(400).json({ message: 'Invalid password' });
    }

    if (admin.rememberUntil) {
      const rememberUntilDate = admin.rememberUntil instanceof Date
        ? admin.rememberUntil
        : new Date(admin.rememberUntil);
      const stillValid =
        !Number.isNaN(rememberUntilDate.getTime()) && new Date() < rememberUntilDate;
      if (stillValid) {
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

        const { password: __, ...adminData } = admin.toObject();
        console.log('✅ [MOBILE ADMIN] Skipping OTP (rememberUntil valid):', admin.email);
        return res.json({
          message: 'Admin login successful',
          token,
          user: adminData,
          rememberUntil: rememberUntilDate.toISOString(),
          platform: 'mobile',
          requiresOTP: false
        });
      }
      admin.rememberUntil = null;
    }

    // ✅ Update admin status to active and lastLoginAt
    admin.status = 'active';
    admin.lastLoginAt = new Date();
    admin.updatedAt = new Date();
    await admin.save();

    // ✅ Generate OTP for mobile admin
    const otp = generateOTP();
    const now = Date.now();
    
    console.log('🔍 [DEBUG] Mobile admin OTP generation:');
    console.log('   - Generated OTP:', otp);
    console.log('   - OTP type:', typeof otp);
    console.log('   - OTP length:', otp.length);
    console.log('   - Admin email:', admin.email);
    console.log('   - Storing with key:', admin.email);
    
    otpStore.set(admin.email, {
      otp,
      expiresAt: now + ADMIN_OTP_TTL_MS,
      cooldownUntil: now + ADMIN_OTP_RESEND_COOLDOWN_MS,
      purpose: 'mobile_admin_login',
      adminId: admin._id
    });
    
    console.log('✅ [DEBUG] OTP stored successfully');
    console.log('   - Store now contains keys:', Array.from(otpStore.keys()));

    // ✅ Send OTP email (same layout as web admin)
    try {
      await adminEmailTransporter.sendMail({
        from: `"Nomu Cafe" <${process.env.EMAIL_USER}>`,
        to: admin.email,
        subject: 'Nomu Cafe - Admin Login Verification Code',
        text: `Your Nomu Cafe admin login verification code is: ${otp}. It expires in 10 minutes.`,
        html: buildNomuAdminLoginOtpEmailHtml(otp),
      });
    } catch (err) {
      console.error("⚠️ Failed to send OTP email:", err.message);
      // We still respond so modal opens
    }

    console.log('✅ [MOBILE ADMIN] OTP sent successfully to:', admin.email);
    
    res.json({
      message: 'OTP sent to registered email',
      email: admin.email,
      expiresIn: '10 minutes',
      requiresOTP: true
    });
  } catch (err) {
    console.error('❌ [MOBILE ADMIN] Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Mobile admin OTP verification
app.post('/api/mobile/admin/verify-otp', async (req, res) => {
  console.log('🔐 [MOBILE ADMIN OTP] OTP verification for:', req.body.email);
  try {
    const { email, otp, rememberFor1Day } = req.body;
    const remember24h =
      rememberFor1Day === true ||
      rememberFor1Day === 'true' ||
      rememberFor1Day === 1 ||
      rememberFor1Day === '1';

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Enhanced debugging
    console.log('🔍 [DEBUG] OTP verification details:');
    console.log('   - Email received:', email);
    console.log('   - OTP received:', otp);
    console.log('   - OTP length:', otp?.length);
    console.log('   - Current OTP store keys:', Array.from(otpStore.keys()));
    
    // Check all stored OTPs for debugging
    for (const [key, value] of otpStore.entries()) {
      console.log(`   - Stored OTP for ${key}:`, {
        otp: value.otp,
        purpose: value.purpose,
        expiresAt: new Date(value.expiresAt).toISOString(),
        isExpired: Date.now() > value.expiresAt
      });
    }

    // Verify OTP
    const storedData = otpStore.get(email);
    if (!storedData) {
      console.log('❌ [MOBILE ADMIN OTP] No OTP found for:', email);
      console.log('🔍 [DEBUG] Available keys in OTP store:', Array.from(otpStore.keys()));
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

    console.log('🔍 [DEBUG] OTP comparison:');
    console.log('   - Stored OTP:', storedData.otp);
    console.log('   - Received OTP:', otp);
    console.log('   - OTPs match:', storedData.otp === otp);
    console.log('   - Stored OTP type:', typeof storedData.otp);
    console.log('   - Received OTP type:', typeof otp);
    
    if (storedData.otp !== otp) {
      console.log('❌ [MOBILE ADMIN OTP] Invalid OTP for:', email);
      console.log('🔍 [DEBUG] OTP mismatch details:');
      console.log('   - Expected:', `"${storedData.otp}"`);
      console.log('   - Received:', `"${otp}"`);
      console.log('   - Length difference:', storedData.otp?.length - otp?.length);
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // OTP verified, get admin and complete login
    const admin = await Admin.findById(storedData.adminId);
    if (!admin) {
      console.log('❌ [MOBILE ADMIN OTP] Admin not found for ID:', storedData.adminId);
      return res.status(404).json({ message: 'Admin not found' });
    }

    // ✅ Allow superadmin, manager, and staff roles
    if (!['superadmin', 'manager', 'staff'].includes(admin.role)) {
      console.log('❌ [MOBILE ADMIN OTP] Admin has invalid role:', {
        email: email,
        role: admin.role
      });
      return res.status(403).json({ message: 'Access denied. Valid admin account required.' });
    }

    const rememberUntil = remember24h ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

    // ✅ Update admin status to active and lastLoginAt; persist 24h window like web admin
    admin.status = 'active';
    admin.lastLoginAt = new Date();
    admin.updatedAt = new Date();
    admin.rememberUntil = rememberUntil;
    await admin.save();

    // ✅ Create JWT
    const token = jwt.sign(
      { 
        adminId: admin._id,
        email: admin.email,
        role: admin.role,
        fullName: admin.fullName,
        platform: 'mobile'
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Remove password from response
    const { password: _, ...adminData } = admin.toObject();
    
    // Clean up OTP
    otpStore.delete(email);
    
    console.log('🎉 [MOBILE ADMIN OTP] Mobile admin login successful:', email);
    
    res.json({
      message: 'Mobile admin login successful',
      token,
      user: adminData,
      rememberUntil: rememberUntil ? rememberUntil.toISOString() : null,
      platform: 'mobile'
    });
  } catch (err) {
    console.error('❌ [MOBILE ADMIN OTP] Login error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Mobile admin resend OTP endpoint
app.post('/api/mobile/admin/resend-otp', async (req, res) => {
  console.log('📧 [MOBILE ADMIN RESEND] Resend OTP request for:', req.body.email);
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find admin and verify they are superadmin
    const admin = await Admin.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });
    
    if (!admin) {
      console.log('❌ [MOBILE ADMIN RESEND] Admin not found for email:', email);
      return res.status(404).json({ message: 'Admin not found' });
    }

    // ✅ Allow superadmin, manager, and staff roles
    if (!['superadmin', 'manager', 'staff'].includes(admin.role)) {
      console.log('❌ [MOBILE ADMIN RESEND] Admin has invalid role:', {
        email: email,
        role: admin.role
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
    
    console.log('🔍 [DEBUG] Mobile admin resend OTP generation:');
    console.log('   - Generated OTP:', otp);
    console.log('   - OTP type:', typeof otp);
    console.log('   - OTP length:', otp.length);
    console.log('   - Admin email:', admin.email);
    console.log('   - Storing with key:', admin.email);
    
    otpStore.set(admin.email, {
      otp,
      expiresAt: now + ADMIN_OTP_TTL_MS,
      cooldownUntil: now + ADMIN_OTP_RESEND_COOLDOWN_MS,
      purpose: 'mobile_admin_login',
      adminId: admin._id
    });
    
    console.log('✅ [DEBUG] Resend OTP stored successfully');
    console.log('   - Store now contains keys:', Array.from(otpStore.keys()));

    // Send OTP email (same layout as web admin)
    try {
      await adminEmailTransporter.sendMail({
        from: `"Nomu Cafe" <${process.env.EMAIL_USER}>`,
        to: admin.email,
        subject: 'Nomu Cafe - Admin Login Verification Code',
        text: `Your Nomu Cafe admin login verification code is: ${otp}. It expires in 10 minutes.`,
        html: buildNomuAdminLoginOtpEmailHtml(otp),
      });
    } catch (err) {
      console.error("⚠️ Failed to send resend OTP email:", err.message);
    }

    console.log('✅ [MOBILE ADMIN RESEND] OTP resent successfully to:', admin.email);
    
    res.json({
      message: 'OTP resent successfully to your email',
      email: admin.email,
      expiresIn: '10 minutes'
    });
  } catch (err) {
    console.error('❌ [MOBILE ADMIN RESEND] Error resending OTP:', err);
    res.status(500).json({ message: 'Server error during OTP resend' });
  }
});

// ==================== LOGOUT ENDPOINTS ====================

// Admin logout endpoint
app.post('/api/admin/logout', async (req, res) => {
  console.log('🚪 [LOGOUT] Admin logout request');
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Find admin and update status to inactive
    const admin = await Admin.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });
    
    if (!admin) {
      console.log('❌ [LOGOUT] Admin not found for email:', email);
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    // Update admin status to inactive; clear trust window so next login requires OTP again
    admin.status = 'inactive';
    admin.rememberUntil = null;
    admin.updatedAt = new Date();
    await admin.save();
    
    console.log('✅ [LOGOUT] Admin logged out successfully:', {
      email: email,
      role: admin.role
    });
    
    res.json({
      message: 'Logout successful',
      status: 'inactive'
    });
  } catch (err) {
    console.error('❌ [LOGOUT] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== INVENTORY MANAGEMENT ====================

// Inventory Schema
const inventoryItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, required: true },
  currentStock: { type: Number, default: 0 },
  minimumThreshold: { type: Number, default: 0 },
  maximumThreshold: { type: Number, default: 100 },
  unit: { type: String, default: 'pieces' },
  supplier: { 
    type: mongoose.Schema.Types.Mixed, 
    default: '' 
  },
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
  updatedAt: { type: Date, default: Date.now }
});

const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);

// Get all inventory items
app.get('/api/inventory', async (req, res) => {
  try {
    console.log('📦 [INVENTORY] Fetching all inventory items');
    
    const items = await InventoryItem.find({ status: 'active' })
      .sort({ name: 1 })
      .lean();
    
    console.log(`✅ [INVENTORY] Found ${items.length} inventory items`);
    
    res.json({
      success: true,
      items: items
    });
  } catch (err) {
    console.error('❌ [INVENTORY] Error fetching inventory items:', err);
    res.status(500).json({ error: 'Failed to fetch inventory items' });
  }
});

// Get inventory item by ID
app.get('/api/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📦 [INVENTORY] Fetching inventory item:', id);
    
    const item = await InventoryItem.findById(id);
    
    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    console.log('✅ [INVENTORY] Found inventory item:', item.name);
    
    res.json({
      success: true,
      item: item
    });
  } catch (err) {
    console.error('❌ [INVENTORY] Error fetching inventory item:', err);
    res.status(500).json({ error: 'Failed to fetch inventory item' });
  }
});

// Update inventory stock (decrease when product is sold)
app.put('/api/inventory/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, reason, adminId, adminName } = req.body;
    
    console.log('📦 [INVENTORY] Updating stock for item:', id, 'quantity:', quantity);
    console.log('📦 [INVENTORY] Request body:', JSON.stringify(req.body, null, 2));
    
    if (!quantity || quantity <= 0) {
      console.log('❌ [INVENTORY] Invalid quantity:', quantity);
      return res.status(400).json({ error: 'Valid quantity is required' });
    }
    
    console.log('📦 [INVENTORY] Looking for item with ID:', id);
    const item = await InventoryItem.findById(id);
    
    if (!item) {
      console.log('❌ [INVENTORY] Item not found with ID:', id);
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    console.log('📦 [INVENTORY] Found item:', item.name, 'Current stock:', item.currentStock);
    
    // Validate adminId
    if (!adminId || adminId.trim() === '') {
      console.log('❌ [INVENTORY] Invalid adminId:', adminId);
      return res.status(400).json({ error: 'Valid adminId is required' });
    }
    
    console.log('📦 [INVENTORY] Proceeding with atomic stock decrease...');
    
    // Use atomic update to prevent race conditions
    const updateResult = await InventoryItem.findByIdAndUpdate(
      id,
      {
        $inc: { currentStock: -quantity }, // Atomic decrease
        $set: {
          lastSold: new Date(),
          updatedAt: new Date(),
          updatedBy: adminId
        }
      },
      { 
        new: true, // Return updated document
        runValidators: true // Run schema validations
      }
    );
    
    if (!updateResult) {
      console.log('❌ [INVENTORY] Item not found during update');
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    // Check if stock went negative (race condition protection)
    if (updateResult.currentStock < 0) {
      console.log('❌ [INVENTORY] Stock went negative due to race condition. Rolling back...');
      // Rollback the decrease
      await InventoryItem.findByIdAndUpdate(
        id,
        {
          $inc: { currentStock: quantity }, // Rollback the decrease
          $set: {
            updatedAt: new Date(),
            updatedBy: adminId
          }
        }
      );
      return res.status(400).json({ 
        error: 'Insufficient stock - transaction rolled back', 
        currentStock: updateResult.currentStock + quantity,
        requestedQuantity: quantity
      });
    }
    
    const oldStock = updateResult.currentStock + quantity;
    console.log('📦 [INVENTORY] Atomic update successful. Old stock:', oldStock, 'New stock:', updateResult.currentStock);
    
    console.log('✅ [INVENTORY] Stock updated successfully:', {
      itemName: updateResult.name,
      oldStock: oldStock,
      newStock: updateResult.currentStock,
      quantitySold: quantity
    });
    
    res.json({
      success: true,
      item: updateResult,
      message: `Stock decreased by ${quantity} units`
    });
  } catch (err) {
    console.error('❌ [INVENTORY] Error updating stock:', err);
    console.error('❌ [INVENTORY] Error details:', err.message);
    console.error('❌ [INVENTORY] Error stack:', err.stack);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// Search inventory items by name
app.get('/api/inventory/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    console.log('📦 [INVENTORY] Searching for items with query:', query);
    
    const items = await InventoryItem.find({
      status: 'active',
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    }).sort({ name: 1 }).lean();
    
    console.log(`✅ [INVENTORY] Found ${items.length} items matching query`);
    
    res.json({
      success: true,
      items: items
    });
  } catch (err) {
    console.error('❌ [INVENTORY] Error searching inventory:', err);
    res.status(500).json({ error: 'Failed to search inventory' });
  }
});

// ==================== QR SCANNING ENDPOINTS ====================

// Add loyalty point when barista scans QR code
app.post('/api/loyalty/scan', async (req, res) => {
  try {
    const { qrToken, drink, employeeId } = req.body;
    
    console.log('🎯 [LOYALTY] QR scan request:', { qrToken, drink, employeeId });
    
    if (!qrToken) {
      return res.status(400).json({ error: 'QR token is required' });
    }

    // Find customer by QR token (check both customers and users collections)
    console.log('🔍 [DEBUG] Looking for customer with QR token:', qrToken);
    console.log('🔍 [DEBUG] QR token details:', {
      value: qrToken,
      length: qrToken.length,
      hasHyphens: qrToken.includes('-'),
      type: typeof qrToken
    });
    
    let customer = null;
    let foundInCollection = '';
    
    // Prefer users collection (same source as customer app + claim-reward resets).
    // Stale legacy Customer rows could still show 10 stamps after User.points was reset to 0.
    console.log('🔍 [DEBUG] Checking users collection first...');
    customer = await User.findOne({ qrToken });
    if (customer) {
      foundInCollection = 'users';
      console.log('✅ [DEBUG] Found in users collection');
    }

    if (!customer) {
      console.log('🔍 [DEBUG] Checking customers collection (legacy)...');
      customer = await Customer.findOne({ qrToken });
      if (customer) {
        foundInCollection = 'customers';
        console.log('✅ [DEBUG] Found in customers collection');
      }
    }
    
    // If still not found, try format variations in both collections
    if (!customer) {
      console.log('🔍 [DEBUG] Trying format variations...');
      
      // Try without hyphens in both collections
      if (qrToken.includes('-')) {
        const qrTokenWithoutHyphens = qrToken.replace(/-/g, '');
        console.log('🔍 [DEBUG] Trying without hyphens:', qrTokenWithoutHyphens);
        
        customer = await User.findOne({ qrToken: qrTokenWithoutHyphens });
        if (customer) {
          foundInCollection = 'users';
          console.log('✅ [DEBUG] Found in users collection (without hyphens)');
        } else {
          customer = await Customer.findOne({ qrToken: qrTokenWithoutHyphens });
          if (customer) {
            foundInCollection = 'customers';
            console.log('✅ [DEBUG] Found in customers collection (without hyphens)');
          }
        }
      }
      
      // Try with hyphens in both collections
      if (!customer && !qrToken.includes('-') && qrToken.length === 36) {
        const qrTokenWithHyphens = `${qrToken.substring(0, 8)}-${qrToken.substring(8, 12)}-${qrToken.substring(12, 16)}-${qrToken.substring(16, 20)}-${qrToken.substring(20, 36)}`;
        console.log('🔍 [DEBUG] Trying with hyphens:', qrTokenWithHyphens);
        
        customer = await User.findOne({ qrToken: qrTokenWithHyphens });
        if (customer) {
          foundInCollection = 'users';
          console.log('✅ [DEBUG] Found in users collection (with hyphens)');
        } else {
          customer = await Customer.findOne({ qrToken: qrTokenWithHyphens });
          if (customer) {
            foundInCollection = 'customers';
            console.log('✅ [DEBUG] Found in customers collection (with hyphens)');
          }
        }
      }
    }
    
    // Debug: Show sample data from both collections if not found
    if (!customer) {
      console.log('🔍 [DEBUG] No customer found, checking sample data from both collections...');
      const sampleCustomers = await Customer.find({}, 'qrToken name email').limit(3);
      const sampleUsers = await User.find({}, 'qrToken name email').limit(3);
      
      console.log('🔍 [DEBUG] Sample customers:', sampleCustomers.map(c => ({
        qrToken: c.qrToken,
        name: c.name,
        qrTokenLength: c.qrToken?.length,
        qrTokenHasHyphens: c.qrToken?.includes('-')
      })));
      
      console.log('🔍 [DEBUG] Sample users:', sampleUsers.map(u => ({
        qrToken: u.qrToken,
        name: u.name,
        qrTokenLength: u.qrToken?.length,
        qrTokenHasHyphens: u.qrToken?.includes('-')
      })));
    }
    
    if (!customer) {
      console.log('❌ [LOYALTY] Customer not found for QR token:', qrToken);
      return res.status(404).json({ error: 'Customer not found' });
    }

    // High-volume security checks
    try {
      // Check customer limits
      checkCustomerLimits(customer._id.toString());
      
      // Check employee limits if employeeId is provided
      if (employeeId) {
        checkEmployeeLimits(employeeId);
        
        // Detect abuse patterns
        if (detectAbuse(employeeId, customer._id.toString())) {
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
    
    console.log('🔍 [DEBUG] Found customer in database:', {
      id: customer._id,
      name: customer.name,
      email: customer.email,
      qrToken: customer.qrToken,
      points: customer.points,
      pointsType: typeof customer.points,
      createdAt: customer.createdAt
    });
    
    console.log('✅ [LOYALTY] Customer found:', { 
      id: customer._id, 
      name: customer.name, 
      email: customer.email,
      currentPoints: customer.points,
      pointsType: typeof customer.points,
      pointsValue: customer.points,
      pointsIsNull: customer.points === null,
      pointsIsUndefined: customer.points === undefined
    });

    // Check if customer already has maximum points (10)
    console.log('🔍 [DEBUG] Points check details:', {
      rawPoints: customer.points,
      pointsType: typeof customer.points,
      pointsOrZero: customer.points || 0,
      pointsOrZeroType: typeof (customer.points || 0),
      comparison: (customer.points || 0) >= 10,
      strictComparison: customer.points >= 10
    });
    
    if ((customer.points || 0) >= 10) {
      console.log('⚠️ [LOYALTY] Customer already has maximum points:', customer.points);
      return res.status(400).json({ 
        error: 'Customer already has 10 stamps', 
        points: customer.points 
      });
    }

    // Add 1 point
    customer.points = (customer.points || 0) + 1;
    
    // Record the drink order - split complex orders into individual items
    if (drink) {
      customer.lastOrder = drink;
      customer.pastOrders = customer.pastOrders || [];
      
      // Split complex orders (separated by commas) into individual items
      const orderItems = drink.split(',').map(item => item.trim()).filter(item => item.length > 0);
      
      // Add each item as a separate order entry
      orderItems.forEach(item => {
        customer.pastOrders.push({ 
          drink: item, 
          quantity: 1, // Each item gets quantity 1
          date: new Date() 
        });
      });
      
      // Keep only last 20 orders
      if (customer.pastOrders.length > 20) {
        customer.pastOrders.splice(0, customer.pastOrders.length - 20);
      }
    }

    await customer.save();
    
    // Record scan for security tracking
    try {
      recordCustomerScan(customer._id.toString(), 1);
      if (employeeId) {
        recordEmployeeScan(employeeId, customer._id.toString());
      }
    } catch (error) {
      console.log('⚠️ [SECURITY] Failed to record scan:', error.message);
    }
    
    console.log('✅ [LOYALTY] Points added successfully:', { 
      customerId: customer._id, 
      newPoints: customer.points, 
      drink: drink 
    });

    // Emit real-time notification to all connected superadmins
    io.emit('loyalty-point-added', {
      drink: drink,
      points: customer.points,
      totalOrders: customer.pastOrders ? customer.pastOrders.length : 0,
      timestamp: new Date(),
      message: `New order: ${drink} - Customer now has ${customer.points} points`
    });

    res.json({ 
      points: customer.points, 
      lastOrder: customer.lastOrder, 
      pastOrders: customer.pastOrders,
      totalOrders: customer.pastOrders ? customer.pastOrders.length : 0
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
    
    let customer = null;
    
    // Try to find in customers collection first
    customer = await Customer.findOne({ qrToken });
    
    // If not found in customers, try users collection
    if (!customer) {
      customer = await User.findOne({ qrToken });
    }
    
    // If still not found, try format variations in both collections
    if (!customer) {
      // Try without hyphens in both collections
      if (qrToken.includes('-')) {
        const qrTokenWithoutHyphens = qrToken.replace(/-/g, '');
        customer = await Customer.findOne({ qrToken: qrTokenWithoutHyphens });
        if (!customer) {
          customer = await User.findOne({ qrToken: qrTokenWithoutHyphens });
        }
      }
      
      // Try with hyphens in both collections
      if (!customer && !qrToken.includes('-') && qrToken.length === 36) {
        const qrTokenWithHyphens = `${qrToken.substring(0, 8)}-${qrToken.substring(8, 12)}-${qrToken.substring(12, 16)}-${qrToken.substring(16, 20)}-${qrToken.substring(20, 36)}`;
        customer = await Customer.findOne({ qrToken: qrTokenWithHyphens });
        if (!customer) {
          customer = await User.findOne({ qrToken: qrTokenWithHyphens });
        }
      }
    }
    
    if (!customer) {
      console.log('❌ [CUSTOMER] Customer not found for QR token:', qrToken);
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    console.log('✅ [CUSTOMER] Customer found:', { 
      id: customer._id, 
      name: customer.name, 
      email: customer.email,
      points: customer.points 
    });

    res.json(customer);
  } catch (err) {
    console.error('❌ [CUSTOMER] Error fetching customer by QR token:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== ANALYTICS ENDPOINTS ====================

// Get analytics data for dashboard (individual items separated)
app.get('/api/analytics/top-selling-items', async (req, res) => {
  try {
    console.log('📊 [ANALYTICS] Fetching top selling items');
    
    // Get all customers and users
    const customers = await Customer.find({}, 'pastOrders');
    const users = await User.find({}, 'pastOrders');
    
    // Combine all past orders from both collections
    const allPastOrders = [];
    
    // Process customers
    customers.forEach(customer => {
      if (customer.pastOrders && customer.pastOrders.length > 0) {
        allPastOrders.push(...customer.pastOrders);
      }
    });
    
    // Process users
    users.forEach(user => {
      if (user.pastOrders && user.pastOrders.length > 0) {
        allPastOrders.push(...user.pastOrders);
      }
    });
    
    console.log(`📊 [ANALYTICS] Found ${allPastOrders.length} total order entries`);
    
    // Count individual items (not grouped by order)
    const itemCounts = {};
    const itemOrders = {};
    
    allPastOrders.forEach(order => {
      const itemName = order.drink;
      const quantity = order.quantity || 1;
      
      if (!itemCounts[itemName]) {
        itemCounts[itemName] = 0;
        itemOrders[itemName] = 0;
      }
      
      itemCounts[itemName] += quantity;
      itemOrders[itemName] += 1; // Each order entry counts as 1 order
    });
    
    // Convert to array and sort by quantity
    const topSellingItems = Object.keys(itemCounts).map(itemName => ({
      item: itemName,
      quantity: itemCounts[itemName],
      orders: itemOrders[itemName]
    })).sort((a, b) => b.quantity - a.quantity);
    
    console.log(`📊 [ANALYTICS] Top selling items:`, topSellingItems.slice(0, 5));
    
    res.json({
      success: true,
      data: topSellingItems,
      totalItems: topSellingItems.length,
      totalOrders: allPastOrders.length
    });
  } catch (err) {
    console.error('❌ [ANALYTICS] Error fetching top selling items:', err);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Get analytics data by category
app.get('/api/analytics/best-sellers-by-category', async (req, res) => {
  try {
    console.log('📊 [ANALYTICS] Fetching best sellers by category');
    
    // Get all customers and users
    const customers = await Customer.find({}, 'pastOrders');
    const users = await User.find({}, 'pastOrders');
    
    // Combine all past orders from both collections
    const allPastOrders = [];
    
    customers.forEach(customer => {
      if (customer.pastOrders && customer.pastOrders.length > 0) {
        allPastOrders.push(...customer.pastOrders);
      }
    });
    
    users.forEach(user => {
      if (user.pastOrders && user.pastOrders.length > 0) {
        allPastOrders.push(...user.pastOrders);
      }
    });
    
    // Define category mappings
    const categoryMappings = {
      'Drinks': ['Americano', 'Cold Brew', 'Nomu Latte', 'Kumo Coffee', 'Orange Long Black', 'Cappuccino', 'Flavored Latte', 'Salted Caramel Latte', 'Spanish Latte', 'Chai Latte', 'Ube Vanilla Latte', 'Mazagran', 'Coconut Vanilla Latte', 'Chocolate Mocha', 'Caramel Macchiato', 'Macadamia Latte', 'Butterscotch Latte', 'Peachespresso', 'Shakerato', 'Mint Latte', 'Honey Oatmilk Latte', 'Nomu Milk Tea', 'Wintermelon Milk Tea', 'Taro Milk Tea', 'Blue Cotton Candy', 'Mixed Fruit Tea', 'Tiger Brown Sugar', 'Mixed Berries', 'Strawberry Lemonade Green Tea', 'Honey Citron Ginger Tea', 'Matcha Latte', 'Sakura Latte', 'Honey Lemon Chia', 'Hot Chocolate', 'Hot Mint Chocolate'],
      'Pizza': ['Creamy Pesto', 'Salame Piccante', 'Savory Spinach', 'The Five Cheese', 'Black Truffle', 'Cheese'],
      'Donuts': ['Original Milky Vanilla Glaze', 'Oreo Overload', 'White Chocolate with Almonds', 'Dark Chocolate with Cashew Nuts', 'Dark Chocolate with Sprinkles', 'Matcha', 'Strawberry with Sprinkles', 'Smores'],
      'Pastries': ['Pain Suisse', 'French Butter Croissant', 'Blueberry Cheesecake Danish', 'Mango Cheesecake Danish', 'Crookie', 'Pain Au Chocolat', 'Almond Croissant', 'Pain Suisse Chocolate', 'Hokkaido Cheese Danish', 'Vanilla Flan Brulee Tart', 'Pain Au Pistachio', 'Strawberry Cream Croissant', 'Choco-Berry Pain Suisse', 'Kunefe Pistachio Croissant', 'Garlic Cream Cheese Croissant', 'Pain Au Ham & Cheese', 'Grilled Cheese']
    };
    
    // Count items by category
    const categoryData = {};
    
    Object.keys(categoryMappings).forEach(category => {
      categoryData[category] = {};
    });
    
    allPastOrders.forEach(order => {
      const itemName = order.drink;
      const quantity = order.quantity || 1;
      
      // Find which category this item belongs to
      let itemCategory = 'Other';
      for (const [category, items] of Object.entries(categoryMappings)) {
        if (items.some(item => itemName.includes(item))) {
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
    
    // Convert to the format expected by the dashboard
    const result = {};
    Object.keys(categoryData).forEach(category => {
      const items = Object.keys(categoryData[category]).map(itemName => ({
        item: itemName,
        quantity: categoryData[category][itemName].quantity,
        orders: categoryData[category][itemName].orders
      })).sort((a, b) => b.quantity - a.quantity);
      
      result[category] = items;
    });
    
    console.log('📊 [ANALYTICS] Best sellers by category:', result);
    
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('❌ [ANALYTICS] Error fetching best sellers by category:', err);
    res.status(500).json({ error: 'Failed to fetch category analytics data' });
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
      'POST /api/barista/send-login-otp - Send OTP for barista login (all roles)',
      'POST /api/barista/verify-login-otp - Verify OTP and complete barista login (all roles)',
      'POST /api/login - Admin login verification (all roles)',
      'POST /api/mobile/admin/login - Mobile admin login (email + password) (all roles)',
      'POST /api/mobile/admin/verify-otp - Mobile admin OTP verification (all roles)',
      'POST /api/mobile/admin/resend-otp - Mobile admin OTP resend (all roles)',
      'POST /api/loyalty/scan - Add loyalty points via QR scan (all roles)',
      'GET /api/customer/qr/:qrToken - Get customer info by QR token',
      'GET /api/analytics/top-selling-items - Get top selling items (individual items separated)',
      'GET /api/analytics/best-sellers-by-category - Get best sellers by category',
      'GET /api/health - Health check',
      'GET /api/info - Server information'
    ],
    features: [
      'Email verification for admin login (all roles)',
      'Mobile admin authentication (all roles)',
      'OTP-based authentication',
      'QR code loyalty point scanning',
      'Customer information lookup',
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
      'POST /api/barista/send-login-otp',
      'POST /api/barista/verify-login-otp',
      'POST /api/login',
      'POST /api/mobile/admin/login',
      'POST /api/mobile/admin/verify-otp',
      'POST /api/mobile/admin/resend-otp',
      'POST /api/loyalty/scan',
      'GET /api/customer/qr/:qrToken',
      'GET /api/analytics/top-selling-items',
      'GET /api/analytics/best-sellers-by-category',
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

// Function to get local IP address
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const netIface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (netIface.family === 'IPv4' && !netIface.internal) {
        // Check if it's a private IP address
        const ip = netIface.address;
        if (isPrivateIP(ip)) {
          return ip;
        }
      }
    }
  }
  
  return 'localhost';
}

// Function to check if IP is private
function isPrivateIP(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  
  const first = parseInt(parts[0]);
  const second = parseInt(parts[1]);
  
  // 192.168.x.x
  if (first === 192 && second === 168) return true;
  
  // 10.x.x.x
  if (first === 10) return true;
  
  // 172.16.x.x to 172.31.x.x
  if (first === 172 && second >= 16 && second <= 31) return true;
  
  return false;
}

const PORT = process.env.SERVER_PORT || process.env.PORT || 5001;
// Bind all interfaces so http://localhost:PORT works (binding only to a LAN IP blocks localhost).
const BIND_HOST = process.env.SERVER_HOST || '0.0.0.0';
const LAN_IP = getLocalIPAddress();

server.listen(PORT, BIND_HOST, () => {
  console.log('🚀 NOMU Admin Scanner API is running!');
  console.log(`🌐 Listening on ${BIND_HOST}:${PORT} (all interfaces)`);
  console.log(`📱 Local: http://localhost:${PORT}`);
  if (LAN_IP !== 'localhost' && LAN_IP !== '127.0.0.1') {
    console.log(`🌍 Network (physical device): http://${LAN_IP}:${PORT}`);
    console.log(`📱 Flutter / phone: use ${LAN_IP} as API host on the same Wi‑Fi`);
  } else {
    console.log(`📱 Mobile App: emulator can use localhost; physical device needs your PC LAN IP`);
  }
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`🔌 Socket.IO: ws://localhost:${PORT}`);
  console.log('');
  console.log('📋 Available endpoints:');
  console.log('   POST /api/user/login - Regular user/customer login (for client-side app)');
  console.log('   POST /api/user/register - User/customer registration (for client-side app)');
  console.log('   POST /api/admin/send-login-otp - Send OTP for admin login (all roles)');
  console.log('   POST /api/admin/verify-login-otp - Verify OTP and complete admin login (all roles)');
  console.log('   POST /api/barista/send-login-otp - Send OTP for barista login (all roles)');
  console.log('   POST /api/barista/verify-login-otp - Verify OTP and complete barista login (all roles)');
  console.log('   POST /api/login - Admin login verification (all roles)');
  console.log('   POST /api/mobile/admin/login - Mobile admin login (email + password) (all roles)');
  console.log('   POST /api/mobile/admin/verify-otp - Mobile admin OTP verification (all roles)');
  console.log('   POST /api/mobile/admin/resend-otp - Mobile admin OTP resend (all roles)');
  console.log('   POST /api/loyalty/scan - Add loyalty points via QR scan (all roles)');
  console.log('   GET  /api/customer/qr/:qrToken - Get customer info by QR token');
  console.log('   GET  /api/analytics/top-selling-items - Get top selling items (individual items separated)');
  console.log('   GET  /api/analytics/best-sellers-by-category - Get best sellers by category');
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
