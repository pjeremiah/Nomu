# 🌐 Web Application

Complete web-based cafe management system with React frontend and Node.js backend.

## 📁 Structure

```
01-web-application/
├── backend/          # Node.js/Express API server
├── frontend/         # React.js web application
└── README.md         # This file
```

## 🚀 Quick Start

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env  # Configure environment variables
npm start
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js, MongoDB, JWT
- **Frontend**: React.js, Tailwind CSS, JavaScript
- **Authentication**: JWT with OTP verification
- **File Storage**: GridFS for image management
- **Security**: Rate limiting, CORS, input validation

## 📋 Features

### Customer Portal
- User registration and authentication
- Menu browsing with categories
- Order placement and tracking
- Loyalty points system
- Feedback submission
- Promotional offers

### Admin Dashboard
- Inventory management
- Menu management
- Order processing
- Customer analytics
- Staff management
- Promotional campaigns

## 🔧 API Endpoints

See [Backend Documentation](./backend/README.md) for complete API reference.

## 🔐 Security

- JWT-based authentication
- OTP verification for sensitive operations
- Rate limiting and CORS protection
- Input validation and sanitization
- Secure file upload handling

## 📊 Analytics

- Customer demographics
- Sales trends and best sellers
- Inventory tracking
- Performance metrics

## 🚀 Deployment

### Production Setup
1. Configure environment variables
2. Set up MongoDB Atlas
3. Configure email service
4. Deploy backend to cloud service
5. Build and deploy frontend

See individual README files in backend/ and frontend/ folders for detailed setup instructions.
