# 🌐 Complete Guide: Connecting Nomu Cafe to GoDaddy Domain

## Overview
This guide will help you connect your Nomu Cafe web application to your GoDaddy domain. You have several options depending on your hosting setup.

## 🎯 Quick Start Options

### Option 1: GoDaddy Web Hosting (Easiest)
- **Best for**: Beginners, shared hosting
- **Cost**: $3-10/month
- **Setup time**: 30-60 minutes

### Option 2: GoDaddy VPS/Cloud Server (Recommended)
- **Best for**: Full control, better performance
- **Cost**: $10-50/month
- **Setup time**: 1-2 hours

### Option 3: External VPS + GoDaddy DNS
- **Best for**: Maximum flexibility
- **Cost**: $5-20/month (VPS) + domain
- **Setup time**: 2-3 hours

---

## 🚀 Option 1: GoDaddy Web Hosting Setup

### Step 1: Prepare Your Application
```bash
# Run the deployment script
cd "C:\Capstone 1\NomuApplication"
.\01-web-application\deploy-to-godaddy.ps1
```

### Step 2: GoDaddy cPanel Configuration

#### 2.1 Access cPanel
1. Log into your GoDaddy account
2. Go to "My Products" → "Web Hosting"
3. Click "Manage" next to your hosting plan
4. Click "cPanel Admin"

#### 2.2 Upload Files
1. Open **File Manager**
2. Navigate to `public_html` folder
3. Upload all files from `nomu-deployment` folder
4. Extract if needed

#### 2.3 Configure Node.js (if available)
1. Look for "Node.js" in cPanel
2. Create a new Node.js application
3. Set:
   - **Application Root**: `api`
   - **Application URL**: `yourdomain.com/api`
   - **Application Startup File**: `index.js`
   - **Application Entry Point**: `index.js`

#### 2.4 Set Environment Variables
In Node.js app settings, add:
```
NODE_ENV=production
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
```

#### 2.5 Enable SSL
1. Go to "SSL/TLS" in cPanel
2. Enable "Force HTTPS Redirect"
3. Install SSL certificate (usually free)

---

## 🖥️ Option 2: GoDaddy VPS Setup

### Step 1: Create VPS
1. Go to GoDaddy → "Products" → "VPS"
2. Choose Linux VPS (Ubuntu 20.04 recommended)
3. Minimum specs: 2GB RAM, 1 CPU, 40GB SSD

### Step 2: Server Setup
```bash
# Connect to your VPS via SSH
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Install Nginx
apt install nginx -y

# Install MongoDB (or use MongoDB Atlas)
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt update
apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod
```

### Step 3: Deploy Application
```bash
# Create application directory
mkdir -p /var/www/nomu-cafe
cd /var/www/nomu-cafe

# Upload your application files (use SCP, SFTP, or Git)
# Example with SCP from your local machine:
# scp -r "C:\Capstone 1\NomuApplication\01-web-application" root@your-server-ip:/var/www/nomu-cafe/

# Install dependencies
cd /var/www/nomu-cafe/01-web-application/backend
npm install

cd ../frontend
npm install
npm run build

# Copy production environment
cp production.env .env
# Edit .env with your production values
```

### Step 4: Configure Nginx
```bash
# Create Nginx configuration
cat > /etc/nginx/sites-available/nomu-cafe << 'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Frontend
    location / {
        root /var/www/nomu-cafe/01-web-application/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable the site
ln -s /etc/nginx/sites-available/nomu-cafe /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Step 5: Start Application
```bash
# Start backend with PM2
cd /var/www/nomu-cafe/01-web-application/backend
pm2 start index.js --name "nomu-backend"
pm2 startup
pm2 save

# Install SSL certificate
apt install certbot python3-certbot-nginx -y
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 🌍 Option 3: External VPS + GoDaddy DNS

### Step 1: Get VPS
- **DigitalOcean**: $5-20/month
- **AWS EC2**: $5-50/month
- **Linode**: $5-20/month
- **Vultr**: $5-20/month

### Step 2: Deploy Application
Follow the same server setup as Option 2, but on your chosen VPS provider.

### Step 3: Configure GoDaddy DNS
1. Log into GoDaddy
2. Go to "My Products" → "Domains"
3. Click "DNS" next to your domain
4. Update DNS records:
   ```
   Type: A
   Name: @
   Value: YOUR_VPS_IP_ADDRESS
   TTL: 600
   
   Type: A
   Name: www
   Value: YOUR_VPS_IP_ADDRESS
   TTL: 600
   ```

---

## 🔧 Configuration Updates

### Update Frontend API Endpoints
You'll need to update your React app to use your domain instead of localhost:

1. **Find API calls** in your frontend code
2. **Replace** `http://localhost:5000` with `https://yourdomain.com/api`
3. **Update CORS settings** in your backend

### Backend CORS Configuration
Update your backend `.env` file:
```env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Database Configuration
- **MongoDB Atlas** (Recommended): Use cloud database
- **Local MongoDB**: Install on your server
- **Update connection string** in your `.env` file

---

## 🧪 Testing Your Deployment

### 1. Basic Tests
- [ ] Visit `https://yourdomain.com` - should load frontend
- [ ] Visit `https://yourdomain.com/api/health` - should return API response
- [ ] Check SSL certificate is valid
- [ ] Test all major features

### 2. Advanced Tests
- [ ] Test admin login
- [ ] Test file uploads
- [ ] Test real-time features (Socket.IO)
- [ ] Test mobile responsiveness
- [ ] Check browser console for errors

### 3. Performance Tests
- [ ] Test page load speed
- [ ] Test API response times
- [ ] Monitor server resources

---

## 🚨 Troubleshooting

### Common Issues

#### 1. "This site can't be reached"
- Check DNS propagation (can take 24-48 hours)
- Verify server is running
- Check firewall settings

#### 2. "502 Bad Gateway"
- Backend server not running
- Check PM2 status: `pm2 status`
- Check Nginx logs: `tail -f /var/log/nginx/error.log`

#### 3. CORS Errors
- Update `ALLOWED_ORIGINS` in backend
- Check frontend API endpoints

#### 4. SSL Issues
- Verify certificate installation
- Check certificate expiration
- Force HTTPS redirect

### Debugging Commands
```bash
# Check server status
pm2 status
pm2 logs

# Check Nginx status
systemctl status nginx
nginx -t

# Check application logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Test API endpoints
curl https://yourdomain.com/api/health
```

---

## 📞 Support Resources

### GoDaddy Support
- **Phone**: 1-866-938-1119
- **Live Chat**: Available 24/7
- **Knowledge Base**: help.godaddy.com

### Technical Documentation
- **Nginx**: nginx.org/en/docs/
- **Node.js**: nodejs.org/docs/
- **MongoDB**: docs.mongodb.com/

---

## 🎉 Success Checklist

- [ ] Domain points to your server
- [ ] SSL certificate installed and working
- [ ] Frontend loads correctly
- [ ] Backend API responds
- [ ] Database connected
- [ ] All features working
- [ ] Mobile responsive
- [ ] Performance optimized

**Congratulations! Your Nomu Cafe application is now live on your domain!** 🚀
