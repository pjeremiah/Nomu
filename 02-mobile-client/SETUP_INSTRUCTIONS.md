# NOMU Cafe App - Setup Instructions

## 🚀 Quick Start

### Prerequisites
- Flutter SDK (3.7.2 or higher)
- Node.js (16 or higher)
- MongoDB
- Git

### Backend Setup

**Note**: The mobile app can connect directly to the main web backend at `http://localhost:5000/api`. The mobile-specific backend is optional.

1. **Navigate to mobile backend directory:**
   ```bash
   cd 02-mobile-client/mobile-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file (optional):**
   ```bash
   # Create .env file with minimal configuration
   echo "JWT_SECRET=fallback-secret-key-change-in-production-mobile" > .env
   echo "PORT=5001" >> .env
   echo "NODE_ENV=development" >> .env
   ```

4. **Start mobile backend (optional):**
   ```bash
   npm start
   ```

4. **Configure environment variables in .env:**
   ```env
   JWT_SECRET=your_strong_jwt_secret_here_at_least_32_characters_long
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_gmail_app_password
   SERVER_HOST=localhost
   SERVER_PORT=5000
   MONGODB_URI=mongodb://localhost:27017/nomu_cafe
   ```

5. **Start MongoDB service:**
   ```bash
   # Windows
   net start MongoDB
   
   # Linux/Mac
   sudo systemctl start mongod
   ```

6. **Start the backend server:**
   ```bash
   npm start
   ```

### Flutter App Setup

1. **Navigate to mobile frontend directory:**
   ```bash
   cd 02-mobile-client/mobile-frontend
   ```

2. **Install Flutter dependencies:**
   ```bash
   flutter pub get
   ```

3. **Run the app:**
   ```bash
   # For Android
   flutter run
   
   # For specific device
   flutter run -d <device-id>
   
   # For Web (if supported)
   flutter run -d chrome
   
   # For iOS (Mac only)
   flutter run -d ios
   ```

4. **API Configuration:**
   The app automatically detects the backend:
   - **Development**: Uses `http://localhost:5000/api`
   - **Android Device**: Uses your computer's IP address
   - **Production**: Configure via environment variables

## 🔧 Configuration

### Backend Configuration

The backend requires these environment variables:

- **JWT_SECRET**: A strong secret key for JWT token signing
- **EMAIL_USER**: Gmail address for sending emails
- **EMAIL_PASS**: Gmail App Password (not your regular password)
- **SERVER_HOST**: Server hostname (usually localhost for development)
- **SERVER_PORT**: Server port (default: 5000)
- **MONGODB_URI**: MongoDB connection string

### Flutter Configuration

The Flutter app automatically detects the server configuration. For production, update the server IP in the `.env` file in the backend directory.

## 🧹 Cleanup

### Debug Files Removed
The following debug files have been automatically removed from the project:
- `backend/debug-file-lookup.js`
- `backend/debug-gridfs.js`
- `backend/find-correct-database.js`
- `backend/test_server_ready.js`
- `backend/test-endpoints.js`
- `backend/verify-gridfs-endpoints.js`
- `test_account_settings_fix.js`
- `test_profile_picture_fixes.js`
- `test_profile_upload_fix.js`
- `build/` directory (Flutter build artifacts)

### Clean Build
To clean your project in the future:
```bash
# Clean Flutter build artifacts
flutter clean

# Clean backend node_modules (if needed)
cd backend
rm -rf node_modules
npm install
```

## 🐛 Troubleshooting

### Common Issues

1. **"JWT secret not configured" error:**
   - Make sure you have a JWT_SECRET in your .env file
   - The secret should be at least 32 characters long

2. **Email sending fails:**
   - Check your Gmail credentials
   - Make sure you're using an App Password, not your regular password
   - Enable 2-factor authentication on your Gmail account

3. **MongoDB connection fails:**
   - Make sure MongoDB is running
   - Check the MONGODB_URI in your .env file

4. **Flutter app can't connect to backend:**
   - Check if the backend server is running
   - Verify the server IP address in your .env file
   - Make sure both devices are on the same network

### Getting Gmail App Password

1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Go to Security → App passwords
4. Generate a new app password for "Mail"
5. Use this password as EMAIL_PASS in your .env file

## 📱 Features

- User registration and authentication
- Profile management with image upload
- Loyalty points system
- Real-time notifications
- Menu browsing
- Order history
- Promotional offers

## 🛠️ Development

### Code Structure

- `lib/` - Flutter app source code
- `backend/` - Node.js/Express backend
- `assets/` - Images, videos, and other resources

### Key Files

- `lib/main.dart` - App entry point
- `lib/api/api.dart` - API service layer
- `backend/server.js` - Backend server
- `backend/.env` - Environment configuration

## 📄 License

This project is for educational purposes.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

If you encounter any issues, please check the troubleshooting section above or create an issue in the repository.
