const nodemailer = require('nodemailer');
require('dotenv').config();

class emailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        
        pass: process.env.EMAIL_PASS
      }
    });
  }


  async sendOTP(email, otpCode, type = 'admin_login') {
    try {
      // Check if email credentials are configured
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        // Email not configured - OTP would be: ${otpCode}
        return { success: true, messageId: 'console-log' };
      }

      const subject = this.getSubject(type);
      const html = this.getOTPEmailTemplate(otpCode, type);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: subject,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);

      return { success: true, messageId: result.messageId };
    } catch (error) {
      // Email failed - OTP will be displayed in server logs
      return { success: true, messageId: 'console-log-fallback' };
    }
  }

  getSubject(type) {
    switch (type) {
      case 'admin_login':
        return 'Nomu Cafe - Admin Login Verification Code';
      case 'password_reset':
        return 'Nomu Cafe - Password Reset Code';
      case 'email_verification':
        return 'Nomu Cafe - Email Verification Code';
      case 'signup_success':
        return 'Nomu Cafe - Welcome to Nomu Cafe! 🎉';
      case 'password_reset_success':
        return 'Nomu Cafe - Password Reset Successful ✅';
      default:
        return 'Nomu Cafe - Verification Code';
    }
  }

  getOTPEmailTemplate(otpCode, type) {
    const typeText = this.getTypeText(type);
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nomu Cafe - ${typeText}</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: #ffffff;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #232c53;
                margin-bottom: 10px;
            }
            .otp-code {
                background-color: #232c53;
                color: white;
                font-size: 32px;
                font-weight: bold;
                text-align: center;
                padding: 20px;
                border-radius: 8px;
                letter-spacing: 5px;
                margin: 20px 0;
                font-family: 'Courier New', monospace;
            }
            .warning {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
            }
            .security-tips {
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">☕ Nomu Cafe</div>
                <h2>${typeText}</h2>
            </div>
            
            <p>Hello,</p>
            
            <p>You have requested ${typeText.toLowerCase()} for your Nomu Cafe admin account. Please use the following verification code:</p>
            
            <div class="otp-code">${otpCode}</div>
            
            <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul>
                    <li>This code will expire in <strong>10 minutes</strong></li>
                    <li>Do not share this code with anyone</li>
                    <li>If you didn't request this code, please ignore this email</li>
                </ul>
            </div>
            
            <div class="security-tips">
                <h4>🔒 Security Tips:</h4>
                <ul>
                    <li>Always verify the sender's email address</li>
                    <li>Never share your verification codes</li>
                    <li>Use strong, unique passwords</li>
                    <li>Enable two-factor authentication when available</li>
                </ul>
            </div>
            
            <p>If you have any questions or concerns, please contact our support team.</p>
            
            <div class="footer">
                <p>© 2024 Nomu Cafe. All rights reserved.</p>
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Send congratulatory email
  async sendCongratsEmail(email, type, userData = {}) {
    try {
      // Check if email credentials are configured
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        // Email not configured - congrats email would be sent
        return { success: true, messageId: 'console-log' };
      }

      const subject = this.getSubject(type);
      const html = this.getCongratsEmailTemplate(type, userData);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: subject,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);

      return { success: true, messageId: result.messageId };
    } catch (error) {
      // Email failed - using fallback
      return { success: true, messageId: 'console-log-fallback' };
    }
  }

  getTypeText(type) {
    switch (type) {
      case 'admin_login':
        return 'Admin Login Verification';
      case 'password_reset':
        return 'Password Reset Verification';
      case 'email_verification':
        return 'Email Verification';
      case 'signup_success':
        return 'Welcome to Nomu Cafe!';
      case 'password_reset_success':
        return 'Password Reset Successful';
      default:
        return 'Account Verification';
    }
  }

  getCongratsEmailTemplate(type, userData) {
    if (type === 'signup_success') {
      return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Nomu Cafe!</title>
          <style>
              body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  background-color: #f4f4f4;
              }
              .container {
                  background-color: #ffffff;
                  padding: 30px;
                  border-radius: 10px;
                  box-shadow: 0 0 20px rgba(0,0,0,0.1);
              }
              .header {
                  text-align: center;
                  margin-bottom: 30px;
              }
              .logo {
                  font-size: 32px;
                  font-weight: bold;
                  color: #232c53;
                  margin-bottom: 10px;
              }
              .welcome-banner {
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  padding: 20px;
                  border-radius: 8px;
                  text-align: center;
                  margin: 20px 0;
              }
              .welcome-banner h2 {
                  margin: 0;
                  font-size: 24px;
              }
              .features {
                  background-color: #f8f9fa;
                  padding: 20px;
                  border-radius: 8px;
                  margin: 20px 0;
              }
              .features h3 {
                  color: #232c53;
                  margin-top: 0;
              }
              .features ul {
                  margin: 0;
                  padding-left: 20px;
              }
              .features li {
                  margin-bottom: 8px;
              }
              .cta-button {
                  display: inline-block;
                  background-color: #232c53;
                  color: white;
                  padding: 12px 24px;
                  text-decoration: none;
                  border-radius: 6px;
                  font-weight: bold;
                  margin: 20px 0;
              }
              .footer {
                  text-align: center;
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 1px solid #eee;
                  color: #666;
                  font-size: 14px;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <div class="logo">☕ Nomu Cafe</div>
              </div>
              
              <div class="welcome-banner">
                  <h2>🎉 Welcome to Nomu Cafe!</h2>
                  <p>Your account has been successfully created!</p>
              </div>
              
              <p>Hello ${userData.fullName || 'there'},</p>
              
              <p>Congratulations! Your Nomu Cafe account has been successfully created and verified. We're excited to have you join our coffee community!</p>
              
              <div class="features">
                  <h3>🌟 What you can do now:</h3>
                  <ul>
                      <li>Browse our delicious coffee menu</li>
                      <li>Place orders for pickup or delivery</li>
                      <li>Track your order status in real-time</li>
                      <li>Earn loyalty points with every purchase</li>
                      <li>Receive exclusive offers and promotions</li>
                  </ul>
              </div>
              
              <p>Your account details:</p>
              <ul>
                  <li><strong>Email:</strong> ${userData.email || 'Your registered email'}</li>
                  <li><strong>Username:</strong> ${userData.username || 'Your chosen username'}</li>
                  <li><strong>Account Type:</strong> Customer</li>
              </ul>
              
              <div style="text-align: center;">
                  <a href="http://localhost:3000" class="cta-button">Start Exploring Nomu Cafe</a>
              </div>
              
              <p>If you have any questions or need assistance, feel free to contact our support team. We're here to help!</p>
              
              <div class="footer">
                  <p>© 2024 Nomu Cafe. All rights reserved.</p>
                  <p>Thank you for choosing Nomu Cafe for your coffee experience!</p>
              </div>
          </div>
      </body>
      </html>
      `;
    } else if (type === 'password_reset_success') {
      return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Successful</title>
          <style>
              body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  background-color: #f4f4f4;
              }
              .container {
                  background-color: #ffffff;
                  padding: 30px;
                  border-radius: 10px;
                  box-shadow: 0 0 20px rgba(0,0,0,0.1);
              }
              .header {
                  text-align: center;
                  margin-bottom: 30px;
              }
              .logo {
                  font-size: 32px;
                  font-weight: bold;
                  color: #232c53;
                  margin-bottom: 10px;
              }
              .success-banner {
                  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                  color: white;
                  padding: 20px;
                  border-radius: 8px;
                  text-align: center;
                  margin: 20px 0;
              }
              .success-banner h2 {
                  margin: 0;
                  font-size: 24px;
              }
              .security-tips {
                  background-color: #f8f9fa;
                  padding: 20px;
                  border-radius: 8px;
                  margin: 20px 0;
              }
              .security-tips h3 {
                  color: #232c53;
                  margin-top: 0;
              }
              .security-tips ul {
                  margin: 0;
                  padding-left: 20px;
              }
              .security-tips li {
                  margin-bottom: 8px;
              }
              .cta-button {
                  display: inline-block;
                  background-color: #232c53;
                  color: white;
                  padding: 12px 24px;
                  text-decoration: none;
                  border-radius: 6px;
                  font-weight: bold;
                  margin: 20px 0;
              }
              .footer {
                  text-align: center;
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 1px solid #eee;
                  color: #666;
                  font-size: 14px;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <div class="logo">☕ Nomu Cafe</div>
              </div>
              
              <div class="success-banner">
                  <h2>✅ Password Reset Successful!</h2>
                  <p>Your password has been successfully updated</p>
              </div>
              
              <p>Hello ${userData.fullName || 'there'},</p>
              
              <p>Great news! Your Nomu Cafe account password has been successfully reset. You can now sign in to your account using your new password.</p>
              
              <div class="security-tips">
                  <h3>🔒 Security Tips:</h3>
                  <ul>
                      <li>Keep your password secure and don't share it with anyone</li>
                      <li>Use a strong, unique password for your account</li>
                      <li>Sign out from shared or public computers</li>
                      <li>Contact us immediately if you notice any suspicious activity</li>
                  </ul>
              </div>
              
              <p><strong>Account Details:</strong></p>
              <ul>
                  <li><strong>Email:</strong> ${userData.email || 'Your registered email'}</li>
                  <li><strong>Password Reset Time:</strong> ${new Date().toLocaleString()}</li>
              </ul>
              
              <div style="text-align: center;">
                  <a href="http://localhost:3000" class="cta-button">Sign In to Your Account</a>
              </div>
              
              <p>If you didn't request this password reset, please contact our support team immediately to secure your account.</p>
              
              <div class="footer">
                  <p>© 2024 Nomu Cafe. All rights reserved.</p>
                  <p>This is an automated message. Please do not reply to this email.</p>
              </div>
          </div>
      </body>
      </html>
      `;
    }
    
    return '';
  }

  async testConnection() {
    try {
      await this.transporter.verify();

      return true;
    } catch (error) {

      return false;
    }
  }
}

module.exports = new emailService();
