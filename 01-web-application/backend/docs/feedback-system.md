# 🎯 Customer Feedback Management System

A comprehensive feedback system for Nomu Café that allows customers to submit feedback and administrators to respond with automated email notifications.

## ✨ Features

### Client Side
- **Simple Feedback Form**: Name, email, and message fields
- **No Authentication Required**: Anyone can submit feedback
- **Instant Confirmation**: Success message after submission
- **Email Validation**: Ensures valid email format

### Admin Side
- **Feedback Dashboard**: View all customer feedback
- **Status Tracking**: Pending vs. Replied status
- **Reply System**: Respond to customer feedback
- **Statistics**: Total, pending, and replied feedback counts
- **Email Integration**: Automatic email notifications to customers

### Server Side
- **MongoDB Storage**: Persistent feedback storage
- **Email Service**: Nodemailer integration with Gmail
- **RESTful API**: Clean API endpoints
- **Authentication**: Protected admin routes

## 🚀 Quick Start

### 1. Environment Setup

Add these variables to your `server/.env` file:

```env
# Email Configuration
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_password
```

**Important**: Use a Gmail App Password, not your regular password. Enable 2-Step Verification and generate an App Password in your Google Account settings.

### 2. Install Dependencies

```bash
# Server dependencies
cd server
npm install nodemailer

# Client dependencies (already installed)
cd ../website
npm install
```

### 3. Start the System

```bash
# Start server
cd server
npm start

# Start client (in new terminal)
cd website
npm start
```

## 📁 File Structure

```
server/
├── models/
│   └── Feedback.js          # Feedback data model
├── routes/
│   └── feedback.js          # Feedback API endpoints
└── index.js                 # Main server file

website/src/
├── admin/
│   └── CustomerFeedback.jsx # Admin feedback dashboard
├── client/
│   └── ContactUs.jsx        # Client feedback form
└── index.css                # Feedback system styles
```

## 🔌 API Endpoints

### POST `/api/feedback`
Submit new customer feedback
- **Body**: `{ name, email, message }`
- **Response**: `{ message, feedback }`

### GET `/api/feedback`
Get all feedback (admin only)
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Array of feedback objects

### POST `/api/feedback/reply/:id`
Reply to feedback (admin only)
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ reply }`
- **Response**: `{ message, feedback }`

## 🎨 UI Components

### Client Feedback Form
- Clean, responsive design
- Form validation
- Success confirmation
- No authentication barriers

### Admin Dashboard
- Statistics cards with gradients
- Responsive table layout
- Status badges (Pending/Replied)
- Reply modal with customer details
- Mobile-friendly responsive design

## 📧 Email System

### Email Template
- Professional HTML formatting
- Customer name personalization
- Admin reply prominently displayed
- Nomu Café branding
- Submission date reference

### Email Configuration
- Gmail SMTP service
- Environment variable configuration
- App password authentication
- Error handling for failed emails

## 🔒 Security Features

- **Input Validation**: Email format and required field validation
- **Admin Authentication**: JWT token verification for admin routes
- **Role-Based Access**: Staff, Manager, and Owner access levels
- **SQL Injection Protection**: Mongoose ODM protection

## 📱 Responsive Design

- **Desktop**: Full table layout with all columns
- **Tablet**: Adjusted column widths and spacing
- **Mobile**: Stacked layout with data labels
- **Touch-Friendly**: Optimized for mobile interactions

## 🧪 Testing

### Test the System

1. **Submit Feedback**: Go to Contact Us page and submit feedback
2. **Admin View**: Login as admin and navigate to Customer Feedback
3. **Reply to Feedback**: Click reply button and send a response
4. **Email Verification**: Check customer email for automated response

### Sample Data

```javascript
// Example feedback submission
{
  name: "John Doe",
  email: "john@example.com",
  message: "Great coffee and atmosphere!",
  status: "pending",
  createdAt: "2024-01-15T10:30:00Z"
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Email Not Sending**
   - Verify Gmail App Password is correct
   - Check 2-Step Verification is enabled
   - Ensure EMAIL_USER and EMAIL_PASS are set

2. **Build Errors**
   - Run `npm install` in both server and website directories
   - Check for missing dependencies
   - Verify file paths and imports

3. **Database Connection**
   - Verify MongoDB Atlas connection string
   - Check network connectivity
   - Ensure database user has write permissions

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` in your `.env` file.

## 🔄 Future Enhancements

- **Feedback Categories**: Organize feedback by type
- **Response Templates**: Pre-written response templates
- **Analytics Dashboard**: Feedback trends and insights
- **Customer Portal**: Allow customers to view their feedback history
- **Integration**: Connect with CRM or help desk systems

## 📞 Support

For technical support or questions about the Customer Feedback System, please refer to the main project documentation or contact the development team.

---

**Built with ❤️ for Nomu Café**
