# 🚀 Render Deployment Guide for NomuApplication

Complete guide to deploy your NomuApplication to Render using web services.

## 📋 Prerequisites

Before deploying, ensure you have:

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **MongoDB Atlas**: Set up a MongoDB Atlas cluster
4. **Gmail Account**: For email services (OTP, notifications)

## 🏗️ Project Structure

Your project will be deployed as two separate services:

```
NomuApplication/
├── 01-web-application/
│   ├── backend/          # Node.js API (Web Service)
│   └── frontend/         # React App (Static Site)
├── render.yaml           # Render configuration
└── RENDER_DEPLOYMENT_GUIDE.md
```

## 🔧 Environment Variables Setup

### Backend Environment Variables

You'll need to configure these in your Render dashboard:

#### Required Variables
```env
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/nomu_cafe?retryWrites=true&w=majority

# Authentication
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters_long

# Email Configuration
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password

# Super Admin Account
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=your_secure_password
```

#### Optional Variables (with defaults)
```env
# Server Configuration
NODE_ENV=production
PORT=5000
BCRYPT_ROUNDS=14
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=5242880
ALLOWED_ORIGINS=https://nomu-frontend.onrender.com
TRUST_PROXY=1

# Admin Account Details
SUPER_ADMIN_USERNAME=superadmin
SUPER_ADMIN_FULLNAME=Super Admin
```

### Frontend Environment Variables

```env
# API Configuration
REACT_APP_API_URL=https://nomu-backend.onrender.com

# Build Configuration
GENERATE_SOURCEMAP=false
```

## 🚀 Deployment Steps

### Step 1: Prepare Your Repository

1. **Commit all changes** to your GitHub repository
2. **Ensure render.yaml is in the root** of your repository
3. **Verify Procfile exists** in both backend and frontend directories

### Step 2: Create MongoDB Atlas Database

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a new cluster
3. Create a database user
4. Get your connection string
5. Whitelist Render's IP ranges (0.0.0.0/0 for development)

### Step 3: Set Up Gmail App Password

1. Enable 2-Factor Authentication on your Google Account
2. Go to Google Account Settings > Security > App passwords
3. Generate an app password for "Mail"
4. Use this 16-character password (not your regular password)

### Step 4: Deploy Backend Service

1. **Go to Render Dashboard**
   - Visit [dashboard.render.com](https://dashboard.render.com)
   - Click "New +" → "Web Service"

2. **Connect Repository**
   - Connect your GitHub account
   - Select your NomuApplication repository

3. **Configure Backend Service**
   ```
   Name: nomu-backend
   Environment: Node
   Region: Choose closest to your users
   Branch: main (or your default branch)
   Root Directory: 01-web-application/backend
   Build Command: npm install
   Start Command: npm start
   ```

4. **Set Environment Variables**
   - Add all required environment variables from the list above
   - Make sure to use your actual MongoDB URI and Gmail credentials

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Note the service URL (e.g., `https://nomu-backend.onrender.com`)

### Step 5: Deploy Frontend Service

1. **Create Static Site**
   - In Render Dashboard, click "New +" → "Static Site"
   - Connect the same repository

2. **Configure Frontend Service**
   ```
   Name: nomu-frontend
   Environment: Static Site
   Root Directory: 01-web-application/frontend
   Build Command: npm install && npm run build
   Publish Directory: build
   ```

3. **Set Environment Variables**
   ```
   REACT_APP_API_URL=https://nomu-backend.onrender.com
   GENERATE_SOURCEMAP=false
   ```

4. **Deploy**
   - Click "Create Static Site"
   - Wait for build and deployment to complete
   - Note the site URL (e.g., `https://nomu-frontend.onrender.com`)

### Step 6: Update Backend CORS Settings

1. **Update ALLOWED_ORIGINS**
   - Go to your backend service settings
   - Update the `ALLOWED_ORIGINS` environment variable
   - Set it to your frontend URL: `https://nomu-frontend.onrender.com`

2. **Redeploy Backend**
   - Trigger a manual deployment to apply the changes

## 🔄 Alternative: Blueprint Deployment

If you prefer to deploy both services at once using the `render.yaml` file:

1. **Go to Render Dashboard**
   - Click "New +" → "Blueprint"
   - Connect your repository

2. **Deploy from Blueprint**
   - Render will automatically create both services
   - You'll still need to set environment variables manually

## 🧪 Testing Your Deployment

### Backend Health Check
```bash
curl https://nomu-backend.onrender.com/api/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "Server is running and ready for mobile app connections",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "mobileSupport": true
}
```

### Frontend Access
- Visit your frontend URL
- Test login functionality
- Verify API calls are working

## 🔧 Troubleshooting

### Common Issues

#### 1. Backend Won't Start
**Symptoms**: Service shows "Build failed" or "Deploy failed"

**Solutions**:
- Check build logs in Render dashboard
- Verify all dependencies are in package.json
- Ensure Node.js version compatibility
- Check environment variables are set correctly

#### 2. Database Connection Issues
**Symptoms**: Backend starts but can't connect to MongoDB

**Solutions**:
- Verify MONGO_URI is correct
- Check MongoDB Atlas network access settings
- Ensure database user has proper permissions
- Test connection string locally first

#### 3. Email Not Working
**Symptoms**: OTP emails not being sent

**Solutions**:
- Verify EMAIL_USER and EMAIL_PASS are correct
- Use Gmail app password, not regular password
- Check Gmail account has 2FA enabled
- Test email configuration locally

#### 4. Frontend Can't Connect to Backend
**Symptoms**: Frontend loads but API calls fail

**Solutions**:
- Verify REACT_APP_API_URL is set correctly
- Check CORS settings in backend
- Ensure backend service is running
- Check browser console for errors

#### 5. Build Failures
**Symptoms**: Frontend build fails during deployment

**Solutions**:
- Check for TypeScript errors
- Verify all dependencies are installed
- Check for missing environment variables
- Review build logs for specific errors

### Debug Commands

#### Check Backend Logs
```bash
# In Render dashboard, go to your backend service
# Click on "Logs" tab to see real-time logs
```

#### Test API Endpoints
```bash
# Health check
curl https://nomu-backend.onrender.com/api/health

# Test admin login (if you have test data)
curl -X POST https://nomu-backend.onrender.com/api/admin/send-login-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com"}'
```

## 🔒 Security Considerations

### Production Security Checklist

- [ ] Use strong, unique passwords for all accounts
- [ ] Enable MongoDB Atlas network security
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS (automatic on Render)
- [ ] Set up proper CORS origins
- [ ] Use production-grade JWT secrets
- [ ] Enable rate limiting
- [ ] Monitor logs for suspicious activity

### Environment Variable Security

- Never commit `.env` files to version control
- Use Render's environment variable system
- Rotate secrets regularly
- Use different credentials for different environments

## 📊 Monitoring and Maintenance

### Render Dashboard Features

1. **Service Health**: Monitor uptime and performance
2. **Logs**: View real-time application logs
3. **Metrics**: Track CPU, memory, and response times
4. **Alerts**: Set up notifications for issues

### Regular Maintenance

- Monitor service health daily
- Check logs for errors weekly
- Update dependencies monthly
- Review security settings quarterly
- Backup database regularly

## 🚀 Scaling Your Application

### Render Plans

- **Starter**: $7/month per service (suitable for development)
- **Standard**: $25/month per service (recommended for production)
- **Pro**: Custom pricing (for high-traffic applications)

### Scaling Considerations

- Monitor resource usage
- Upgrade plans as needed
- Consider database scaling
- Implement caching strategies
- Use CDN for static assets

## 📞 Support

### Render Support
- Documentation: [render.com/docs](https://render.com/docs)
- Community: [community.render.com](https://community.render.com)
- Support: Available through Render dashboard

### Application Support
- Check logs first
- Review this deployment guide
- Test locally before deploying
- Use version control for rollbacks

## 🎉 Success!

Once deployed, your NomuApplication will be available at:
- **Frontend**: `https://nomu-frontend.onrender.com`
- **Backend API**: `https://nomu-backend.onrender.com`

Your cafe management system is now live and ready to serve customers!

---

**Next Steps**:
1. Test all functionality thoroughly
2. Set up monitoring and alerts
3. Configure custom domain (optional)
4. Set up automated backups
5. Plan for scaling as your business grows
