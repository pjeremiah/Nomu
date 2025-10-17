// Load environment variables
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const { GridFSBucket } = require('mongodb');

// Import security middleware
const {
  securityHeaders,
  corsOptions,
  generalRateLimiter,
  securityErrorHandler
} = require('./middleware/securityMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy headers configuration
// In development: don't trust proxies for security
// In production: trust first proxy (e.g., nginx, load balancer)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy in production
} else {
  app.set('trust proxy', false); // Don't trust proxies in development
}

// Security middleware (must be first)
app.use(securityHeaders);

// CORS with security
app.use(cors(corsOptions));

// Additional permissive CORS for development and mobile apps
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    // Allow all origins in development (including mobile apps)
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, User-Agent, X-API-Key, X-Client-Version, X-Platform');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    next();
  });
}

// Mobile app specific middleware
app.use((req, res, next) => {
  // Add mobile-friendly headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  
  // Allow mobile apps to access the API
  const userAgent = req.headers['user-agent'] || '';
  const isMobileApp = userAgent.includes('Flutter') || 
                     userAgent.includes('Dart') || 
                     userAgent.includes('Mobile') ||
                     !req.headers.origin; // No origin header typically means mobile app
                     
  if (isMobileApp) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  next();
});

// Request logging with security considerations
if (process.env.NODE_ENV === 'production') {
  // Production logging - more secure
  app.use(morgan('combined', {
    skip: (req, res) => {
      // Skip logging for health checks and static assets
      return req.url === '/api/health' || req.url.startsWith('/static/');
    },
    stream: {
      write: (message) => {
        // Log to console in production (you can redirect to file)
        // Log to console in production
      }
    }
  }));
} else {
  // Development logging
  app.use(morgan('dev'));
}

// Rate limiting
app.use(generalRateLimiter);

// Body parsing middleware with security limits
app.use(express.json({ 
  limit: process.env.MAX_FILE_SIZE || '5mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_FILE_SIZE || '5mb' 
}));
// Serve uploaded files statically with CORS headers
const path = require('path');
const fs = require('fs');
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Add CORS headers for static files
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
}, express.static(uploadsPath));

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log('✅ MongoDB connected successfully');
  
  // Initialize GridFS buckets for image serving
  const db = mongoose.connection.db;
  app.locals.gfsPromo = new GridFSBucket(db, { bucketName: 'promo_images' });
  app.locals.gfsMenu = new GridFSBucket(db, { bucketName: 'menu_images' });
  app.locals.gfsInventory = new GridFSBucket(db, { bucketName: 'inventory_images' });
  app.locals.gfsProfile = new GridFSBucket(db, { bucketName: 'profile_images' });
  
  console.log('✅ GridFS buckets initialized successfully');
  console.log('📁 Available buckets:', {
    promo: !!app.locals.gfsPromo,
    menu: !!app.locals.gfsMenu,
    inventory: !!app.locals.gfsInventory,
    profile: !!app.locals.gfsProfile
  });
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  // Don't exit - let server run for testing
});

// Import models to ensure they're registered
require('./models/AdminActivity');

// Routes
const authRoutes = require('./routes/auth');
const feedbackRoutes = require('./routes/feedback');
const menuRoutes = require('./routes/menu');
const adminRoutes = require('./routes/admins');
const analyticsRoutes = require('./routes/analytics');
const promoRoutes = require('./routes/promos');
const inventoryRoutes = require('./routes/inventory');
const rewardRoutes = require('./routes/rewards');
const abuseAlertRoutes = require('./routes/abuseAlerts');
const galleryRoutes = require('./routes/gallery');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/promos', promoRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/abuse-alerts', abuseAlertRoutes);
app.use('/api/gallery', galleryRoutes);

// GridFS Image serving routes
app.get('/api/images/promo/:id', async (req, res) => {
  const gfs = app.locals.gfsPromo;
  if (!gfs) {
    console.error('❌ GridFS promo bucket not initialized');
    return res.status(500).json({ message: 'GridFS not initialized' });
  }
  
  const fileId = req.params.id;
  console.log('🔍 Requesting promo image:', fileId);
  
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    console.log('❌ Invalid ObjectId format:', fileId);
    return res.status(400).json({ message: 'Invalid image ID format' });
  }
  
  try {
    const files = await gfs.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
    console.log('📁 Found files:', files.length);
    
    if (!files || files.length === 0) {
      console.log('❌ No files found for ID:', fileId);
      return res.status(404).json({ message: 'Image not found' });
    }
    
    const file = files[0];
    const contentType = file.metadata?.contentType || file.contentType || 'image/jpeg';
    
    // Set proper headers
    res.set({
      'Content-Type': contentType,
      'Content-Length': file.length,
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    });
    
    const downloadStream = gfs.openDownloadStream(new mongoose.Types.ObjectId(fileId));
    
    downloadStream.on('error', (err) => {
      console.error('Error reading image:', err);
      if (!res.headersSent) {
        res.status(404).json({ message: 'Image not found' });
      }
    });
    
    downloadStream.pipe(res);
    
  } catch (error) {
    console.error('Promo image error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

app.get('/api/images/menu/:id', async (req, res) => {
  const gfs = app.locals.gfsMenu;
  if (!gfs) {
    return res.status(500).json({ message: 'GridFS not initialized' });
  }
  
  const fileId = req.params.id;
  
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    return res.status(400).json({ message: 'Invalid image ID format' });
  }
  
  try {
    const files = await gfs.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
    
    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    const file = files[0];
    const contentType = file.metadata?.contentType || file.contentType || 'image/jpeg';
    
    // Set proper headers
    res.set({
      'Content-Type': contentType,
      'Content-Length': file.length,
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    });
    
    const downloadStream = gfs.openDownloadStream(new mongoose.Types.ObjectId(fileId));
    
    downloadStream.on('error', (err) => {
      console.error('Error reading image:', err);
      if (!res.headersSent) {
        res.status(404).json({ message: 'Image not found' });
      }
    });
    
    downloadStream.pipe(res);
    
  } catch (error) {
    console.error('Menu image error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

app.get('/api/images/inventory/:id', async (req, res) => {
  const gfs = app.locals.gfsInventory;
  if (!gfs) {
    return res.status(500).json({ message: 'GridFS not initialized' });
  }
  
  const fileId = req.params.id;
  
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    return res.status(400).json({ message: 'Invalid image ID format' });
  }
  
  try {
    const files = await gfs.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
    
    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    const file = files[0];
    const contentType = file.metadata?.contentType || file.contentType || 'image/jpeg';
    
    // Set proper headers
    res.set({
      'Content-Type': contentType,
      'Content-Length': file.length,
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    });
    
    const downloadStream = gfs.openDownloadStream(new mongoose.Types.ObjectId(fileId));
    
    downloadStream.on('error', (err) => {
      console.error('Error reading image:', err);
      if (!res.headersSent) {
        res.status(404).json({ message: 'Image not found' });
      }
    });
    
    downloadStream.pipe(res);
    
  } catch (error) {
    console.error('Inventory image error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

app.get('/api/images/profile/:id', async (req, res) => {
  const gfs = app.locals.gfsProfile;
  if (!gfs) {
    return res.status(500).json({ message: 'GridFS not initialized' });
  }
  
  const fileId = req.params.id;
  
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    return res.status(400).json({ message: 'Invalid image ID format' });
  }
  
  try {
    
    // Use async/await instead of callback
    const files = await gfs.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
    
    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    const file = files[0];
    const contentType = file.metadata?.contentType || file.contentType || 'image/jpeg';
    
    // Set proper headers
    res.set({
      'Content-Type': contentType,
      'Content-Length': file.length,
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    });
    
    const downloadStream = gfs.openDownloadStream(new mongoose.Types.ObjectId(fileId));
    
    downloadStream.on('error', (err) => {
      console.error('❌ Download stream error:', err);
      if (!res.headersSent) {
        res.status(404).json({ message: 'Image not found' });
      }
    });
    
    downloadStream.on('end', () => {
    });
    
    downloadStream.pipe(res);
    
  } catch (error) {
    console.error('❌ Profile image error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// Root route for testing
app.get('/', (req, res) => {
  res.send('Server is running and connected to MongoDB Atlas');
});

// Mobile app health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running and ready for mobile app connections',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    mobileSupport: true
  });
});

// Mobile app specific admin login test endpoint
app.post('/api/mobile/admin/test', (req, res) => {
  res.json({
    message: 'Mobile admin endpoint is accessible',
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    mobileFriendly: true
  });
});

// Security error handling middleware
app.use(securityErrorHandler);

// General error handling middleware
app.use((err, req, res, next) => {
  // Log error details for debugging (server-side only)
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ 
      message: 'Internal server error',
      error: 'Something went wrong. Please try again later.',
      timestamp: new Date().toISOString()
    });
  } else {
    // Development mode - show more details
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message,
      stack: err.stack
    });
  }
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: 'The requested endpoint does not exist'
  });
});

// Start server
app.listen(PORT, () => {
});

// Seed super admin on startup if missing
(async () => {
  try {
    const Admin = require('./models/Admin');
    const bcrypt = require('bcrypt');
    const path = require('path');
    const fs = require('fs');
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
    const superAdminUsername = process.env.SUPER_ADMIN_USERNAME || 'superadmin';
    const superAdminFullName = process.env.SUPER_ADMIN_FULLNAME || 'Super Admin';

    if (!superAdminEmail || !superAdminPassword) {
      console.warn('ℹ️ SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set. Skipping super admin seeding.');
      return;
    }

    if (!superAdminEmail.toLowerCase().endsWith('@gmail.com')) {
      console.warn('ℹ️ SUPER_ADMIN_EMAIL must end with @gmail.com. Skipping super admin seeding.');
      return;
    }

    const existing = await Admin.findOne({ email: superAdminEmail.toLowerCase() });
    if (existing) {
      if (existing.role !== 'superadmin') {
        existing.role = 'superadmin';
        existing.status = 'active';
        await existing.save();
      }
      // Write note file
      const note = `Super Admin Credentials\nEmail: ${superAdminEmail}\nPassword: ${superAdminPassword}\n\nStored via environment variables. Keep this file secure.`;
      fs.writeFileSync(path.join(__dirname, 'SUPER_ADMIN_NOTE.txt'), note);
      return;
    }

    const hashed = await bcrypt.hash(superAdminPassword, 10);
    await Admin.create({
      fullName: superAdminFullName,
      email: superAdminEmail.toLowerCase(),
      role: 'superadmin',
      password: hashed,
      status: 'active'
    });
    const note = `Super Admin Credentials\nEmail: ${superAdminEmail}\nPassword: ${superAdminPassword}\n\nStored via environment variables. Keep this file secure.`;
    fs.writeFileSync(path.join(__dirname, 'SUPER_ADMIN_NOTE.txt'), note);
  } catch (err) {
    console.error('❌ Failed to seed super admin:', err.message);
  }
})();