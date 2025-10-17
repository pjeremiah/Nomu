# 🚀 Local Development Setup Guide

## Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MongoDB (local or MongoDB Atlas)

## Step 1: Set Up Environment Variables

Create a `.env` file in `01-web-application/backend/` with the following content:

```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/nomu_cafe
# Or use your MongoDB Atlas connection string:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/nomu_cafe

# JWT Secret (32+ characters recommended)
JWT_SECRET=your_local_jwt_secret_32_characters_minimum_for_development

# Email Configuration for OTP and Notifications
# Use a Gmail account with App Password (not regular password)
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_password

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Rate Limiting (relaxed for development)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# JWT Security Configuration
JWT_EXPIRY=24h
JWT_ADMIN_EXPIRY=24h

# Security Headers (relaxed for development)
ENABLE_SECURITY_HEADERS=true
ENABLE_CORS_SECURITY=true

# GridFS Configuration
GRIDFS_BUCKET_NAME=uploads
```

## Step 2: Install Dependencies

### Backend Dependencies
```bash
cd 01-web-application/backend
npm install
```

### Frontend Dependencies
```bash
cd 01-web-application/frontend
npm install
```

## Step 3: Start the Development Servers

### Option A: Start Backend and Frontend Separately

**Terminal 1 - Backend Server:**
```bash
cd 01-web-application/backend
npm run dev
```
This will start the backend server on `http://localhost:5000`

**Terminal 2 - Frontend Server:**
```bash
cd 01-web-application/frontend
npm start
```
This will start the frontend server on `http://localhost:3000`

### Option B: Use the Setup Script (Recommended)

Create a `start-dev.bat` file in the root directory:

```batch
@echo off
echo Starting NOMU Application in Development Mode...
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd 01-web-application\backend && npm run dev"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd 01-web-application\frontend && npm start"

echo.
echo Both servers are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit this window...
pause > nul
```

## Step 4: Verify Everything is Working

1. **Backend Health Check:**
   - Open `http://localhost:5000/api/health` in your browser
   - You should see a JSON response with server status

2. **Frontend Application:**
   - Open `http://localhost:3000` in your browser
   - You should see your React application

3. **Database Connection:**
   - Check the backend console for MongoDB connection status
   - Should see "✅ Connected to MongoDB" message

## Step 5: Development Workflow

### Making Changes
- **Backend changes:** The server will automatically restart with nodemon
- **Frontend changes:** The page will automatically reload with hot reloading

### Testing API Endpoints
- Use Postman or curl to test API endpoints
- Backend runs on `http://localhost:5000`
- All API routes are prefixed with `/api/`

### Database Management
- Use MongoDB Compass or similar tool to manage your local database
- Default database name: `nomu_cafe`

## Troubleshooting

### Common Issues:

1. **Port Already in Use:**
   ```bash
   # Kill process using port 5000
   npx kill-port 5000
   
   # Kill process using port 3000
   npx kill-port 3000
   ```

2. **MongoDB Connection Issues:**
   - Make sure MongoDB is running locally
   - Check your MONGO_URI in the .env file
   - For MongoDB Atlas, ensure your IP is whitelisted

3. **CORS Issues:**
   - The backend is configured to allow localhost:3000
   - Check the CORS_ORIGIN setting in your .env file

4. **Missing Dependencies:**
   ```bash
   # Reinstall all dependencies
   cd 01-web-application/backend && npm install
   cd 01-web-application/frontend && npm install
   ```

## Important Notes

- **This setup is for LOCAL DEVELOPMENT ONLY**
- **Your deployed version on Render will NOT be affected**
- **Changes made locally will NOT be pushed to GitHub automatically**
- **Use `git status` to check what files have changed before committing**

## Git Safety

To ensure you don't accidentally push changes to GitHub:

1. **Check git status before committing:**
   ```bash
   git status
   ```

2. **Add only specific files:**
   ```bash
   git add specific-file.js
   ```

3. **Commit with a clear message:**
   ```bash
   git commit -m "Your development changes"
   ```

4. **Push only when ready:**
   ```bash
   git push origin your-branch-name
   ```

## Development URLs

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000/api/health
- **Admin Panel:** http://localhost:3000/admin (if you have admin routes)

Happy coding! 🎉
