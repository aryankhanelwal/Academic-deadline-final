const mongoose = require("mongoose"); // <-- Add this line

const userSchema = new mongoose.Schema({
  name: String,
  StudentId: { type: String },
  CollegeName: String,
  email: { type: String, unique: true },
  password: String,
  phone: { type: String, unique: true, sparse: true }, // Make phone unique and sparse (allows null values)
  
  // SMS OTP Authentication fields (deprecated - keeping for backward compatibility)
  otp: {
    code: { type: String }, // Current OTP code
    expiresAt: { type: Date }, // OTP expiration time
    attempts: { type: Number, default: 0 }, // Failed verification attempts
    verified: { type: Boolean, default: false }, // Whether phone is verified
    lastSentAt: { type: Date } // When OTP was last sent (for rate limiting)
  },
  
  // Email OTP Authentication fields
  emailOtp: {
    code: { type: String }, // Current email OTP code
    expiresAt: { type: Date }, // OTP expiration time
    attempts: { type: Number, default: 0 }, // Failed verification attempts
    verified: { type: Boolean, default: false }, // Whether email is verified
    lastSentAt: { type: Date } // When OTP was last sent (for rate limiting)
  },
  
  // Verification status
  phoneVerified: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  
  // Email reminder preferences
  emailReminders: {
    enabled: { type: Boolean, default: true },
    reminderDays: {
      type: [Number],
      default: [1, 3, 7]
}, // Days before deadline to send reminders
    dailyDigest: { type: Boolean, default: false }, // Daily summary of tasks
    reminderTime: { type: String, default: '17:30' } // Time of day to send reminders (24hr format)
  }
});

const User = mongoose.model("User", userSchema);

module.exports = User; // <-- Also export the model
