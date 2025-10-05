# 🎯 Live Demo Setup Guide

This guide will help you prepare and run the live security demos for both mobile applications.

## 📋 Prerequisites

### Required Software
- Node.js (v14 or higher)
- MongoDB (running locally or remotely)
- Git (to clone the repository)

### Required Packages
- axios (for HTTP requests)
- colors (for colored console output)

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies

**For Mobile Client Backend:**
```bash
cd 02-mobile-client/mobile-backend
npm install axios colors
```

**For Mobile Barista Backend:**
```bash
cd 03-mobile-barista/mobile-barista-backend
npm install axios colors
```

### 2. Configure Environment Variables

**Mobile Client Backend (.env):**
```env
# Database
MONGODB_URI=mongodb://localhost:27017/nomu_mobile_client

# Security Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CUSTOMER_MAX_SCANS_PER_DAY=10
CUSTOMER_MAX_POINTS_PER_DAY=50
ENABLE_SUSPICIOUS_PATTERN_DETECTION=true
ENABLE_REAL_TIME_ALERTS=true
ENABLE_SECURITY_HEADERS=true
ENABLE_CORS_SECURITY=true

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_QR_EXPIRY=24h

# Server Configuration
PORT=5000
```

**Mobile Barista Backend (.env):**
```env
# Database
MONGODB_URI=mongodb://localhost:27017/nomu_mobile_barista

# Security Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
EMPLOYEE_MAX_SCANS_PER_HOUR=100
EMPLOYEE_MAX_SCANS_PER_DAY=500
EMPLOYEE_COOLDOWN_BETWEEN_SCANS=5
ENABLE_SUSPICIOUS_PATTERN_DETECTION=true
ENABLE_REAL_TIME_ALERTS=true
ENABLE_SECURITY_HEADERS=true
ENABLE_CORS_SECURITY=true

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_QR_EXPIRY=24h

# Server Configuration
PORT=5002
```

### 3. Start All Services

**Terminal 1 - MongoDB:**
```bash
mongod
```

**Terminal 2 - Mobile Client Backend:**
```bash
cd 02-mobile-client/mobile-backend
npm start
```

**Terminal 3 - Mobile Barista Backend:**
```bash
cd 03-mobile-barista/mobile-barista-backend
npm start
```

**Terminal 4 - Demo Scripts:**
```bash
# For client demo
cd 02-mobile-client/mobile-backend
node demo-security-live.js

# For barista demo
cd 03-mobile-barista/mobile-barista-backend
node demo-security-live.js
```

## 🎬 Demo Scripts

### Mobile Client Demo
- **File**: `02-mobile-client/mobile-backend/demo-security-live.js`
- **Duration**: 8-10 minutes
- **Features**: Customer rate limiting, points limits, IP protection, JWT tokens

### Mobile Barista Demo
- **File**: `03-mobile-barista/mobile-barista-backend/demo-security-live.js`
- **Duration**: 8-10 minutes
- **Features**: Employee rate limiting, abuse detection, rapid-fire protection

## 📱 Mobile App Integration

### For Live Mobile Demo
1. **Install mobile apps** on test devices
2. **Connect to local servers** (update API endpoints)
3. **Show real-time scanning** during presentation
4. **Demonstrate error handling** in mobile UI

### API Endpoints for Mobile Apps
- **Client Backend**: `http://localhost:5000`
- **Barista Backend**: `http://localhost:5002`

## 🔧 Troubleshooting

### Common Issues

**1. Server won't start:**
```bash
# Check if ports are available
netstat -an | findstr :5000
netstat -an | findstr :5002

# Kill processes using ports
taskkill /F /PID <process_id>
```

**2. MongoDB connection failed:**
```bash
# Check if MongoDB is running
mongosh --eval "db.runCommand('ping')"

# Start MongoDB if not running
mongod
```

**3. Demo scripts fail:**
```bash
# Check if servers are running
curl http://localhost:5000/api/health
curl http://localhost:5002/api/health

# Check console logs for errors
```

**4. Rate limiting not working:**
- Verify environment variables are set correctly
- Check middleware order in server.js
- Ensure express-rate-limit is installed

### Debug Mode
Add to your .env files for detailed logging:
```env
DEBUG=security:*
NODE_ENV=development
```

## 📊 Demo Metrics

### Expected Results

**Mobile Client Demo:**
- ✅ 5 normal scans successful
- 🚫 5+ scans blocked by daily limit
- 🚫 5+ scans blocked by points limit
- 🚫 5+ requests blocked by IP rate limit
- ✅ Security headers present
- ✅ JWT tokens generated and validated

**Mobile Barista Demo:**
- ✅ 5 normal scans successful
- 🚫 20+ scans blocked by rapid-fire detection
- 🚫 5+ scans blocked by same customer abuse
- 🚫 5+ requests blocked by IP rate limit
- ✅ Security headers present
- ✅ Abuse detection alerts in console

## 🎯 Presentation Tips

### Before the Demo
1. **Test everything** 30 minutes before
2. **Have backup plans** ready
3. **Prepare screenshots** of expected results
4. **Practice the timing** of each scenario

### During the Demo
1. **Explain each step** as you go
2. **Highlight security features** in real-time
3. **Show console logs** for abuse detection
4. **Engage the audience** with questions

### After the Demo
1. **Summarize key achievements**
2. **Show performance metrics**
3. **Discuss scalability benefits**
4. **Open for questions**

## 🚨 Emergency Backup

### If Live Demo Fails
1. **Show pre-recorded video** of the demo
2. **Display test results** from previous runs
3. **Walk through the code** explaining features
4. **Use static slides** with screenshots

### Backup Materials to Prepare
- Screenshots of successful demos
- Video recordings of key scenarios
- Test result logs
- Architecture diagrams
- Code snippets for key features

## 📞 Support

If you encounter issues during setup:
1. Check the console logs for error messages
2. Verify all environment variables are set
3. Ensure all required packages are installed
4. Test individual components before running full demo

---

**Good luck with your presentation! 🎓✨**
