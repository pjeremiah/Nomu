# 📱 Nomu Cafe Mobile Client

Flutter mobile application for customers with ordering, loyalty, and feedback features.

## 📁 Structure

```
02-mobile-client/
├── mobile-frontend/    # Flutter mobile app
├── mobile-backend/     # Optional Node.js backend
└── README.md          # This file
```

## 🛠️ Technology Stack

### Mobile Frontend
- **Flutter** (v3.7.2+)
- **Dart** - Programming language
- **Provider** - State management
- **HTTP** - API communication
- **Shared Preferences** - Local storage
- **Image Picker** - Photo uploads
- **QR Scanner** - QR code scanning
- **Google Maps** - Location services
- **Socket.io** - Real-time updates

### Mobile Backend (Optional)
- **Node.js** (v16.0+)
- **Express.js** - Web framework
- **MongoDB** - Database
- **Socket.io** - Real-time communication
- **Multer** - File uploads
- **GridFS** - Image storage

## 🚀 Quick Start

### Prerequisites
- Flutter SDK (v3.7.2 or higher)
- Dart SDK (included with Flutter)
- Android Studio / VS Code with Flutter extensions
- Android device/emulator or iOS device/simulator

### Mobile Frontend Setup

1. **Navigate to mobile frontend directory**
   ```bash
   cd 02-mobile-client/mobile-frontend
   ```

2. **Get Flutter dependencies**
   ```bash
   flutter pub get
   ```

3. **Configure environment**
   ```bash
   # Copy environment template from backend
   cp ../mobile-backend/env-template.txt .env
   
   # Edit .env file with your configuration
   # Required: API_BASE_URL, SOCKET_URL
   ```

4. **Run the application**
   ```bash
   # Run on connected device/emulator
   flutter run
   
   # For specific platform:
   flutter run -d android    # Android
   flutter run -d ios        # iOS
   flutter run -d web        # Web
   ```

### Mobile Backend Setup (Optional)

1. **Navigate to mobile backend directory**
   ```bash
   cd 02-mobile-client/mobile-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Copy environment template
   cp env-template.txt .env
   
   # Edit .env file with your configuration
   # Required: MONGO_URI, JWT_SECRET, EMAIL_USER, EMAIL_PASS
   ```

4. **Start the server**
   ```bash
   npm start
   ```

   Server will run on `http://localhost:5000`

## 📋 Available Scripts

### Flutter Commands
```bash
flutter pub get        # Install dependencies
flutter run            # Run on connected device
flutter build apk      # Build Android APK
flutter build ios      # Build iOS app
flutter build web      # Build web app
flutter clean          # Clean build files
flutter doctor         # Check Flutter installation
```

### Backend Scripts
```bash
npm start              # Start production server
npm run migrate        # Run database migrations
npm run run-migration  # Run specific migration
```

## 🔧 Environment Configuration

### Mobile Frontend (.env)
```env
# API Configuration
API_BASE_URL=http://localhost:5000/api
SOCKET_URL=http://localhost:5000

# App Configuration
APP_NAME=Nomu Cafe
APP_VERSION=1.0.0
DEBUG_MODE=true
```

### Mobile Backend (.env)
```env
# Database
MONGO_URI=mongodb://localhost:27017/nomu_cafe_mobile

# Authentication
JWT_SECRET=your_32_character_secret_key

# Email Configuration
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password

# Server
PORT=5000
NODE_ENV=development
```

## 📱 Features

### Customer Features
- **User Registration & Login** - Secure authentication with OTP
- **Menu Browsing** - Browse categories and items with images
- **Order Placement** - Add items to cart and place orders
- **Order Tracking** - Real-time order status updates
- **Loyalty Points** - Earn and redeem points
- **QR Code Scanning** - Scan QR codes for promotions
- **Location Services** - Find nearby cafe locations
- **Feedback System** - Rate and review orders
- **Profile Management** - Update personal information
- **Promotional Offers** - View and claim promotions

### Technical Features
- **Offline Support** - Basic functionality without internet
- **Real-time Updates** - Socket.io integration
- **Image Upload** - Profile pictures and feedback photos
- **Push Notifications** - Order updates and promotions
- **Responsive Design** - Works on various screen sizes
- **Dark/Light Theme** - User preference support

## 🗂️ Project Structure

```
mobile-frontend/lib/
├── main.dart                 # App entry point
├── models/                   # Data models
├── providers/                # State management
├── screens/                  # UI screens
├── widgets/                  # Reusable widgets
├── services/                 # API services
├── utils/                    # Utility functions
└── assets/                   # Images, fonts, videos
```

## 🔐 Security Features

- JWT token authentication
- Secure API communication
- Input validation and sanitization
- Secure local storage
- Biometric authentication (optional)
- SSL/TLS encryption

## 📊 API Integration

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-otp` - OTP verification
- `POST /api/auth/refresh` - Token refresh

### Menu Endpoints
- `GET /api/menu` - Get menu items
- `GET /api/menu/categories` - Get categories
- `GET /api/menu/promos` - Get promotions

### Order Endpoints
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get specific order
- `PUT /api/orders/:id/cancel` - Cancel order

### Loyalty Endpoints
- `GET /api/rewards` - Get available rewards
- `POST /api/rewards/claim` - Claim reward
- `GET /api/rewards/history` - Get reward history

## 🚨 Troubleshooting

### Common Issues

1. **Flutter Doctor Issues**
   ```bash
   flutter doctor
   # Follow the recommendations to fix issues
   ```

2. **Build Errors**
   ```bash
   flutter clean
   flutter pub get
   flutter run
   ```

3. **API Connection Issues**
   - Check API_BASE_URL in .env
   - Verify backend server is running
   - Check network connectivity

4. **Permission Issues**
   - Camera permission for QR scanning
   - Location permission for maps
   - Storage permission for image uploads

5. **Platform-specific Issues**
   - Android: Check minSdkVersion in build.gradle
   - iOS: Check deployment target
   - Web: Check browser compatibility

## 📱 Platform Support

- **Android** - API level 21+ (Android 5.0+)
- **iOS** - iOS 11.0+
- **Web** - Modern browsers (Chrome, Firefox, Safari, Edge)

## 🧪 Testing

```bash
# Run unit tests
flutter test

# Run integration tests
flutter drive --target=test_driver/app.dart

# Run widget tests
flutter test test/widget_test.dart
```

## 📦 Building for Production

### Android APK
```bash
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

### iOS App
```bash
flutter build ios --release
# Requires Xcode for final build
```

### Web App
```bash
flutter build web --release
# Output: build/web/
```

## 📚 Documentation

- [Flutter Documentation](https://flutter.dev/docs)
- [Dart Documentation](https://dart.dev/guides)
- [Provider Package](https://pub.dev/packages/provider)
- [API Documentation](../01-web-application/backend/docs/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on multiple platforms
5. Submit a pull request

## 📄 License

This project is proprietary software for Nomu Cafe.