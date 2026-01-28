# 👨‍💼 Nomu Cafe Mobile Barista

Flutter mobile application for baristas and staff with order management, inventory tracking, and QR code scanning.

## 📁 Structure

```
03-mobile-barista/
├── mobile-barista-frontend/  # Flutter barista app
├── mobile-barista-backend/   # Optional Node.js backend
└── README.md                # This file
```

## 🛠️ Technology Stack

### Mobile Frontend
- **Flutter** (v3.9.0+)
- **Dart** - Programming language
- **Provider** - State management
- **HTTP** - API communication
- **Mobile Scanner** - QR code scanning
- **Socket.io** - Real-time updates
- **Shared Preferences** - Local storage

### Mobile Backend (Optional)
- **Node.js** (v16.0+)
- **Express.js** - Web framework
- **MongoDB** - Database
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **Nodemailer** - Email services

## 🚀 Quick Start

### Prerequisites
- Flutter SDK (v3.9.0 or higher)
- Dart SDK (included with Flutter)
- Android Studio / VS Code with Flutter extensions
- Android device/emulator or iOS device/simulator
- Camera access for QR scanning

### Mobile Frontend Setup

1. **Navigate to mobile barista frontend directory**
   ```bash
   cd 03-mobile-barista/mobile-barista-frontend
   ```

2. **Get Flutter dependencies**
   ```bash
   flutter pub get
   ```

3. **Configure environment**
   ```bash
   # Create .env file
   touch .env
   
   # Add your configuration
   echo "API_BASE_URL=http://localhost:5000/api" >> .env
   echo "SOCKET_URL=http://localhost:5000" >> .env
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

1. **Navigate to mobile barista backend directory**
   ```bash
   cd 03-mobile-barista/mobile-barista-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Create .env file
   touch .env
   
   # Add your configuration
   echo "MONGO_URI=mongodb://localhost:27017/nomu_cafe_barista" >> .env
   echo "JWT_SECRET=your_32_character_secret_key" >> .env
   echo "PORT=5000" >> .env
   echo "NODE_ENV=development" >> .env
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
npm run dev            # Start development server
```

## 🔧 Environment Configuration

### Mobile Frontend (.env)
```env
# API Configuration
API_BASE_URL=http://localhost:5000/api
SOCKET_URL=http://localhost:5000

# App Configuration
APP_NAME=Nomu Barista
APP_VERSION=1.0.0
DEBUG_MODE=true
```

### Mobile Backend (.env)
```env
# Database
MONGO_URI=mongodb://localhost:27017/nomu_cafe_barista

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

### Barista Features
- **Order Management** - View and process incoming orders
- **QR Code Scanning** - Scan customer QR codes for verification
- **Inventory Tracking** - Update stock levels and track movements
- **Order Status Updates** - Mark orders as prepared, ready, or completed
- **Real-time Notifications** - Receive instant order updates
- **Customer Service** - Handle customer inquiries and issues
- **Analytics Dashboard** - View sales and performance metrics
- **Staff Management** - Manage barista accounts and permissions

### Technical Features
- **Real-time Updates** - Socket.io integration for live data
- **Offline Support** - Basic functionality without internet
- **Camera Integration** - QR code scanning capabilities
- **Push Notifications** - Order alerts and updates
- **Responsive Design** - Works on tablets and phones
- **Secure Authentication** - JWT-based staff authentication

## 🗂️ Project Structure

```
mobile-barista-frontend/lib/
├── main.dart                 # App entry point
├── models/                   # Data models
├── providers/                # State management
├── screens/                  # UI screens
│   ├── login/               # Authentication screens
│   ├── orders/              # Order management screens
│   ├── inventory/           # Inventory screens
│   ├── scanner/             # QR scanner screens
│   └── analytics/           # Analytics screens
├── widgets/                  # Reusable widgets
├── services/                 # API services
├── utils/                    # Utility functions
└── assets/                   # Images, fonts, icons
```

## 🔐 Security Features

- JWT token authentication for staff
- Role-based access control
- Secure API communication
- Input validation and sanitization
- Secure local storage
- Session management

## 📊 API Integration

### Authentication Endpoints
- `POST /api/auth/barista-login` - Barista login
- `POST /api/auth/verify-token` - Token verification
- `POST /api/auth/refresh` - Token refresh

### Order Management Endpoints
- `GET /api/orders/pending` - Get pending orders
- `GET /api/orders/active` - Get active orders
- `PUT /api/orders/:id/status` - Update order status
- `GET /api/orders/:id` - Get specific order details

### Inventory Endpoints
- `GET /api/inventory` - Get inventory items
- `PUT /api/inventory/:id/stock` - Update stock levels
- `POST /api/inventory/movement` - Record stock movement
- `GET /api/inventory/low-stock` - Get low stock items

### Scanner Endpoints
- `POST /api/scanner/verify-qr` - Verify QR code
- `GET /api/scanner/order/:qr` - Get order by QR code
- `POST /api/scanner/complete` - Mark order as completed

## 🚨 Troubleshooting

### Common Issues

1. **AndroidX Build Error**
   ```bash
   # Error: Configuration contains AndroidX dependencies, but android.useAndroidX property is not enabled
   # Solution: Create android/gradle.properties file with:
   echo "android.useAndroidX=true" > android/gradle.properties
   echo "android.enableJetifier=true" >> android/gradle.properties
   echo "org.gradle.jvmargs=-Xmx1536M" >> android/gradle.properties
   
   # Then clean and rebuild:
   flutter clean
   flutter pub get
   flutter run
   ```

2. **Camera Permission Issues**
   - Android: Check camera permission in app settings
   - iOS: Check camera permission in Settings > Privacy
   - Ensure camera is not being used by another app

3. **QR Scanner Not Working**
   - Check camera permissions
   - Ensure good lighting conditions
   - Verify QR code is valid and not damaged
   - Test with different QR code formats

4. **API Connection Issues**
   - Check API_BASE_URL in .env
   - Verify backend server is running
   - Check network connectivity
   - Verify JWT token is valid

5. **Build Errors**
   ```bash
   flutter clean
   flutter pub get
   flutter run
   ```

6. **Platform-specific Issues**
   - Android: Check minSdkVersion and camera permissions
   - iOS: Check camera usage description in Info.plist
   - Web: Camera access requires HTTPS in production

## 📱 Platform Support

- **Android** - API level 21+ (Android 5.0+)
- **iOS** - iOS 11.0+
- **Web** - Modern browsers with camera support

## 🧪 Testing

```bash
# Run unit tests
flutter test

# Run integration tests
flutter drive --target=test_driver/app.dart

# Run specific test files
flutter test test/scanner_test.dart
flutter test test/order_management_test.dart
```

## 📦 Building for Production

### Android APK
```bash
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

### Android App Bundle (Recommended)
```bash
flutter build appbundle --release
# Output: build/app/outputs/bundle/release/app-release.aab
```

### iOS App
```bash
flutter build ios --release
# Requires Xcode for final build and App Store submission
```

### Web App
```bash
flutter build web --release
# Output: build/web/
```

## 🔧 Configuration

### QR Code Scanner Settings
```dart
// Configure scanner settings
const scannerConfig = {
  'enableTorch': true,
  'enableVibration': true,
  'enableSound': true,
  'scanTimeout': 30000, // 30 seconds
};
```

### Order Status Configuration
```dart
// Order status flow
const orderStatuses = [
  'pending',      // Order received
  'confirmed',    // Order confirmed
  'preparing',    // Being prepared
  'ready',        // Ready for pickup
  'completed',    // Order completed
  'cancelled'     // Order cancelled
];
```

## 📊 Analytics & Reporting

### Available Metrics
- Orders processed per hour/day
- Average order preparation time
- Inventory turnover rates
- Staff performance metrics
- Customer satisfaction scores
- Revenue tracking

### Real-time Dashboard
- Live order queue
- Current inventory levels
- Staff activity status
- System health monitoring

## 📚 Documentation

- [Flutter Documentation](https://flutter.dev/docs)
- [Mobile Scanner Package](https://pub.dev/packages/mobile_scanner)
- [Socket.io Client](https://pub.dev/packages/socket_io_client)
- [API Documentation](../01-web-application/backend/docs/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on multiple platforms
5. Test QR scanning functionality
6. Submit a pull request

## 📄 License

This project is proprietary software for Nomu Cafe.