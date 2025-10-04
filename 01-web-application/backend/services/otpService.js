const OTP = require('../models/OTP');
const emailService = require('./emailService');

class OTPService {
  // Generate a 6-digit OTP code
  generateOTPCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Create and send OTP
  async createAndSendOTP(email, type = 'admin_login', forceNew = false) {
    try {
      // Check if there's an existing unused OTP for this email and type
      const existingOTP = await OTP.findOne({
        email: email.toLowerCase(),
        type: type,
        isUsed: false,
        expiresAt: { $gt: new Date() }
      });

      if (existingOTP && !forceNew) {
        // If there's an existing valid OTP and we're not forcing a new one, return it
        return {
          success: true,
          message: 'OTP already exists and is still valid',
          otpId: existingOTP._id,
          expiresAt: existingOTP.expiresAt
        };
      }

      // If there's an existing OTP and we're forcing a new one, mark it as used
      if (existingOTP && forceNew) {
        existingOTP.isUsed = true;
        await existingOTP.save();
      }

      // Generate new OTP code
      const otpCode = this.generateOTPCode();

      // Create OTP record
      const otpRecord = new OTP({
        email: email.toLowerCase(),
        code: otpCode,
        type: type,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });

      await otpRecord.save();

      // Send OTP via email
      const emailResult = await emailService.sendOTP(email, otpCode, type);

      if (!emailResult.success) {
        // If email fails, delete the OTP record
        await OTP.findByIdAndDelete(otpRecord._id);
        return {
          success: false,
          message: 'Failed to send OTP email',
          error: emailResult.error
        };
      }

      return {
        success: true,
        message: 'OTP sent successfully',
        otpId: otpRecord._id,
        expiresAt: otpRecord.expiresAt
      };

    } catch (error) {

      return {
        success: false,
        message: 'Failed to create OTP',
        error: error.message
      };
    }
  }

  // Verify OTP code
  async verifyOTP(email, code, type = 'admin_login') {
    try {
      const otpRecord = await OTP.findOne({
        email: email.toLowerCase(),
        code: code,
        type: type,
        isUsed: false,
        expiresAt: { $gt: new Date() }
      });

      if (!otpRecord) {
        return {
          success: false,
          message: 'Invalid or expired OTP code'
        };
      }

      // Check attempt limit
      if (otpRecord.attempts >= 3) {
        await OTP.findByIdAndUpdate(otpRecord._id, { isUsed: true });
        return {
          success: false,
          message: 'Too many failed attempts. OTP has been invalidated.'
        };
      }

      // Mark OTP as used
      await OTP.findByIdAndUpdate(otpRecord._id, { isUsed: true });

      return {
        success: true,
        message: 'OTP verified successfully',
        otpId: otpRecord._id
      };

    } catch (error) {

      return {
        success: false,
        message: 'Failed to verify OTP',
        error: error.message
      };
    }
  }

  // Increment failed attempt count
  async incrementFailedAttempt(email, code, type = 'admin_login') {
    try {
      const otpRecord = await OTP.findOne({
        email: email.toLowerCase(),
        code: code,
        type: type,
        isUsed: false,
        expiresAt: { $gt: new Date() }
      });

      if (otpRecord) {
        await OTP.findByIdAndUpdate(otpRecord._id, {
          $inc: { attempts: 1 }
        });
      }
    } catch (error) {

    }
  }

  // Clean up expired OTPs (this runs automatically via MongoDB TTL index)
  async cleanupExpiredOTPs() {
    try {
      const result = await OTP.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      return result.deletedCount;
    } catch (error) {

      return 0;
    }
  }

  // Get OTP status for debugging
  async getOTPStatus(email, type = 'admin_login') {
    try {
      const otpRecord = await OTP.findOne({
        email: email.toLowerCase(),
        type: type,
        isUsed: false,
        expiresAt: { $gt: new Date() }
      });

      if (!otpRecord) {
        return {
          exists: false,
          message: 'No active OTP found'
        };
      }

      return {
        exists: true,
        attempts: otpRecord.attempts,
        expiresAt: otpRecord.expiresAt,
        timeRemaining: Math.max(0, otpRecord.expiresAt - new Date())
      };
    } catch (error) {

      return {
        exists: false,
        error: error.message
      };
    }
  }
}

module.exports = new OTPService();
