# 👨‍💼 Mobile Barista App

Flutter mobile application for Nomu Cafe baristas and administrators.

## 📋 Features

### Barista Features
- Order processing and management
- Inventory tracking and updates
- Customer service tools
- Real-time notifications
- Order status updates
- Quick menu access

### Admin Features
- Staff management
- Analytics dashboard
- Inventory management
- Promotional campaigns
- Customer feedback review
- Performance metrics

### User Interface
- Clean, professional design
- Real-time order updates
- Quick action buttons
- Status indicators
- Notification system

## 🛠️ Technology Stack

- **Framework**: Flutter
- **Language**: Dart
- **State Management**: Provider/Riverpod
- **Backend Integration**: RESTful API
- **Authentication**: JWT with role-based access
- **Real-time**: WebSocket connections

## 🚀 Setup Instructions

### Prerequisites
- Flutter SDK (latest stable version)
- Android Studio / VS Code with Flutter extension
- Android device or emulator

### Installation
```bash
# Clone the repository
git clone [repository-url]
cd 03-mobile-barista

# Install dependencies
flutter pub get

# Run the app
flutter run
```

### Configuration
1. Update API endpoints in `lib/config/api_config.dart`
2. Configure role-based access
3. Set up push notifications
4. Configure real-time updates

## 📱 App Screens

### Authentication
- Staff login
- OTP verification
- Role selection

### Barista Dashboard
- Active orders
- Order processing
- Inventory status
- Quick actions

### Admin Dashboard
- Staff management
- Analytics overview
- Inventory management
- Customer feedback
- Promotional campaigns

### Order Management
- Order queue
- Order details
- Status updates
- Customer information

## 🔐 Security Features

- Role-based authentication
- JWT token management
- Secure API communication
- Biometric authentication
- Session management

## 📊 Analytics Integration

- Real-time order tracking
- Performance metrics
- Staff productivity
- Inventory analytics
- Customer insights

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

## 🔧 API Integration

The app integrates with the web application's backend API:
- Authentication and authorization
- Order management
- Inventory tracking
- Staff management
- Analytics and reporting

## 📝 Development Notes

- Implement proper role-based access control
- Use real-time updates for order status
- Optimize for quick order processing
- Add comprehensive error handling
- Implement offline capability for critical functions

## 🎯 Key Features

### Order Processing
- Real-time order notifications
- Quick order status updates
- Customer communication
- Order history tracking

### Inventory Management
- Stock level monitoring
- Quick inventory updates
- Low stock alerts
- Product availability

### Analytics
- Daily sales reports
- Popular items tracking
- Staff performance metrics
- Customer insights
