# 📱 Mobile Client App

Flutter mobile application for Nomu Cafe customers.

## 📁 Project Structure

```
02-mobile-client/
├── mobile-backend/        # Node.js backend for mobile app
│   ├── server.js          # Main server file
│   ├── package.json       # Backend dependencies
│   ├── services/          # Backend services
│   └── uploads/           # Mobile-specific uploads
├── mobile-frontend/       # Flutter mobile application
│   ├── lib/               # Dart source code
│   ├── assets/            # Images, fonts, videos
│   ├── android/           # Android-specific files
│   ├── ios/               # iOS-specific files
│   ├── web/               # Web platform files
│   ├── windows/           # Windows platform files
│   ├── linux/             # Linux platform files
│   ├── macos/             # macOS platform files
│   └── pubspec.yaml       # Flutter dependencies
├── SETUP_INSTRUCTIONS.md  # Setup guide
└── README.md              # This file
```

## 📋 Features

### Customer Features
- User registration and authentication
- Menu browsing with categories
- Loyalty points system with QR scanning
- Reward redemption system
- Feedback and reviews
- Promotional offers
- Profile management with photo uploads
- Location services with maps

### User Interface
- Modern Material Design interface
- Dark/Light theme support
- Category-based menu navigation
- Real-time notifications via WebSocket
- Smooth animations and transitions
- Offline capability for menu browsing

## 🛠️ Technology Stack

- **Framework**: Flutter 3.7.2+
- **Language**: Dart
- **State Management**: Provider
- **Backend Integration**: RESTful API + WebSocket
- **Authentication**: JWT with OTP
- **Local Storage**: SharedPreferences + SQLite
- **Image Processing**: Custom image optimization
- **Maps**: Google Maps integration

## 🚀 Setup Instructions

### Prerequisites
- Flutter SDK (3.7.2 or higher)
- Android Studio / VS Code with Flutter extension
- Android device or emulator
- Node.js (for backend scripts)

### Installation

#### Mobile Frontend (Flutter App)
```bash
# Navigate to mobile frontend directory
cd 02-mobile-client/mobile-frontend

# Install Flutter dependencies
flutter pub get

# Run the app
flutter run
```

#### Mobile Backend (Optional)
```bash
# Navigate to mobile backend directory
cd 02-mobile-client/mobile-backend

# Install Node.js dependencies
npm install

# Start the backend server
npm start
```

### Configuration
The app automatically configures API endpoints:
- **Development**: `http://localhost:5000/api`
- **Android Device**: Uses your computer's IP address
- **Production**: Configure via environment variables

No manual configuration needed - the app detects the backend automatically!

## 📱 App Screens

### Authentication
- Login/Register
- OTP verification
- Forgot password

### Main Features
- Home dashboard
- Menu categories
- Product details
- Cart management
- Checkout process
- Order tracking
- Profile settings

### Additional
- Loyalty points
- Promotions
- Feedback form
- Order history

## 🔐 Security Features

- JWT token authentication
- OTP verification
- Secure API communication
- Biometric authentication (optional)
- Data encryption

## 📊 Analytics Integration

- User behavior tracking
- Order analytics
- Performance metrics
- Crash reporting

## 🚀 Deployment

### Android
```bash
flutter build apk --release
flutter build appbundle --release
```

### iOS
```bash
flutter build ios --release
```

## 📝 Development Notes

- Follow Flutter best practices
- Use proper state management
- Implement proper error handling
- Add comprehensive testing
- Optimize for performance

## 🔧 API Integration

The app integrates with the web application's backend API:
- Authentication endpoints
- Menu and product data
- Order management
- User profile management
- Analytics tracking

See the backend documentation for API details.
