const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const { body, validationResult } = require('express-validator');

// Rate limiting middleware
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs: windowMs || 15 * 60 * 1000, // 15 minutes default
    max: max || 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      details: message || 'Rate limit exceeded'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Specific rate limiters for different endpoints
const authRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10, // 10 attempts per 15 minutes (increased to allow for failed attempt tracking)
  'Too many authentication attempts'
);

// Rate limiter for signup attempts
const signupRateLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  3, // 3 signup attempts per hour
  'Too many signup attempts'
);

// Rate limiter for OTP verification attempts
const otpRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10, // 10 OTP attempts per 15 minutes
  'Too many OTP verification attempts'
);

const generalRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  500, // 500 requests per 15 minutes (increased for admin dashboard usage)
  'Too many requests'
);

const uploadRateLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  10, // 10 uploads per hour
  'Too many file uploads'
);

// Input validation middleware
const validateInput = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Enhanced input sanitization
const sanitizeInput = (req, res, next) => {
  // Remove any keys that start with '$' (MongoDB operators)
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (key.startsWith('$') || key.startsWith('__proto__') || key.startsWith('constructor')) {
        delete req.body[key];
      }
    });
  }
  
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (key.startsWith('$') || key.startsWith('__proto__') || key.startsWith('constructor')) {
        delete req.query[key];
      }
    });
  }
  
  // Sanitize params
  if (req.params) {
    Object.keys(req.params).forEach(key => {
      if (key.startsWith('$') || key.startsWith('__proto__') || key.startsWith('constructor')) {
        delete req.params[key];
      }
    });
  }
  
  next();
};

// File upload security middleware
const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Check file size (50MB limit)
  const maxSize = 50 * 1024 * 1024;
  if (req.file.size > maxSize) {
    return res.status(400).json({ 
      error: 'File too large', 
      maxSize: '50MB' 
    });
  }
  
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ 
      error: 'Invalid file type', 
      allowedTypes: ['JPEG', 'PNG', 'JPG'] 
    });
  }
  
  next();
};

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: []
    },
  } : false, // Disable CSP in development
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false, // Disable HSTS in development
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
  xssFilter: true,
  crossOriginEmbedderPolicy: false, // Disable COEP for better compatibility
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
});

// CORS configuration - Production Security Enhanced
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
      : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'];
    
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // In production, be more restrictive
    if (process.env.NODE_ENV === 'production') {
      // Only allow specific origins in production
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // Development mode - more permissive
      if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return callback(null, true);
      }
      
      // Allow Flutter mobile apps (they typically don't send origin header)
      if (origin && origin.includes('file://')) {
        return callback(null, true);
      }
      
      // Allow any origin in development mode
      callback(null, true);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Origin', 
    'Accept',
    'User-Agent',
    'X-API-Key',
    'X-Client-Version',
    'X-Platform'
  ],
  exposedHeaders: [
    'Content-Length', 
    'X-Foo', 
    'X-Bar',
    'X-Total-Count',
    'X-Page-Count'
  ]
};

// Error handling for security middleware - Mobile-friendly
const securityErrorHandler = (err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed',
      mobileFriendly: true,
      suggestion: 'Ensure your mobile app is sending proper headers'
    });
  }
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'File Too Large',
      message: 'Uploaded file exceeds size limit',
      mobileFriendly: true
    });
  }
  
  // Mobile app specific error handling
  const userAgent = req.headers['user-agent'] || '';
  const isMobileApp = userAgent.includes('Flutter') || 
                     userAgent.includes('Dart') || 
                     userAgent.includes('Mobile') ||
                     !req.headers.origin;
                     
  if (isMobileApp) {
    return res.status(500).json({
      error: 'Mobile App Error',
      message: 'An error occurred while processing your request',
      mobileFriendly: true,
      timestamp: new Date().toISOString()
    });
  }
  
  next(err);
};

module.exports = {
  createRateLimiter,
  authRateLimiter,
  signupRateLimiter,
  otpRateLimiter,
  generalRateLimiter,
  uploadRateLimiter,
  validateInput,
  sanitizeInput,
  validateFileUpload,
  securityHeaders,
  corsOptions,
  securityErrorHandler
};
