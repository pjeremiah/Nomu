# 📱 Mobile Client App

Flutter mobile application for Nomu Cafe customers.

## 📋 Features

### Customer Features
- User registration and authentication
- Menu browsing with categories
- Order placement and tracking
- Loyalty points system
- Feedback and reviews
- Promotional offers
- Order history
- Profile management

### User Interface
- Modern, intuitive design
- Category-based menu navigation
- Real-time order updates
- Push notifications
- Offline capability for menu browsing

## 🛠️ Technology Stack

- **Framework**: Flutter
- **Language**: Dart
- **State Management**: Provider/Riverpod
- **Backend Integration**: RESTful API
- **Authentication**: JWT with OTP
- **Local Storage**: SQLite/Hive

## 🚀 Setup Instructions

### Prerequisites
- Flutter SDK (latest stable version)
- Android Studio / VS Code with Flutter extension
- Android device or emulator

### Installation
```bash
# Clone the repository
git clone [repository-url]
cd 02-mobile-client

# Install dependencies
flutter pub get

# Run the app
flutter run
```

### Configuration
1. Update API endpoints in `lib/config/api_config.dart`
2. Configure Firebase (if using push notifications)
3. Set up app icons and splash screens

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
