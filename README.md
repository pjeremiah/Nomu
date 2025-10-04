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

## 🚀 Quick Start

### Web Application
```bash
# Backend
cd 01-web-application/backend
npm install
npm start

# Frontend
cd 01-web-application/frontend
npm install
npm start
```

### Mobile Applications
```bash
# Client App
cd 02-mobile-client
flutter pub get
flutter run

# Barista App
cd 03-mobile-barista
flutter pub get
flutter run
```

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

**Developed by**: Jeremiah Pagarigan  
**Institution**: [Your University]  
**Course**: Capstone Project  
**Year**: 2024-2025
