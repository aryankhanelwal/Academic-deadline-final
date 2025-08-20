const mongoose = require('mongoose');

/**
 * REMINDER LOG MODEL
 * 
 * This model tracks which reminders have been sent to prevent duplicate emails
 * and provides analytics on reminder effectiveness.
 */

const reminderLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  reminderType: {
    type: String,
    enum: ['deadline', 'daily_digest'],
    required: true
  },
  daysBeforeDeadline: {
    type: Number,
    required: true // 0 = due today, 1 = due tomorrow, etc.
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  taskDueDate: {
    type: Date,
    required: true
  },
  emailStatus: {
    type: String,
    enum: ['sent', 'failed', 'bounced'],
    default: 'sent'
  },
  errorMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Create compound index to prevent duplicate reminders
reminderLogSchema.index({ 
  userId: 1, 
  taskId: 1, 
  reminderType: 1, 
  daysBeforeDeadline: 1 
}, { unique: true });

// Index for cleanup queries (remove old logs)
reminderLogSchema.index({ createdAt: 1 });

/**
 * Static method to check if reminder was already sent
 * @param {String} userId - User ID
 * @param {String} taskId - Task ID  
 * @param {String} reminderType - Type of reminder
 * @param {Number} daysBeforeDeadline - Days before deadline
 * @returns {Boolean} - True if reminder already sent
 */
reminderLogSchema.statics.wasReminderSent = async function(userId, taskId, reminderType, daysBeforeDeadline) {
  const existingLog = await this.findOne({
    userId,
    taskId,
    reminderType,
    daysBeforeDeadline,
    emailStatus: 'sent'
  });
  
  return !!existingLog;
};

/**
 * Static method to log a sent reminder
 * @param {String} userId - User ID
 * @param {String} taskId - Task ID
 * @param {String} reminderType - Type of reminder
 * @param {Number} daysBeforeDeadline - Days before deadline
 * @param {Date} taskDueDate - When the task is due
 * @param {String} emailStatus - Status of email sending
 * @param {String} errorMessage - Error message if failed
 */
reminderLogSchema.statics.logReminder = async function(userId, taskId, reminderType, daysBeforeDeadline, taskDueDate, emailStatus = 'sent', errorMessage = null) {
  try {
    const log = new this({
      userId,
      taskId,
      reminderType,
      daysBeforeDeadline,
      taskDueDate,
      emailStatus,
      errorMessage
    });
    
    await log.save();
    return log;
  } catch (error) {
    // If duplicate key error (reminder already logged), ignore it
    if (error.code === 11000) {
      console.log(`Reminder already logged for user ${userId}, task ${taskId}`);
      return null;
    }
    throw error;
  }
};

/**
 * Static method to clean up old reminder logs (older than 90 days)
 */
reminderLogSchema.statics.cleanupOldLogs = async function() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const result = await this.deleteMany({
    createdAt: { $lt: ninetyDaysAgo }
  });
  
  console.log(`🧹 Cleaned up ${result.deletedCount} old reminder logs`);
  return result.deletedCount;
};

module.exports = mongoose.model('ReminderLog', reminderLogSchema);
