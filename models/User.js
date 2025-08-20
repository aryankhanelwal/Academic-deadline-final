const mongoose = require("mongoose"); // <-- Add this line

const userSchema = new mongoose.Schema({
  name: String,
  StudentId: { type: String },
  CollegeName: String,
  email: { type: String, unique: true },
  password: String,
  phone: { type: String, unique: true, sparse: true }, // Make phone unique and sparse (allows null values)
  
  // OTP Authentication fields
  otp: {
    code: { type: String }, // Current OTP code
    expiresAt: { type: Date }, // OTP expiration time
    attempts: { type: Number, default: 0 }, // Failed verification attempts
    verified: { type: Boolean, default: false }, // Whether phone is verified
    lastSentAt: { type: Date } // When OTP was last sent (for rate limiting)
  },
  
  // Phone verification status
  phoneVerified: { type: Boolean, default: false },
  
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
