# 🚀 Nomu Cafe - Capstone Project

A comprehensive cafe management system featuring web application, mobile apps, and admin dashboard.

## 📁 Project Structure

This repository contains the complete Nomu Cafe management system organized into distinct modules:

### 🌐 [01-web-application](./01-web-application/)
Complete web-based cafe management system
- **Backend**: Node.js/Express API server with MongoDB
- **Frontend**: React.js web application for customers and admins

### 📱 [02-mobile-client](./02-mobile-client/)
Flutter mobile application for customers
- **Mobile Frontend**: Flutter app for customer ordering and loyalty
- **Mobile Backend**: Optional Node.js backend for mobile-specific features
- Customer ordering and loyalty system
- Menu browsing and promotions
- Account management and feedback

### 👨‍💼 [03-mobile-barista](./03-mobile-barista/)
Flutter mobile application for baristas and admins
- **Mobile Frontend**: Flutter app for barista operations
- **Mobile Backend**: Optional Node.js backend for mobile-specific features
- Order management and processing
- Inventory tracking and QR code scanning
- Analytics and reporting

### 📚 [04-documentation](./04-documentation/)
Complete project documentation
- API documentation
- Setup guides
- User manuals
- Technical specifications

### 🗄️ [05-database](./05-database/)
Database schemas and migrations
- MongoDB collections
- Data models
- Migration scripts

## 🛠️ Technology Stack

### Web Application
- **Frontend**: React.js, Tailwind CSS, JavaScript
- **Backend**: Node.js, Express.js, MongoDB
- **Authentication**: JWT, OTP verification
- **File Storage**: GridFS for image management

### Mobile Applications
- **Framework**: Flutter
- **Language**: Dart
- **State Management**: Provider/Riverpod
- **Backend Integration**: RESTful API

## 📋 Prerequisites

Before running this project, ensure you have the following installed:

### Required Software
- **Node.js** (v16.0 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (v4.4 or higher) - [Download here](https://www.mongodb.com/try/download/community)
- **Flutter SDK** (v3.7.2 or higher) - [Download here](https://flutter.dev/docs/get-started/install)
- **Git** - [Download here](https://git-scm.com/)

### Optional but Recommended
- **MongoDB Compass** - GUI for MongoDB
- **VS Code** with Flutter and Dart extensions
- **Postman** - For API testing

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/NomuApplication.git
cd NomuApplication
```

### 2. Database Setup
```bash
# Start MongoDB service
# Windows: Start MongoDB service from Services
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod

# Verify MongoDB is running
mongosh --eval "db.runCommand({connectionStatus: 1})"
```

### 3. Web Application Setup

#### Backend Setup
```bash
cd 01-web-application/backend

# Install dependencies
npm install

# Create environment file
cp env-template.txt .env

# Edit .env file with your configuration
# Required: MONGO_URI, JWT_SECRET, EMAIL_USER, EMAIL_PASS

# Start the backend server
npm start
# Server will run on http://localhost:5000
```

#### Frontend Setup
```bash
cd 01-web-application/frontend

# Install dependencies
npm install

# Start the development server
npm start
# Application will run on http://localhost:3000
```

### 4. Mobile Client Setup
```bash
cd 02-mobile-client/mobile-frontend

# Get Flutter dependencies
flutter pub get

# Run on connected device or emulator
flutter run

# For specific platform:
# flutter run -d android
# flutter run -d ios
# flutter run -d web
```

### 5. Mobile Barista Setup
```bash
cd 03-mobile-barista/mobile-barista-frontend

# Get Flutter dependencies
flutter pub get

# Run on connected device or emulator
flutter run
```

### 6. Mobile Backend (Optional)
```bash
# For mobile client backend
cd 02-mobile-client/mobile-backend
npm install
cp env-template.txt .env
# Edit .env file
npm start

# For mobile barista backend
cd 03-mobile-barista/mobile-barista-backend
npm install
npm start
```

## ⚙️ Environment Configuration

### Web Backend (.env)
```env
MONGO_URI=mongodb://localhost:27017/nomu_cafe_web
JWT_SECRET=your_32_character_secret_key
PORT=5000
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
```

### Mobile Backend (.env)
```env
MONGO_URI=mongodb://localhost:27017/nomu_cafe_mobile
JWT_SECRET=your_32_character_secret_key
PORT=5000
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
```

## 🚀 Quick Start

### Start All Services
```bash
# Terminal 1 - Web Backend
cd 01-web-application/backend && npm start

# Terminal 2 - Web Frontend
cd 01-web-application/frontend && npm start

# Terminal 3 - Mobile Client
cd 02-mobile-client/mobile-frontend && flutter run

# Terminal 4 - Mobile Barista
cd 03-mobile-barista/mobile-barista-frontend && flutter run
```

### Access Points
- **Web Application**: http://localhost:3000
- **API Backend**: http://localhost:5000
- **Mobile Apps**: Run on connected devices/emulators

## 📋 Features

### Customer Features
- User registration and authentication
- Menu browsing with categories
- Order placement and tracking
- Loyalty points system
- Feedback and reviews
- Promotional offers

### Admin Features
- Inventory management
- Menu management
- Order processing
- Customer analytics
- Staff management
- Promotional campaigns

### Barista Features
- Order processing
- Inventory updates
- Customer service
- Real-time notifications

## 🔐 Security Features

- JWT-based authentication
- OTP verification for sensitive operations
- Rate limiting and CORS protection
- Input validation and sanitization
- Secure file upload handling
- Email address masking for privacy

## 📊 Analytics & Reporting

- Customer demographics analysis
- Sales trends and best sellers
- Inventory tracking
- Performance metrics
- Real-time dashboards

## 🤝 Contributing

This is a capstone project. For development guidelines, see the documentation in the `04-documentation` folder.

## 📄 License

This project is proprietary software for Nomu Cafe.

---

Developed by: DIATA Group
Institution: National University of Manila  
Course: Capstone Project  
Year: 2025-2026
