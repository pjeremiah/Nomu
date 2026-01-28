# 🌐 Nomu Cafe Web Application

Complete web-based cafe management system with React frontend and Node.js backend.

## 📁 Structure

```
01-web-application/
├── backend/          # Node.js/Express API server
├── frontend/         # React.js web application
└── README.md         # This file
```

## 🛠️ Technology Stack

### Backend
- **Node.js** (v16.0+)
- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **JWT** - Authentication
- **Multer** - File uploads
- **GridFS** - Image storage
- **Socket.io** - Real-time communication
- **Nodemailer** - Email services

### Frontend
- **React.js** (v19.1.0)
- **React Router** - Navigation
- **Redux Toolkit** - State management
- **Material-UI** - UI components
- **Bootstrap** - Styling
- **Axios** - HTTP client
- **Recharts** - Data visualization

## 🚀 Quick Start

### Prerequisites
- Node.js (v16.0 or higher)
- MongoDB (v4.4 or higher)
- Git

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd 01-web-application/backend
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
   # Required variables:
   # - MONGO_URI: MongoDB connection string
   # - JWT_SECRET: 32+ character secret key
   # - EMAIL_USER: Gmail address for OTP
   # - EMAIL_PASS: Gmail app password
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

   Server will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd 01-web-application/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

   Application will run on `http://localhost:3000`

## 📋 Available Scripts

### Backend Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm run mobile     # Start mobile-specific server
npm run mobile-dev # Start mobile server in development mode
```

### Frontend Scripts
```bash
npm start          # Start development server
npm run build      # Build for production
npm run build:dev  # Build for development
npm test           # Run tests
npm run eject      # Eject from Create React App
```

## 🔧 Environment Variables

### Backend (.env)
```env
# Database
MONGO_URI=mongodb://localhost:27017/nomu_cafe_web

# Authentication
JWT_SECRET=your_32_character_secret_key
BCRYPT_ROUNDS=12

# Server
PORT=5000
NODE_ENV=development

# Email Configuration
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password

# Security
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=5242880
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Super Admin (auto-created)
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=your_secure_password
SUPER_ADMIN_USERNAME=superadmin
SUPER_ADMIN_FULLNAME=Super Admin
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-otp` - OTP verification
- `POST /api/auth/forgot-password` - Password reset

### Menu Management
- `GET /api/menu` - Get all menu items
- `POST /api/menu` - Create menu item
- `PUT /api/menu/:id` - Update menu item
- `DELETE /api/menu/:id` - Delete menu item

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order status
- `GET /api/orders/:id` - Get specific order

### Analytics
- `GET /api/analytics/sales` - Sales analytics
- `GET /api/analytics/customers` - Customer analytics
- `GET /api/analytics/best-sellers` - Best selling items

## 🔐 Security Features

- JWT-based authentication
- OTP verification for sensitive operations
- Rate limiting and CORS protection
- Input validation and sanitization
- Secure file upload handling
- Password hashing with bcrypt
- Helmet.js for security headers

## 📱 Mobile Integration

The web backend also serves mobile applications:
- Mobile client app (port 5000)
- Mobile barista app (port 5000)
- Real-time notifications via Socket.io
- QR code generation and verification

## 🗄️ Database Schema

### Collections
- `users` - Customer accounts
- `admins` - Admin accounts
- `menuitems` - Menu items
- `orders` - Order records
- `inventory` - Inventory tracking
- `promos` - Promotional campaigns
- `rewards` - Loyalty rewards
- `feedback` - Customer feedback

## 🚨 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check MONGO_URI in .env file
   - Verify database permissions

2. **Port Already in Use**
   - Change PORT in .env file
   - Kill existing processes using the port

3. **Email Not Sending**
   - Verify Gmail app password
   - Check EMAIL_USER and EMAIL_PASS
   - Enable 2-factor authentication

4. **File Upload Issues**
   - Check MAX_FILE_SIZE setting
   - Verify uploads directory permissions
   - Ensure GridFS is properly configured

## 📚 Documentation

- [API Documentation](../backend/docs/api-endpoints.md)
- [Authentication Guide](../backend/docs/authentication.md)
- [Security Configuration](../backend/docs/security.md)
- [File Storage Setup](../backend/docs/file-storage.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is proprietary software for Nomu Cafe.