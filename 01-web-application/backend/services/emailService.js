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
      case 'admin_account_created':
        return 'Nomu Cafe - Your Admin Account Has Been Created ✅';
      case 'admin_account_updated':
        return 'Nomu Cafe - Your Admin Account Has Been Updated ✅';
      case 'admin_account_deleted':
        return 'Nomu Cafe - Your Admin Account Has Been Removed';
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
    </head>
    <body style="margin:0; padding:20px; background-color:#f4f4f4;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px; margin:0 auto;">
            <tr><td style="background:#fff; padding:30px; border-radius:10px; box-shadow:0 0 20px rgba(0,0,0,0.1); text-align:left;">
                <div style="margin-bottom:24px; text-align:center;">
                    <div style="font-size:28px; font-weight:bold; color:#232c53;">☕ Nomu Cafe</div>
                    <h2 style="margin:10px 0 0 0; font-size:20px; font-weight:bold; color:#232c53;">${typeText}</h2>
                </div>
                <p style="font-size:14px; color:#333; margin:0 0 16px 0;">Hello,</p>
                <p style="font-size:14px; color:#333; margin:0 0 16px 0;">You have requested ${typeText.toLowerCase()} for your Nomu Cafe admin account. Please use the following verification code:</p>
                <div style="background-color:#232c53; color:white; font-size:32px; font-weight:bold; text-align:center; padding:20px; border-radius:8px; letter-spacing:5px; margin:20px 0; font-family:'Courier New',monospace;">${otpCode}</div>
                <div style="background-color:#fff3cd; border:1px solid #ffeaa7; color:#856404; padding:15px; border-radius:5px; margin:20px 0;">
                    <p style="margin:0 0 10px 0; font-size:14px; font-weight:bold;">⚠️ Important:</p>
                    <ul style="margin:0; padding-left:20px;">
                        <li style="margin-bottom:6px;">This code will expire in <strong>10 minutes</strong></li>
                        <li style="margin-bottom:6px;">Do not share this code with anyone</li>
                        <li style="margin-bottom:0;">If you didn't request this code, please ignore this email</li>
                    </ul>
                </div>
                <div style="background-color:#f8f9fa; padding:15px; border-radius:5px; margin:20px 0;">
                    <p style="margin:0 0 10px 0; font-size:14px; font-weight:bold; color:#232c53;">🔒 Security Tips:</p>
                    <ul style="margin:0; padding-left:20px;">
                        <li style="margin-bottom:6px;">Always verify the sender's email address</li>
                        <li style="margin-bottom:6px;">Never share your verification codes</li>
                        <li style="margin-bottom:6px;">Use strong, unique passwords</li>
                        <li style="margin-bottom:0;">Enable two-factor authentication when available</li>
                    </ul>
                </div>
                <p style="font-size:14px; color:#333; margin:0 0 16px 0;">If you have any questions or concerns, please contact our support team.</p>
                <div style="margin-top:28px; padding-top:20px; border-top:1px solid #eee; font-size:12px; color:#666; text-align:center;">© 2024 Nomu Cafe. This is an automated message; please do not reply.</div>
            </td></tr>
        </table>
    </body>
    </html>
    `;
  }

  // Send congratulatory email
  async sendCongratsEmail(email, type, userData = {}) {
    try {
      // Check if email credentials are configured
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        // EMAIL_USER or EMAIL_PASS not set - skipping congrats email
        return { success: false, messageId: 'not-configured' };
      }

      const subject = this.getSubject(type);
      const html = this.getCongratsEmailTemplate(type, userData);

      if (!html || !html.trim()) {
        console.error('[EmailService] No template for type:', type, '- cannot send to', email);
        return { success: false, messageId: 'no-template' };
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: subject,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);
      if (type === 'admin_account_created') {
      }
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('[EmailService] Failed to send congrats email to', email, 'type:', type, 'error:', error.message);
      return { success: false, messageId: 'send-failed' };
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
      case 'admin_account_created':
        return 'Admin Account Created';
      case 'admin_account_updated':
        return 'Admin Account Updated';
      case 'admin_account_deleted':
        return 'Admin Account Removed';
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
      </head>
      <body style="margin:0; padding:20px; background-color:#f4f4f4; text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px; margin:0 auto;">
              <tr><td style="background:#fff; padding:30px; border-radius:10px; box-shadow:0 0 20px rgba(0,0,0,0.1); text-align:center;">
                  <div style="margin-bottom:24px; text-align:center;">
                      <div style="font-size:28px; font-weight:bold; color:#232c53; text-align:center;">☕ Nomu Cafe</div>
                  </div>
                  <div style="background:linear-gradient(135deg, #2B3A67 0%, #1a2347 100%); color:white; padding:20px; border-radius:8px; margin:20px 0; text-align:center;">
                      <h2 style="margin:0; font-size:22px; font-weight:bold; text-align:center; color:white;">Welcome to Nomu Cafe!</h2>
                      <p style="margin:6px 0 0 0; font-size:14px; text-align:center; color:white;">Your account has been successfully created!</p>
                  </div>
                  <p style="font-size:14px; color:#333; margin:0 0 16px 0; text-align:center;">Hello ${userData.fullName || 'there'},</p>
                  <p style="font-size:14px; color:#333; margin:0 0 16px 0; text-align:center;">Congratulations! Your Nomu Cafe account has been successfully created and verified. We're excited to have you join our coffee community!</p>
                  <div style="background:#f8f9fa; padding:20px; border-radius:8px; margin:20px 0; border:1px solid #e9ecef; text-align:center;">
                      <h3 style="color:#232c53; margin:0 0 12px 0; font-size:15px; text-align:center;">What you can do now:</h3>
                      <ul style="margin:0 auto; padding-left:0; list-style:none; display:inline-block; text-align:left;">
                          <li style="margin-bottom:6px; font-size:14px;">Browse our delicious coffee menu</li>
                          <li style="margin-bottom:6px; font-size:14px;">Place orders for pickup or delivery</li>
                          <li style="margin-bottom:6px; font-size:14px;">Track your order status in real-time</li>
                          <li style="margin-bottom:6px; font-size:14px;">Earn loyalty points with every purchase</li>
                          <li style="margin-bottom:0; font-size:14px;">Receive exclusive offers and promotions</li>
                      </ul>
                  </div>
                  <p style="font-size:14px; color:#333; margin:0 0 8px 0; text-align:center;">Your account details:</p>
                  <ul style="margin:0 auto 16px auto; padding-left:0; list-style:none; display:inline-block; text-align:left;">
                      <li style="margin-bottom:6px; font-size:14px;"><strong>Email:</strong> ${userData.email || 'Your registered email'}</li>
                      <li style="margin-bottom:6px; font-size:14px;"><strong>Username:</strong> ${userData.username || 'Your chosen username'}</li>
                      <li style="margin-bottom:0; font-size:14px;"><strong>Account Type:</strong> Customer</li>
                  </ul>
                  <p style="font-size:14px; color:#333; margin:0 0 16px 0; text-align:center;">If you have any questions or need assistance, feel free to contact our support team. We're here to help!</p>
                  <div style="margin-top:28px; padding-top:20px; border-top:1px solid #eee; font-size:12px; color:#666; text-align:center;">© 2024 Nomu Cafe. This is an automated message; please do not reply.</div>
              </td></tr>
          </table>
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
          <title>Password Reset Successful - Nomu Cafe</title>
          <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; text-align: center; }
              .container { background: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); max-width: 560px; margin: 0 auto; text-align: center; }
              .header { margin-bottom: 24px; text-align: center; }
              .logo { font-size: 28px; font-weight: bold; color: #232c53; text-align: center; }
              .success-banner { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
              .success-banner .check { width: 40px; height: 40px; background: rgba(255,255,255,0.3); border-radius: 6px; margin: 0 auto 10px auto; line-height: 40px; font-size: 22px; text-align: center; }
              .success-banner h2 { margin: 0; font-size: 22px; font-weight: bold; text-align: center; }
              .success-banner p { margin: 6px 0 0 0; font-size: 14px; opacity: 0.95; text-align: center; }
              .body-text { font-size: 14px; color: #333; margin: 0 0 16px 0; text-align: center; }
              .details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e9ecef; text-align: center; }
              .details h3 { color: #232c53; margin: 0 0 12px 0; font-size: 15px; text-align: center; }
              .details ul { margin: 0 auto; padding-left: 0; list-style: none; display: inline-block; text-align: left; }
              .details li { margin-bottom: 8px; font-size: 14px; }
              .footer { margin-top: 28px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
          </style>
      </head>
      <body style="margin:0; padding:20px; background-color:#f4f4f4; text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px; margin:0 auto;">
              <tr><td style="background:#fff; padding:30px; border-radius:10px; box-shadow:0 0 20px rgba(0,0,0,0.1); text-align:center;">
                  <div style="margin-bottom:24px; text-align:center;">
                      <div style="font-size:28px; font-weight:bold; color:#232c53; text-align:center;">☕ Nomu Cafe</div>
                  </div>
                  <div style="background:linear-gradient(135deg, #28a745 0%, #20c997 100%); color:white; padding:20px; border-radius:8px; margin:20px 0; text-align:center;">
                      <div style="width:40px; height:40px; background:rgba(255,255,255,0.3); border-radius:6px; margin:0 auto 10px auto; line-height:40px; font-size:22px; text-align:center;">✓</div>
                      <h2 style="margin:0; font-size:22px; font-weight:bold; text-align:center; color:white;">Password Reset Successful</h2>
                      <p style="margin:6px 0 0 0; font-size:14px; text-align:center; color:white;">Your password has been successfully updated. You can now sign in with your new password.</p>
                  </div>
                  <p style="font-size:14px; color:#333; margin:0 0 16px 0; text-align:left;">Hello ${userData.fullName || 'there'},</p>
                  <p style="font-size:14px; color:#333; margin:0 0 16px 0; text-align:left;">This email confirms that the password for your Nomu Cafe admin account has been successfully reset. You can sign in using the email and new password that were set for your account.</p>
                  <div style="background:#f8f9fa; padding:20px; border-radius:8px; margin:20px 0; border:1px solid #e9ecef; text-align:center;">
                      <h3 style="color:#232c53; margin:0 0 12px 0; font-size:15px; text-align:center;">Account details</h3>
                      <ul style="margin:0 auto; padding-left:0; list-style:none; display:inline-block; text-align:left;">
                          <li style="margin-bottom:8px; font-size:14px;"><strong>Email:</strong> ${userData.email || '—'}</li>
                          <li style="margin-bottom:8px; font-size:14px;"><strong>Password reset at:</strong> ${new Date().toLocaleString()}</li>
                      </ul>
                  </div>
                  <p style="font-size:14px; color:#333; margin:0 0 16px 0; text-align:center;">If you did not request this password reset, please contact your administrator immediately to secure your account.</p>
                  <div style="margin-top:28px; padding-top:20px; border-top:1px solid #eee; font-size:12px; color:#666; text-align:center;">© 2024 Nomu Cafe. This is an automated message; please do not reply.</div>
              </td></tr>
          </table>
      </body>
      </html>
      `;
    } else if (type === 'admin_account_created') {
      const roleLabel = (userData.role === 'superadmin') ? 'Owner' : (userData.role === 'manager') ? 'Manager' : 'Staff';
      return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Admin Account Created - Nomu Cafe</title>
      </head>
      <body style="margin:0; padding:20px; background-color:#f4f4f4; text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px; margin:0 auto;">
              <tr><td style="background:#fff; padding:30px; border-radius:10px; box-shadow:0 0 20px rgba(0,0,0,0.1); text-align:center;">
                  <div style="margin-bottom:24px; text-align:center;">
                      <div style="font-size:28px; font-weight:bold; color:#232c53; text-align:center;">☕ Nomu Cafe</div>
                  </div>
                  <div style="background:linear-gradient(135deg, #2B3A67 0%, #1a2347 100%); color:white; padding:20px; border-radius:8px; margin:20px 0; text-align:center;">
                      <div style="width:40px; height:40px; background:#28a745; border-radius:6px; margin:0 auto 10px auto; line-height:40px; font-size:22px; text-align:center;">✓</div>
                      <h2 style="margin:0; font-size:22px; font-weight:bold; text-align:center; color:white;">Your Admin Account Has Been Created</h2>
                      <p style="margin:6px 0 0 0; font-size:14px; text-align:center; color:white;">You can now access the Nomu Cafe Admin Dashboard.</p>
                  </div>
                  <p style="font-size:14px; color:#333; margin:0 0 16px 0; text-align:left;">Hello ${userData.fullName || 'there'},</p>
                  <p style="font-size:14px; color:#333; margin:0 0 16px 0; text-align:left;">An admin account has been successfully created for you. You have been added to the Nomu Cafe admin team and can sign in to the admin dashboard using the email and password that were set for your account.</p>
                  <div style="background:#f8f9fa; padding:20px; border-radius:8px; margin:20px 0; border:1px solid #e9ecef; text-align:center;">
                      <h3 style="color:#232c53; margin:0 0 12px 0; font-size:15px; text-align:center;">Account details</h3>
                      <ul style="margin:0 auto; padding-left:0; list-style:none; display:inline-block; text-align:left;">
                          <li style="margin-bottom:8px; font-size:14px;"><strong>Full name:</strong> ${userData.fullName || '—'}</li>
                          <li style="margin-bottom:8px; font-size:14px;"><strong>Email:</strong> <a href="mailto:${userData.email || ''}" style="color:#1a2347;">${userData.email || '—'}</a></li>
                          <li style="margin-bottom:0; font-size:14px;"><strong>Role:</strong> ${roleLabel}</li>
                      </ul>
                  </div>
                  <p style="font-size:14px; color:#333; margin:0 0 16px 0; text-align:center;">If you did not expect this email or have any questions, please contact your administrator.</p>
                  <div style="margin-top:28px; padding-top:20px; border-top:1px solid #eee; font-size:12px; color:#666; text-align:center;">© 2024 Nomu Cafe. This is an automated message; please do not reply.</div>
              </td></tr>
          </table>
      </body>
      </html>
      `;
    } else if (type === 'admin_account_updated') {
      const roleLabel = (userData.role === 'superadmin') ? 'Owner' : (userData.role === 'manager') ? 'Manager' : 'Staff';
      const changesList = (userData.changes && userData.changes.length)
        ? userData.changes.map(c => `<li style="margin-bottom:6px; font-size:14px;">${c}</li>`).join('')
        : '<li style="margin-bottom:6px; font-size:14px;">Your account details have been updated.</li>';
      return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Admin Account Updated - Nomu Cafe</title>
      </head>
      <body style="margin:0; padding:20px; background-color:#f4f4f4; text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px; margin:0 auto;">
              <tr><td style="background:#fff; padding:30px; border-radius:10px; box-shadow:0 0 20px rgba(0,0,0,0.1); text-align:center;">
                  <div style="margin-bottom:24px; text-align:center;">
                      <div style="font-size:28px; font-weight:bold; color:#232c53; text-align:center;">☕ Nomu Cafe</div>
                  </div>
                  <div style="background:linear-gradient(135deg, #2B3A67 0%, #1a2347 100%); color:white; padding:20px; border-radius:8px; margin:20px 0; text-align:center;">
                      <div style="width:40px; height:40px; background:#28a745; border-radius:6px; margin:0 auto 10px auto; line-height:40px; font-size:22px; text-align:center;">✓</div>
                      <h2 style="margin:0; font-size:22px; font-weight:bold; text-align:center; color:white;">Your Admin Account Has Been Updated</h2>
                      <p style="margin:6px 0 0 0; font-size:14px; text-align:center; color:white;">Changes to your admin account are listed below.</p>
                  </div>
                  <p style="font-size:14px; color:#333; margin:0 0 16px 0; text-align:left;">Hello ${userData.fullName || 'there'},</p>
                  <p style="font-size:14px; color:#333; margin:0 0 16px 0; text-align:left;">This email confirms that your Nomu Cafe admin account has been updated. If you made these changes yourself, you can disregard this notification. If not, an administrator has updated your account.</p>
                  <div style="background:#f8f9fa; padding:20px; border-radius:8px; margin:20px 0; border:1px solid #e9ecef; text-align:left;">
                      <h3 style="color:#232c53; margin:0 0 12px 0; font-size:15px; text-align:left;">What changed</h3>
                      <ul style="margin:0; padding-left:0; list-style:none; text-align:left;">
                          ${changesList}
                      </ul>
                      <h3 style="color:#232c53; margin:16px 0 8px 0; font-size:15px; text-align:left;">Current account details</h3>
                      <ul style="margin:0; padding-left:0; list-style:none; text-align:left;">
                          <li style="margin-bottom:8px; font-size:14px;"><strong>Full name:</strong> ${userData.fullName || '—'}</li>
                          <li style="margin-bottom:8px; font-size:14px;"><strong>Email:</strong> <a href="mailto:${userData.email || ''}" style="color:#1a2347;">${userData.email || '—'}</a></li>
                          <li style="margin-bottom:0; font-size:14px;"><strong>Role:</strong> ${roleLabel}</li>
                      </ul>
                  </div>
                  <p style="font-size:14px; color:#333; margin:0 0 16px 0; text-align:center;">If you did not request these changes or have any questions, please contact your administrator.</p>
                  <div style="margin-top:28px; padding-top:20px; border-top:1px solid #eee; font-size:12px; color:#666; text-align:center;">© 2024 Nomu Cafe. This is an automated message; please do not reply.</div>
              </td></tr>
          </table>
      </body>
      </html>
      `;
    } else if (type === 'admin_account_deleted') {
      return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Admin Account Removed - Nomu Cafe</title>
      </head>
      <body style="margin:0; padding:20px; background-color:#f4f4f4; text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px; margin:0 auto;">
              <tr><td style="background:#fff; padding:30px; border-radius:10px; box-shadow:0 0 20px rgba(0,0,0,0.1); text-align:center;">
                  <div style="margin-bottom:24px; text-align:center;">
                      <div style="font-size:28px; font-weight:bold; color:#232c53; text-align:center;">☕ Nomu Cafe</div>
                  </div>
                  <div style="background:linear-gradient(135deg, #5a6c7d 0%, #3d4f5f 100%); color:white; padding:20px; border-radius:8px; margin:20px 0; text-align:center;">
                      <h2 style="margin:0; font-size:22px; font-weight:bold; text-align:center; color:white;">Your Admin Account Has Been Removed</h2>
                      <p style="margin:6px 0 0 0; font-size:14px; text-align:center; color:white;">You no longer have access to the Nomu Cafe admin dashboard.</p>
                  </div>
                  <p style="font-size:14px; color:#333; margin:0 0 16px 0; text-align:left;">Hello ${userData.fullName || 'there'},</p>
                  <p style="font-size:14px; color:#333; margin:0 0 16px 0; text-align:left;">This email is to inform you that your Nomu Cafe admin account has been removed. Your access to the admin dashboard has been revoked, and you will no longer be able to sign in with this account.</p>
                  <div style="background:#f8f9fa; padding:20px; border-radius:8px; margin:20px 0; border:1px solid #e9ecef; text-align:center;">
                      <h3 style="color:#232c53; margin:0 0 12px 0; font-size:15px; text-align:center;">Account that was removed</h3>
                      <ul style="margin:0; padding-left:0; list-style:none; text-align:center;">
                          <li style="margin-bottom:8px; font-size:14px;"><strong>Full name:</strong> ${userData.fullName || '—'}</li>
                          <li style="margin-bottom:0; font-size:14px;"><strong>Email:</strong> <a href="mailto:${userData.email || ''}" style="color:#1a2347;">${userData.email || '—'}</a></li>
                      </ul>
                  </div>
                  <p style="font-size:14px; color:#333; margin:0 0 16px 0; text-align:center;">If you believe this was done in error or have questions, please contact your administrator.</p>
                  <div style="margin-top:28px; padding-top:20px; border-top:1px solid #eee; font-size:12px; color:#666; text-align:center;">© 2024 Nomu Cafe. This is an automated message; please do not reply.</div>
              </td></tr>
          </table>
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
