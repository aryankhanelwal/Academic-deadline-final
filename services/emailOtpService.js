/**
 * EMAIL OTP SERVICE USING NODEMAILER
 * 
 * This service handles OTP generation, sending via email using Nodemailer, and verification logic.
 * It includes rate limiting, attempt tracking, and proper error handling.
 */

const nodemailer = require('nodemailer');
const User = require('../models/User');
require('dotenv').config();

class EmailOTPService {
  constructor() {
    // Initialize email transporter
    this.emailUser = process.env.EMAIL_USER;
    this.emailPass = process.env.EMAIL_PASS;
    this.emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
    this.emailPort = process.env.EMAIL_PORT || 587;
    
    // Check if credentials are properly configured
    const isValidConfig = this.emailUser && 
                         this.emailPass && 
                         this.emailUser !== 'your-email@gmail.com' &&
                         this.emailPass !== 'your-app-password-here';
    
    if (!isValidConfig) {
      console.warn('⚠️  Email credentials not configured or invalid. OTP service will work in simulation mode.');
      this.transporter = null;
    } else {
      try {
        this.transporter = nodemailer.createTransport({
          host: this.emailHost,
          port: this.emailPort,
          secure: false, // true for 465, false for other ports
          auth: {
            user: this.emailUser,
            pass: this.emailPass
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        
        // Verify transporter configuration
        this.transporter.verify((error, success) => {
          if (error) {
            console.error('❌ Email transporter verification failed:', error.message);
            this.transporter = null;
          } else {
            console.log('✅ Email OTP service initialized successfully');
          }
        });
        
      } catch (error) {
        console.error('❌ Failed to initialize email transporter:', error.message);
        this.transporter = null;
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
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if email is valid
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if user can request a new OTP (rate limiting)
   * @param {Object} user - User object
   * @returns {boolean} True if user can request OTP
   */
  canRequestOTP(user) {
    if (!user.emailOtp || !user.emailOtp.lastSentAt) {
      return true;
    }
    
    const timeSinceLastSent = Date.now() - user.emailOtp.lastSentAt.getTime();
    const rateLimitMs = this.RATE_LIMIT_MINUTES * 60 * 1000;
    
    return timeSinceLastSent >= rateLimitMs;
  }

  /**
   * Send OTP via Email using Nodemailer
   * @param {string} email - Email address to send OTP to
   * @param {Object} user - User object (optional, for existing users)
   * @returns {Object} Result object with success status and message
   */
  async sendOTP(email, user = null) {
    // Generate OTP and expiry time early so we can fall back to simulation on any error
    const otpCode = this.generateOTP();
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    try {
      if (!this.isValidEmail(email)) {
        return {
          success: false,
          message: 'Invalid email address format'
        };
      }

      // Check rate limiting if user exists
      if (user && !this.canRequestOTP(user)) {
        const timeRemaining = Math.ceil(
          (this.RATE_LIMIT_MINUTES * 60 * 1000 - (Date.now() - user.emailOtp.lastSentAt.getTime())) / 1000
        );
        return {
          success: false,
          message: `Please wait ${timeRemaining} seconds before requesting another OTP`
        };
      }

      // If no transporter (simulation mode)
      if (!this.transporter) {
        console.log(`🔐 EMAIL OTP for ${email}: ${otpCode} (expires at ${expiresAt})`);
        
        // Update user OTP data in simulation mode
        if (user) {
          user.emailOtp = {
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
          message: `OTP sent successfully (simulation mode). Code: ${otpCode}`,
          expiresAt: expiresAt,
          simulationMode: true
        };
      }

      // Send email via Nodemailer
      const mailOptions = {
        from: {
          name: 'Academic Deadline Tracker',
          address: this.emailUser
        },
        to: email,
        subject: 'Your Verification Code - Academic Deadline Tracker',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
              <h1 style="color: #2563eb; margin-bottom: 20px;">Academic Deadline Tracker</h1>
              <h2 style="color: #374151; margin-bottom: 20px;">Verify Your Email</h2>
              
              <div style="background-color: #ffffff; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
                <h1 style="color: #2563eb; font-size: 36px; margin: 0; font-weight: bold; letter-spacing: 5px;">
                  ${otpCode}
                </h1>
              </div>
              
              <p style="color: #6b7280; font-size: 16px; margin: 20px 0;">
                Enter this verification code to complete your registration.
              </p>
              
              <p style="color: #ef4444; font-size: 14px; margin: 20px 0;">
                ⚠️ This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.
              </p>
              
              <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                If you didn't request this verification code, please ignore this email.<br>
                Do not share this code with anyone.
              </p>
            </div>
          </div>
        `,
        text: `
          Academic Deadline Tracker - Email Verification
          
          Your verification code is: ${otpCode}
          
          Enter this code to complete your registration.
          This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.
          
          If you didn't request this verification code, please ignore this email.
          Do not share this code with anyone.
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`📧 OTP sent to ${email}. Message ID: ${info.messageId}`);
      
      // Update or create user OTP data
      if (user) {
        user.emailOtp = {
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
        message: 'OTP sent to your email address successfully',
        expiresAt: expiresAt,
        messageId: info.messageId
      };

    } catch (error) {
      console.error('❌ Failed to send email OTP:', error.message);
      console.warn('🔄 Falling back to simulation mode due to email error');
      
      // Fall back to simulation mode when email fails
      console.log(`🔐 EMAIL OTP for ${email}: ${otpCode} (expires at ${expiresAt})`);
      
      // Update user OTP data in simulation fallback mode
      if (user) {
        user.emailOtp = {
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
        message: `Email delivery failed, using simulation mode. Your OTP code is: ${otpCode}`,
        expiresAt: expiresAt,
        simulationMode: true,
        emailError: {
          code: error.code,
          message: error.message
        }
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
      if (!user.emailOtp || !user.emailOtp.code) {
        return {
          success: false,
          message: 'No OTP found. Please request a new OTP.'
        };
      }

      // Check if OTP has expired
      if (new Date() > new Date(user.emailOtp.expiresAt)) {
        return {
          success: false,
          message: 'OTP has expired. Please request a new one.',
          expired: true
        };
      }

      // Check if maximum attempts exceeded
      if (user.emailOtp.attempts >= this.MAX_ATTEMPTS) {
        return {
          success: false,
          message: 'Maximum OTP attempts exceeded. Please request a new one.',
          maxAttemptsExceeded: true
        };
      }

      // Increment attempts
      user.emailOtp.attempts = (user.emailOtp.attempts || 0) + 1;
      await user.save();

      // Verify OTP code
      if (user.emailOtp.code !== otpCode.toString()) {
        const remainingAttempts = this.MAX_ATTEMPTS - user.emailOtp.attempts;
        return {
          success: false,
          message: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
          remainingAttempts: remainingAttempts
        };
      }

      // OTP is valid - mark as verified
      user.emailOtp.verified = true;
      user.emailVerified = true; // Mark email as verified
      await user.save();

      console.log(`✅ Email OTP verified for: ${user.email}`);

      return {
        success: true,
        message: 'OTP verified successfully'
      };

    } catch (error) {
      console.error('❌ OTP verification error:', error.message);
      return {
        success: false,
        message: 'OTP verification failed. Please try again.'
      };
    }
  }

  /**
   * Find or create user by email
   * @param {string} email - Email address
   * @param {Object} userData - Additional user data
   * @returns {Object} User object and isNewUser flag
   */
  async findOrCreateUserByEmail(email, userData = {}) {
    try {
      let user = await User.findOne({ email: email });
      let isNewUser = false;

      if (!user) {
        // Create new user with minimal data
        user = new User({
          email: email,
          name: userData.name || '',
          StudentId: userData.StudentId || '',
          CollegeName: userData.CollegeName || '',
          password: userData.password || null,
          emailVerified: false
        });
        await user.save();
        isNewUser = true;
        console.log(`👤 New user created for email: ${email}`);
      }

      return { user, isNewUser };

    } catch (error) {
      console.error('❌ Error finding/creating user:', error.message);
      throw error;
    }
  }

  /**
   * Get service status
   * @returns {Object} Service status information
   */
  getStatus() {
    return {
      service: 'Email OTP Service',
      configured: !!this.transporter,
      emailHost: this.emailHost,
      emailPort: this.emailPort,
      emailUser: this.emailUser ? this.emailUser.replace(/(.{3}).*(@.*)/, '$1***$2') : 'Not configured',
      otpLength: this.OTP_LENGTH,
      expiryMinutes: this.OTP_EXPIRY_MINUTES,
      maxAttempts: this.MAX_ATTEMPTS,
      rateLimitMinutes: this.RATE_LIMIT_MINUTES
    };
  }
}

// Export singleton instance
module.exports = new EmailOTPService();
