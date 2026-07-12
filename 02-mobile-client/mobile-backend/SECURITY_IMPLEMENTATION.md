# High-Volume Security Implementation

This document outlines the high-volume security features implemented for the Nomu mobile applications to handle large numbers of customers and baristas securely.

## 🔒 Security Features Implemented

### 1. IP-Based Rate Limiting
- **Configuration**: 100 requests per 15 minutes per IP address
- **Purpose**: Prevents server overload and DDoS attacks
- **Implementation**: Uses `express-rate-limit` middleware
- **Environment Variables**:
  - `RATE_LIMIT_WINDOW_MS=900000` (15 minutes)
  - `RATE_LIMIT_MAX_REQUESTS=100`

### 2. Employee Rate Limiting (Barista App)
- **Hourly Limit**: 100 scans per hour per employee
- **Daily Limit**: 500 scans per day per employee
- **Cooldown**: 5 seconds between scans
- **Purpose**: Prevents barista abuse and ensures fair usage
- **Environment Variables**:
  - `EMPLOYEE_MAX_SCANS_PER_HOUR=100`
  - `EMPLOYEE_MAX_SCANS_PER_DAY=500`
  - `EMPLOYEE_COOLDOWN_BETWEEN_SCANS=5`

### 3. Customer Rate Limiting (Mobile Client)
- **Daily Scan Limit**: 12 scans per day per customer
- **Daily Points Limit**: 12 points per day per customer
- **Daily reset**: Midnight **Asia/Manila (PHT)**, not server UTC
- **Purpose**: Prevents individual customer abuse
- **Environment Variables**:
  - `CUSTOMER_MAX_SCANS_PER_DAY=12`
  - `CUSTOMER_MAX_POINTS_PER_DAY=12`

### 4. JWT-Based QR Token Security
- **Token Type**: JWT with 24-hour expiry
- **Security Features**:
  - Session ID for tracking
  - Issued at timestamp
  - Type validation ('qr_loyalty')
  - Automatic token type detection
- **Environment Variables**:
  - `JWT_QR_EXPIRY=24h`
  - `JWT_ADMIN_EXPIRY=24h`

### 5. Abuse Detection, Persistent Block & Supervisor Unlock
- **Suspicious Pattern Detection**:
  - Same customer scanned multiple times by same employee
  - Rapid-fire scanning (too many scans in short time)
- **Persistent block**: Stored in MongoDB (`EmployeeScanBlock`); barista cannot scan until unlocked
- **Supervisor unlock**: Manager or owner (superadmin) enters web admin email + password in barista app → **Confirm**
- **Unlock API**: `POST /api/security/unlock-barista-scanner` on **nomu-mobile-backend**
- **Full documentation**: `04-documentation/ABUSE-BLOCK-SUPERVISOR-UNLOCK.md`
- **Environment Variables**:
  - `ENABLE_REAL_TIME_ALERTS=true`
  - `ENABLE_SUSPICIOUS_PATTERN_DETECTION=true` (**required in production**)
  - `ABUSE_DETECTION_THRESHOLD_SAME_CUSTOMER=8`
  - `ABUSE_DETECTION_THRESHOLD_RAPID_SCANS=10`

### 6. Security Headers
- **X-Content-Type-Options**: nosniff
- **X-Frame-Options**: DENY
- **X-XSS-Protection**: 1; mode=block
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: geolocation=(), microphone=(), camera=()

### 7. CORS Security
- **Restricted Origins**: Only allows specific localhost ports
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization, Accept
- **Credentials**: true

## 🚀 Performance Optimizations

### 1. In-Memory Caching
- Employee scan tracking
- Customer scan tracking
- IP request tracking
- Automatic cleanup every hour

### 2. JWT Token Caching
- 24-hour token validity reduces regeneration frequency
- Frontend caching for QR tokens
- Reduced server load

### 3. Database Optimization
- Atomic operations for point updates
- Indexed queries for QR token lookups
- Efficient data cleanup

## 📊 Monitoring & Analytics

### Real-time Monitoring
- Live abuse detection alerts
- Scan pattern analysis
- Rate limit tracking
- Security event logging

### Metrics Tracked
- Scans per employee per hour/day
- Scans per customer per day
- Points earned per customer per day
- Abuse pattern frequency
- IP request patterns

## 🔧 Configuration

### Environment Variables
All security configurations are controlled via environment variables in the `.env` file:

```env
# High-Volume Security Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EMPLOYEE_MAX_SCANS_PER_HOUR=100
EMPLOYEE_MAX_SCANS_PER_DAY=500
EMPLOYEE_COOLDOWN_BETWEEN_SCANS=5
CUSTOMER_MAX_SCANS_PER_DAY=12
CUSTOMER_MAX_POINTS_PER_DAY=12
JWT_QR_EXPIRY=24h
JWT_ADMIN_EXPIRY=24h
ENABLE_REAL_TIME_ALERTS=true
ENABLE_SUSPICIOUS_PATTERN_DETECTION=true
ABUSE_DETECTION_THRESHOLD_SAME_CUSTOMER=8
ABUSE_DETECTION_THRESHOLD_RAPID_SCANS=10
ENABLE_SECURITY_HEADERS=true
ENABLE_CORS_SECURITY=true
```

## 🛡️ Security Benefits

### For High-Volume Scenarios
1. **24-hour QR expiry**: Reduces regeneration frequency
2. **Employee-focused security**: Prevents abuse at the source
3. **Customer limits**: Prevents individual abuse
4. **Smart monitoring**: Detects patterns without blocking legitimate use
5. **Caching**: Reduces server load
6. **Performance**: Minimal database queries

### Protection Against
- DDoS attacks
- Brute force attempts
- Employee abuse
- Customer abuse
- Token manipulation
- Unusual scanning patterns

## 📱 Mobile App Integration

### Mobile Client (Customer App)
- QR token caching for 24 hours
- Automatic token refresh
- Rate limit awareness
- Security error handling

### Mobile Barista App
- Employee authentication
- Scan rate monitoring
- Abuse detection → **Scan blocked** modal with manager/owner credentials + **Confirm**
- Real-time security feedback

See `04-documentation/ABUSE-BLOCK-SUPERVISOR-UNLOCK.md` for the full operator and developer guide.

## 🔄 Backward Compatibility

- Legacy QR codes still work during transition
- JWT tokens get full security features
- Automatic detection of token type
- Seamless migration for existing users

## 📈 Scalability

This implementation is designed to handle:
- **Hundreds of customers** simultaneously
- **Multiple baristas** scanning concurrently
- **High-frequency scanning** during peak hours
- **Real-time monitoring** without performance impact

## 🚨 Error Handling

### Rate Limit Exceeded
```json
{
  "error": "Too many requests from this IP",
  "message": "Rate limit exceeded. Maximum 100 requests per 15 minutes.",
  "retryAfter": 900
}
```

### Abuse Detected (persistent — requires supervisor unlock)
```json
{
  "error": "Suspicious activity detected: the same customer was scanned too many times in a short period.",
  "code": "ABUSE_DETECTED",
  "requiresSupervisorUnlock": true
}
```

Unlock: `POST /api/security/unlock-barista-scanner` with `blockedEmployeeId`, `supervisorEmail`, `supervisorPassword`.

### Security Check Failed
```json
{
  "error": "Daily scan limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

## 🔧 Maintenance

### Regular Tasks
1. Monitor abuse detection logs
2. Review rate limit effectiveness
3. Update security thresholds as needed
4. Clean up old tracking data (automatic)

### Production Considerations
1. Use Redis instead of in-memory storage for better performance
2. Implement proper logging and monitoring
3. Set up alerts for security events
4. Regular security audits

## 📞 Support

For security-related issues or questions:
1. Check the logs for security events
2. Review rate limit configurations
3. Monitor abuse detection patterns
4. Contact the development team for advanced configuration

---

**Note**: This security implementation is specifically designed for mobile applications and does not affect the web application functionality.
