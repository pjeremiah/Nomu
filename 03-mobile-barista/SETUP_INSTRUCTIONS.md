# 🛠️ Mobile Barista App Setup Instructions

Complete setup guide for the Nomu Cafe Mobile Barista Application.

## 📋 Prerequisites

### Required Software
- **Flutter SDK** (3.0.0 or higher)
- **Node.js** (16.0.0 or higher)
- **MongoDB** (4.4 or higher)
- **Android Studio** or **Xcode** (for mobile development)
- **Git** (for version control)

### System Requirements
- **Windows 10/11** (recommended)
- **macOS** (for iOS development)
- **Linux** (Ubuntu 18.04+)
- **8GB RAM** minimum
- **10GB free disk space**

## 🚀 Quick Start

### 1. Start Main Backend (Required)
```bash
# Navigate to main web backend
cd 01-web-application/backend

# Install dependencies (if not already done)
npm install

# Start the backend server
npm start
```

### 2. Run Mobile Barista App
```bash
# Navigate to mobile barista frontend
cd 03-mobile-barista/mobile-barista-frontend

# Install Flutter dependencies
flutter pub get

# Run the app
flutter run
```

## 🔧 Detailed Setup

### Flutter Environment Setup

#### 1. Install Flutter
```bash
# Download Flutter SDK from https://flutter.dev/docs/get-started/install
# Extract to C:\flutter (Windows) or ~/flutter (macOS/Linux)

# Add Flutter to PATH
export PATH="$PATH:/path/to/flutter/bin"

# Verify installation
flutter doctor
```

#### 2. Install Dependencies
```bash
# Navigate to mobile barista frontend
cd 03-mobile-barista/mobile-barista-frontend

# Install Flutter packages
flutter pub get

# Clean and rebuild (if needed)
flutter clean
flutter pub get
```

#### 3. Platform Setup

**Android:**
```bash
# Install Android Studio
# Set up Android SDK
# Accept Android licenses
flutter doctor --android-licenses

# Verify Android setup
flutter doctor
```

**iOS (macOS only):**
```bash
# Install Xcode from App Store
# Install Xcode command line tools
sudo xcode-select --install

# Verify iOS setup
flutter doctor
```

### Backend Setup

**Note**: The mobile barista app can connect directly to the main web backend at `http://192.168.100.3:5000/api`. The mobile-specific backend is optional.

#### 1. Mobile Barista Backend (Optional)
```bash
# Navigate to mobile barista backend directory
cd 03-mobile-barista/mobile-barista-backend

# Install dependencies
npm install

# Start the backend server
npm start
```

#### 2. Environment Configuration
The app uses smart configuration with fallbacks:
- **Default IP**: `192.168.100.3`
- **Main Backend Port**: `5000`
- **Mobile Backend Port**: `5001`

## 🔐 Authentication Setup

### 1. Create Admin Account
```bash
# Use the web application to create admin accounts
# Go to http://192.168.100.3:3000
# Sign up with admin role
```

### 2. Supported Roles
- **Super Admin**: Full system access
- **Manager**: Management and staff oversight
- **Staff**: Basic barista operations

### 3. Login Process
1. **Open mobile barista app**
2. **Enter admin email**
3. **Request OTP** (sent to email)
4. **Enter 6-digit OTP**
5. **Access granted** based on role

## 📱 Running the App

### Development Mode
```bash
# Run on connected device/emulator
flutter run

# Run on specific device
flutter run -d <device-id>

# Run in debug mode
flutter run --debug

# Run in release mode
flutter run --release
```

### Build for Production
```bash
# Build Android APK
flutter build apk --release

# Build iOS app (macOS only)
flutter build ios --release

# Build web app
flutter build web --release
```

## 🔧 Configuration

### Network Configuration
The app automatically detects the backend server:
- **Web/Desktop**: Uses `localhost` or current host
- **Mobile**: Uses `192.168.100.3` for physical devices
- **Override**: Can be changed via in-app settings

### API Endpoints
- **Main Backend**: `http://192.168.100.3:5000/api`
- **Mobile Backend**: `http://192.168.100.3:5001/api`
- **Health Check**: `http://192.168.100.3:5001/api/health`

### Environment Variables
Create `.env` file in `mobile-barista-backend/` directory:
```env
SERVER_HOST=192.168.100.3
SERVER_PORT=5001
MONGO_URI=mongodb://localhost:27017/nomu_cafe
JWT_SECRET=your-jwt-secret
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Flutter Doctor Issues
```bash
# Fix Android licenses
flutter doctor --android-licenses

# Update Flutter
flutter upgrade

# Clean Flutter cache
flutter clean
```

#### 2. Build Errors
```bash
# Clean and rebuild
flutter clean
flutter pub get
flutter run

# Check for dependency conflicts
flutter pub deps
```

#### 3. Connection Issues
- **Check backend status**: Visit `http://192.168.100.3:5000/api/health`
- **Verify IP address**: Ensure `192.168.100.3` is correct
- **Check firewall**: Allow ports 5000 and 5001
- **Network connectivity**: Ensure device and computer are on same network

#### 4. Permission Issues
- **Camera**: Required for QR code scanning
- **Storage**: Required for image uploads
- **Network**: Required for API communication

### Debug Information
```bash
# Enable verbose logging
flutter run --verbose

# Check device logs
flutter logs

# Analyze app performance
flutter run --profile
```

## 📚 Additional Resources

### Documentation
- **Flutter Docs**: https://flutter.dev/docs
- **Dart Docs**: https://dart.dev/guides
- **API Documentation**: See `01-web-application/backend/docs/`

### Support
- **Flutter Community**: https://flutter.dev/community
- **Stack Overflow**: Tag questions with `flutter` and `dart`
- **GitHub Issues**: Report bugs in the project repository

## 🎯 Next Steps

1. **Test all features** in the mobile barista app
2. **Create admin accounts** for different roles
3. **Configure production settings** for deployment
4. **Set up monitoring** and logging
5. **Train staff** on app usage

## 📞 Support

For technical support or questions:
- **Email**: [support-email]
- **Documentation**: Check project README files
- **Issues**: Create GitHub issue with detailed description

---

**Note**: This mobile barista app is designed to work alongside the main web application and mobile client app. Ensure all three applications are properly configured and running for full functionality.
