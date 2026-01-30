# Rate Limits Reference

All rate limits used across the Nomu application (web backend, mobile client backend, mobile barista backend).

---

## 1. Web application backend  
`01-web-application/backend`

### 1.1 General API (all endpoints)
| Setting | Value | Env override | Try again after |
|--------|--------|--------------|-----------------|
| Window | 5 minutes | `RATE_LIMIT_WINDOW_MS` | 5 minutes |
| Max requests per IP | 500 | `RATE_LIMIT_MAX_REQUESTS` | — |

- **File:** `middleware/securityMiddleware.js` → `generalRateLimiter`  
- **Applied in:** `index.js` (app-wide)

### 1.2 Auth (login)
| Setting | Value | Try again after |
|--------|--------|------------------|
| Window | 5 minutes | 5 minutes |
| Max attempts per IP | 10 | — |

- **File:** `middleware/securityMiddleware.js` → `authRateLimiter`  
- **Applied in:** `routes/auth.js` (login, logout, refresh, etc.)

### 1.3 Signup
| Setting | Value | Try again after |
|--------|--------|------------------|
| Window | 5 minutes | 5 minutes |
| Max attempts per IP | 3 | — |

- **File:** `middleware/securityMiddleware.js` → `signupRateLimiter`  
- **Applied in:** `routes/auth.js` (signup)

### 1.4 OTP verification
| Setting | Value | Try again after |
|--------|--------|------------------|
| Window | 5 minutes | 5 minutes |
| Max attempts per IP | 10 | — |

- **File:** `middleware/securityMiddleware.js` → `otpRateLimiter`  
- **Applied in:** `routes/auth.js` (OTP endpoints)

### 1.5 File uploads
| Setting | Value | Try again after |
|--------|--------|------------------|
| Window | 1 hour | 1 hour |
| Max uploads per IP | 10 | — |

- **File:** `middleware/securityMiddleware.js` → `uploadRateLimiter`  
- **Config:** `config/security.js` → `uploadWindowMs`, `uploadMaxRequests`

### 1.6 Admin operations  
`routes/admins.js`

| Operation | Window | Max | Try again after |
|-----------|--------|-----|------------------|
| List admins | 15 minutes | 50 | 15 minutes |
| Create admin | 1 hour | 5 | 1 hour |
| Update admin | 15 minutes | 20 | 15 minutes |
| Delete admin | 1 hour | 3 | 1 hour |
| Password reset | 15 minutes | 5 | 15 minutes |

- **File:** `routes/admins.js` → `createRateLimiter(...)` per operation

### 1.7 Config defaults  
`config/security.js`

| Key | Default | Description |
|-----|---------|--------------|
| `rateLimit.windowMs` | 5 min (300000 ms) | General API window |
| `rateLimit.maxRequests` | 100 | (when used from config) |
| `rateLimit.authWindowMs` | 5 min | Auth window |
| `rateLimit.authMaxRequests` | 5 | Auth attempts (config reference) |
| `rateLimit.uploadWindowMs` | 1 hour | Upload window |
| `rateLimit.uploadMaxRequests` | 10 | Uploads per hour |

---

## 2. Mobile barista backend  
`03-mobile-barista/mobile-barista-backend`

### 2.1 IP-based (all API requests)
| Setting | Default | Env override | Try again after |
|--------|---------|-------------|------------------|
| Window | 5 minutes | `RATE_LIMIT_WINDOW_MS` | 5 minutes |
| Max requests per IP | 1000 | `RATE_LIMIT_MAX_REQUESTS` | — |

- **File:** `middleware/securityMiddleware.js` → `ipRateLimit`, `config.rateLimitWindowMs`  
- **Skip:** `/api/health` only

### 2.2 Employee (barista) scan limits
| Setting | Default | Env override | Try again after |
|--------|---------|-------------|------------------|
| Max scans per hour | 100 | `EMPLOYEE_MAX_SCANS_PER_HOUR` | Next hour |
| Max scans per day | 500 | `EMPLOYEE_MAX_SCANS_PER_DAY` | Next day |
| Cooldown between scans | 5 seconds | `EMPLOYEE_COOLDOWN_BETWEEN_SCANS` | 5 seconds |

- **File:** `middleware/securityMiddleware.js` → `checkEmployeeLimits`, `recordEmployeeScan`

### 2.3 Customer (loyalty scan) limits
| Setting | Default | Env override | Try again after |
|--------|---------|-------------|------------------|
| Max scans per day | 10 | `CUSTOMER_MAX_SCANS_PER_DAY` | Next day |
| Max points per day | 50 | `CUSTOMER_MAX_POINTS_PER_DAY` | Next day |

- **File:** `middleware/securityMiddleware.js` → `checkCustomerLimits`, `recordCustomerScan`

### 2.4 Abuse detection (block scan, not rate limit window)
| Setting | Default | Env override | Effect |
|--------|---------|-------------|--------|
| Same customer scans (trigger) | 5 | `ABUSE_DETECTION_THRESHOLD_SAME_CUSTOMER` | Block + alert |
| Rapid scans in 1 min (trigger) | 20 | `ABUSE_DETECTION_THRESHOLD_RAPID_SCANS` | Block + alert |
| Unusual hours (11 PM–5 AM) | — | — | Block + alert |

- **File:** `middleware/securityMiddleware.js` → `detectAbuse`, `checkRepeatedScans`, `checkRapidScans`, `checkScanHours`

---

## 3. Mobile client backend  
`02-mobile-client/mobile-backend`

### 3.1 IP-based (all API requests)
| Setting | Default | Env override | Try again after |
|--------|---------|-------------|------------------|
| Window | 5 minutes | `RATE_LIMIT_WINDOW_MS` | 5 minutes |
| Max requests per IP | 100 | `RATE_LIMIT_MAX_REQUESTS` | — |

- **File:** `middleware/securityMiddleware.js` → `ipRateLimit`, `config`

### 3.2 Employee scan limits
| Setting | Default | Env override | Try again after |
|--------|---------|-------------|------------------|
| Max scans per hour | 100 | `EMPLOYEE_MAX_SCANS_PER_HOUR` | Next hour |
| Max scans per day | 500 | `EMPLOYEE_MAX_SCANS_PER_DAY` | Next day |
| Cooldown between scans | 5 seconds | `EMPLOYEE_COOLDOWN_BETWEEN_SCANS` | 5 seconds |

### 3.3 Customer (loyalty) limits
| Setting | Default | Env override | Try again after |
|--------|---------|-------------|------------------|
| Max scans per day | 10 | `CUSTOMER_MAX_SCANS_PER_DAY` | Next day |
| Max points per day | 50 | `CUSTOMER_MAX_POINTS_PER_DAY` | Next day |

- **File:** `middleware/securityMiddleware.js` → `checkCustomerLimits`  
- **Note:** 80% of daily scan/points limit triggers “approaching limit” notification.

### 3.4 Abuse detection
| Setting | Default | Env override |
|--------|---------|-------------|
| Same customer threshold | 5 | `ABUSE_DETECTION_THRESHOLD_SAME_CUSTOMER` |
| Rapid scans threshold | 20 | `ABUSE_DETECTION_THRESHOLD_RAPID_SCANS` |

---

## Environment variables summary

### Web backend
- `RATE_LIMIT_WINDOW_MS` — general window (ms). Example: `300000` = 5 min  
- `RATE_LIMIT_MAX_REQUESTS` — max requests in that window  

### Mobile barista backend
- `RATE_LIMIT_WINDOW_MS` — default 5 min  
- `RATE_LIMIT_MAX_REQUESTS` — default 1000  
- `EMPLOYEE_MAX_SCANS_PER_HOUR` — default 100  
- `EMPLOYEE_MAX_SCANS_PER_DAY` — default 500  
- `EMPLOYEE_COOLDOWN_BETWEEN_SCANS` — seconds, default 5  
- `CUSTOMER_MAX_SCANS_PER_DAY` — default 10  
- `CUSTOMER_MAX_POINTS_PER_DAY` — default 50  
- `ABUSE_DETECTION_THRESHOLD_SAME_CUSTOMER` — default 5  
- `ABUSE_DETECTION_THRESHOLD_RAPID_SCANS` — default 20  

### Mobile client backend
- Same as mobile barista for rate limits and abuse thresholds (see env-template.txt).

---

## Quick reference: “Try again after”

| Limit | Try again after |
|-------|------------------|
| General API (web) | 5 minutes |
| General API (mobile barista) | 5 minutes |
| General API (mobile client) | 5 minutes |
| Auth (login) | 5 minutes |
| Signup | 5 minutes |
| OTP | 5 minutes |
| File uploads | 1 hour |
| Admin list/update/password reset | 15 minutes |
| Admin create/delete | 1 hour |
| Employee cooldown (scan) | 5 seconds |
| Employee hourly/daily | Next hour / next day |
| Customer daily scans/points | Next day |
| Abuse block | No automatic reset (pattern-based) |
