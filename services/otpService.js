/**
 * OTP SERVICE FOR TWILIO SMS INTEGRATION
 * 
 * This service handles OTP generation, sending via Twilio SMS, and verification logic.
 * It includes rate limiting, attempt tracking, and proper error handling.
 */

const twilio = require('twilio');
const User = require('../models/User');
require('dotenv').config();

class OTPService {
  constructor() {
    // Initialize Twilio client
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    // Check if credentials are properly configured
    const isValidConfig = this.accountSid && 
                         this.authToken && 
                         this.fromNumber &&
                         this.accountSid !== 'your_twilio_account_sid_here' &&
                         this.authToken !== 'your_twilio_auth_token_here' &&
                         this.fromNumber !== 'your_twilio_phone_number_here' &&
                         this.accountSid.startsWith('AC');
    
    if (!isValidConfig) {
      console.warn('⚠️  Twilio credentials not configured or invalid. OTP service will work in simulation mode.');
      this.client = null;
    } else {
      try {
        this.client = twilio(this.accountSid, this.authToken);
        console.log('✅ Twilio OTP service initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Twilio client:', error.message);
        this.client = null;
      }
    }
    
    // Configuration
    this.OTP_LENGTH = 6;
    this.OTP_EXPIRY_MINUTES = 10;
    this.MAX_ATTEMPTS = 5;
    this.RATE_LIMIT_MINUTES = 2; // Minimum time between OTP requests
  }

  /**
   * Generate a random OTP code
   * @returns {string} OTP code
   */
  generateOTP() {
    const min = Math.pow(10, this.OTP_LENGTH - 1);
    const max = Math.pow(10, this.OTP_LENGTH) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  /**
   * Format phone number to international format
   * @param {string} phoneNumber - Phone number to format
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digits
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it starts with 0, replace with country code (assuming India +91)
    if (cleaned.startsWith('0')) {
      cleaned = '91' + cleaned.substring(1);
    }
    
    // If it doesn't start with country code, add India's code
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    
    // Add the + prefix
    return '+' + cleaned;
  }

  /**
   * Check if user can request a new OTP (rate limiting)
   * @param {Object} user - User object
   * @returns {boolean} True if user can request OTP
   */
  canRequestOTP(user) {
    if (!user.otp || !user.otp.lastSentAt) {
      return true;
    }
    
    const timeSinceLastSent = Date.now() - user.otp.lastSentAt.getTime();
    const rateLimitMs = this.RATE_LIMIT_MINUTES * 60 * 1000;
    
    return timeSinceLastSent >= rateLimitMs;
  }

  /**
   * Send OTP via Twilio SMS
   * @param {string} phoneNumber - Phone number to send OTP to
   * @param {Object} user - User object (optional, for existing users)
   * @returns {Object} Result object with success status and message
   */
  async sendOTP(phoneNumber, user = null) {
    try {
      if (!this.client) {
        throw new Error('Twilio client not initialized. Check your configuration.');
      }

      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      // Check rate limiting if user exists
      if (user && !this.canRequestOTP(user)) {
        const timeRemaining = Math.ceil(
          (this.RATE_LIMIT_MINUTES * 60 * 1000 - (Date.now() - user.otp.lastSentAt.getTime())) / 1000
        );
        return {
          success: false,
          message: `Please wait ${timeRemaining} seconds before requesting another OTP`
        };
      }

      // Generate OTP and expiry time
      const otpCode = this.generateOTP();
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      // Send SMS via Twilio
      const message = await this.client.messages.create({
        body: `Your Midvey verification code is: ${otpCode}. This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone.`,
        from: this.fromNumber,
        to: formattedPhone
      });

      console.log(`📱 OTP sent to ${formattedPhone}. Message SID: ${message.sid}`);

      // Update or create user OTP data
      if (user) {
        user.otp = {
          code: otpCode,
          expiresAt: expiresAt,
          attempts: 0,
          verified: false,
          lastSentAt: new Date()
        };
        await user.save();
      }

      return {
        success: true,
        message: 'OTP sent successfully',
        expiresAt: expiresAt,
        messageSid: message.sid
      };

    } catch (error) {
      console.error('❌ Failed to send OTP:', error.message);
      console.error('❌ Twilio Error Details:', {
        code: error.code,
        moreInfo: error.moreInfo,
        status: error.status,
        details: error.details
      });
      
      // Provide more specific error messages
      let userMessage = 'Failed to send OTP. Please try again.';
      if (error.code === 21211) {
        userMessage = 'Invalid phone number format. Please check your phone number.';
      } else if (error.code === 21608) {
        userMessage = 'Phone number not verified. For trial accounts, verify the number in Twilio Console first.';
      } else if (error.code === 21614) {
        userMessage = 'Invalid phone number. Please check the number format.';
      }
      
      return {
        success: false,
        message: userMessage,
        error: error.message,
        twilioCode: error.code
      };
    }
  }

  /**
   * Verify OTP code
   * @param {Object} user - User object
   * @param {string} otpCode - OTP code to verify
   * @returns {Object} Verification result
   */
  async verifyOTP(user, otpCode) {
    try {
      if (!user.otp || !user.otp.code) {
        return {
          success: false,
          message: 'No OTP found. Please request a new OTP.'
        };
      }

      // Check if OTP has expired
      if (new Date() > user.otp.expiresAt) {
        return {
          success: false,
          message: 'OTP has expired. Please request a new one.',
          expired: true
        };
      }

      // Check if maximum attempts exceeded
      if (user.otp.attempts >= this.MAX_ATTEMPTS) {
        return {
          success: false,
          message: 'Maximum verification attempts exceeded. Please request a new OTP.',
          maxAttemptsExceeded: true
        };
      }

      // Increment attempts
      user.otp.attempts += 1;
      await user.save();

      // Verify the OTP code
      if (user.otp.code !== otpCode.toString()) {
        const remainingAttempts = this.MAX_ATTEMPTS - user.otp.attempts;
        return {
          success: false,
          message: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
          remainingAttempts: remainingAttempts
        };
      }

      // OTP verified successfully
      user.otp.verified = true;
      user.phoneVerified = true;
      
      // Clear the OTP data for security
      user.otp.code = undefined;
      user.otp.expiresAt = undefined;
      user.otp.attempts = 0;
      
      await user.save();

      console.log(`✅ OTP verified successfully for phone: ${user.phone}`);

      return {
        success: true,
        message: 'OTP verified successfully',
        phoneVerified: true
      };

    } catch (error) {
      console.error('❌ Error verifying OTP:', error.message);
      return {
        success: false,
        message: 'Error verifying OTP. Please try again.',
        error: error.message
      };
    }
  }

  /**
   * Find existing user by phone number (for login)
   * @param {string} phoneNumber - Phone number
   * @returns {Object|null} User object or null if not found
   */
  async findUserByPhone(phoneNumber) {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      const user = await User.findOne({ phone: formattedPhone });
      return user;
    } catch (error) {
      console.error('❌ Error finding user by phone:', error.message);
      throw error;
    }
  }

  /**
   * Create user in database after OTP verification
   * @param {Object} userData - Complete user data
   * @returns {Object} Created user
   */
  async createVerifiedUser(userData) {
    try {
      const formattedPhone = this.formatPhoneNumber(userData.phone);
      
      // Create new user with verified phone
      const user = new User({
        phone: formattedPhone,
        name: userData.name || '',
        StudentId: userData.StudentId || '',
        CollegeName: userData.CollegeName || '',
        email: userData.email || null,
        password: userData.password || null,
        phoneVerified: true
      });
      
      await user.save();
      console.log(`👤 Verified user created for phone: ${formattedPhone}`);
      return user;
      
    } catch (error) {
      console.error('❌ Error creating verified user:', error.message);
      throw error;
    }
  }

  /**
   * Clean expired OTP codes (can be run periodically)
   */
  async cleanExpiredOTPs() {
    try {
      const result = await User.updateMany(
        {
          'otp.expiresAt': { $lt: new Date() }
        },
        {
          $unset: {
            'otp.code': '',
            'otp.expiresAt': '',
            'otp.attempts': ''
          }
        }
      );
      
      console.log(`🧹 Cleaned ${result.modifiedCount} expired OTPs`);
      return result.modifiedCount;

    } catch (error) {
      console.error('❌ Error cleaning expired OTPs:', error.message);
      throw error;
    }
  }

  /**
   * Get service status and configuration
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      initialized: !!this.client,
      configuration: {
        otpLength: this.OTP_LENGTH,
        expiryMinutes: this.OTP_EXPIRY_MINUTES,
        maxAttempts: this.MAX_ATTEMPTS,
        rateLimitMinutes: this.RATE_LIMIT_MINUTES,
        twilioConfigured: !!(this.accountSid && this.authToken && this.fromNumber)
      }
    };
  }
}

module.exports = new OTPService();
