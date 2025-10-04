# 📱 Mobile Barista App

Flutter mobile application for Nomu Cafe baristas and admin staff.

## 📁 Project Structure

```
03-mobile-barista/
├── mobile-barista-backend/     # Node.js backend for mobile barista app
│   ├── server.js               # Main server file
│   ├── package.json            # Backend dependencies
│   ├── services/               # Backend services
│   └── uploads/                # Mobile barista-specific uploads
├── mobile-barista-frontend/    # Flutter mobile application
│   ├── lib/                    # Dart source code
│   ├── assets/                 # Images, fonts, videos
│   ├── android/                # Android-specific files
│   ├── ios/                    # iOS-specific files
│   ├── web/                    # Web platform files
│   ├── windows/                # Windows platform files
│   ├── linux/                  # Linux platform files
│   └── pubspec.yaml            # Flutter dependencies
├── SETUP_INSTRUCTIONS.md       # Setup guide
└── README.md                   # This file
```

## 🚀 Features

### 🔐 Authentication
- **OTP-based Login** for baristas and admin staff
- **Role-based Access Control** (Super Admin, Manager, Staff)
- **Secure Session Management**

### 📱 Core Features
- **QR Code Scanner** for customer loyalty cards
- **Inventory Management** with real-time updates
- **Menu Management** with image uploads
- **Order Processing** and transaction tracking
- **Real-time Notifications** via WebSocket

### 🛠️ Admin Tools
- **Staff Management** and role assignment
- **Analytics Dashboard** with sales insights
- **Customer Support** tools
- **System Configuration** and settings

## 🏗️ Installation

### Prerequisites
- **Flutter SDK** (3.0.0 or higher)
- **Node.js** (16.0.0 or higher)
- **MongoDB** (4.4 or higher)
- **Android Studio** or **Xcode** (for mobile development)

### Mobile Frontend (Flutter App)
```bash
# Navigate to mobile frontend directory
cd 03-mobile-barista/mobile-barista-frontend

# Install Flutter dependencies
flutter pub get

# Run the app
flutter run
```

### Mobile Backend (Optional)
```bash
# Navigate to mobile backend directory
cd 03-mobile-barista/mobile-barista-backend

# Install Node.js dependencies
npm install

# Start the backend server
npm start
```

## 🔧 Configuration

### Environment Variables
The app uses smart configuration with fallbacks:
- **Default IP**: `192.168.100.3:5001`
- **Main Backend**: Connects to `192.168.100.3:5000` for core functionality
- **Mobile Backend**: Optional dedicated backend on port `5001`

### API Endpoints
- **Main Backend**: `http://192.168.100.3:5000/api`
- **Mobile Backend**: `http://192.168.100.3:5001/api`
- **Health Check**: `http://192.168.100.3:5001/api/health`

## 📱 Platform Support

- **Android**: ✅ APK builds successfully
- **iOS**: ✅ Ready for iOS devices
- **Web**: ✅ Web build works
- **Windows**: ✅ Desktop app ready
- **Linux**: ✅ Linux app ready
- **macOS**: ✅ macOS app ready

## 🔐 Security Features

- **JWT Token Authentication**
- **Role-based Access Control**
- **Secure API Communication**
- **Input Validation and Sanitization**
- **Rate Limiting and CORS Protection**

## 🚀 Getting Started

1. **Start the main web backend** (required):
   ```bash
   cd 01-web-application/backend
   npm start
   ```

2. **Run the mobile barista app**:
   ```bash
   cd 03-mobile-barista/mobile-barista-frontend
   flutter run
   ```

3. **Login with admin credentials**:
   - Use existing admin account from web application
   - Or create new admin account via web interface

## 📚 Documentation

- **API Documentation**: See `01-web-application/backend/docs/`
- **Setup Instructions**: See `SETUP_INSTRUCTIONS.md`
- **Troubleshooting**: Check Flutter and backend logs

## 🛠️ Development

### Code Structure
- **`lib/`**: Main Flutter application code
- **`lib/api/`**: API service layer
- **`lib/services/`**: Business logic services
- **`lib/widgets/`**: Reusable UI components
- **`lib/models/`**: Data models and DTOs

### Key Services
- **`ApiService`**: HTTP API communication
- **`SocketService`**: Real-time WebSocket communication
- **`InventoryService`**: Inventory management
- **`MenuService`**: Menu item management
- **`NotificationService`**: Push notifications

## 🐛 Troubleshooting

### Common Issues
1. **Connection Errors**: Check if main backend is running
2. **Build Errors**: Run `flutter clean && flutter pub get`
3. **Permission Issues**: Check camera and storage permissions
4. **API Errors**: Verify backend endpoints and authentication

### Debug Mode
Enable debug logging by setting `kDebugMode = true` in the app configuration.

## 📄 License

This project is part of the Nomu Cafe Capstone Project.

## 👥 Team

- **Development**: Capstone Team
- **Supervisor**: [Supervisor Name]
- **Institution**: [Institution Name]

---

**Note**: This mobile barista app is designed to work alongside the main web application and mobile client app. Ensure all three applications are properly configured and running for full functionality.