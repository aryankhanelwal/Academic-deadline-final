/**
 * REMINDER SCHEDULER SERVICE
 * 
 * This service uses cron jobs to automatically check for upcoming deadlines
 * and send email reminders to users based on their preferences.
 */

const cron = require('node-cron');
const User = require('../models/User');
const Task = require('../models/Task');
const ReminderLog = require('../models/ReminderLog');
const emailReminderService = require('./emailReminderService');

class ReminderScheduler {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize and start all cron jobs
   */
  init() {
    if (this.isInitialized) {
      console.log('⚠️  Reminder scheduler already initialized');
      return;
    }

    console.log('🚀 Starting Reminder Scheduler...');
    
    // Daily reminder check at 5:43 PM
    this.startDeadlineReminderJob();
    
    // Daily digest at 5:00 PM (for users who enabled it)
    this.startDailyDigestJob();
    
    // Weekly cleanup of old reminder logs (every Sunday at 2:00 AM)
    this.startCleanupJob();
    
    this.isInitialized = true;
    console.log('✅ Reminder Scheduler initialized successfully!');
  }

  /**
   * Main deadline reminder job - runs daily at 6:18 PM
   * Checks for tasks due in 1, 3, and 7 days and sends reminders
   */
  startDeadlineReminderJob() {
    // Run every day at 6:18 PM (18:18) for testing
    cron.schedule('* * * * *', async () => {
      console.log('🔔 Running daily deadline reminder check...');
      try {
        await this.processDeadlineReminders();
      } catch (error) {
        console.error('❌ Error in deadline reminder job:', error);
      }
    });
    
    console.log('📅 Deadline reminder job scheduled (daily after 1 min for testing purpose)');
  }

  /**
   * Daily digest job - runs daily at 6:15 PM
   * Sends summary of today's tasks and upcoming deadlines
   */
  startDailyDigestJob() {
    // Run every day at 6:15 PM (18:15)
    cron.schedule('15 18 * * *', async () => {
      console.log('📊 Running daily digest job...');
      try {
        await this.processDailyDigests();
      } catch (error) {
        console.error('❌ Error in daily digest job:', error);
      }
    });
    
    console.log('📊 Daily digest job scheduled (daily at 6:15 PM)');
  }

  /**
   * Cleanup job - runs weekly on Sundays at 2:00 AM
   * Removes old reminder logs to keep database clean
   */
  startCleanupJob() {
    // Run every Sunday at 2:00 AM
    cron.schedule('0 2 * * 0', async () => {
      console.log('🧹 Running weekly cleanup job...');
      try {
        await ReminderLog.cleanupOldLogs();
      } catch (error) {
        console.error('❌ Error in cleanup job:', error);
      }
    });
    
    console.log('🧹 Weekly cleanup job scheduled (Sundays at 2:00 AM)');
  }

  /**
   * Process deadline reminders for all users
   */
  async processDeadlineReminders() {
    try {
      // Get all users with email reminders enabled
      const users = await User.find({
        'emailReminders.enabled': true
      });

      console.log(`👥 Processing reminders for ${users.length} users...`);

      let totalReminders = 0;

      for (const user of users) {
        try {
          const remindersSent = await this.processUserDeadlineReminders(user);
          totalReminders += remindersSent;
        } catch (error) {
          console.error(`❌ Error processing reminders for user ${user.email}:`, error.message);
        }
      }

      console.log(`✅ Deadline reminder check completed. Sent ${totalReminders} reminders.`);
    } catch (error) {
      console.error('❌ Error in processDeadlineReminders:', error);
    }
  }

  /**
   * Process deadline reminders for a specific user
   * @param {Object} user - User object
   * @returns {Number} - Number of reminders sent
   */
  async processUserDeadlineReminders(user) {
    let remindersSent = 0;
    
    // Get user's reminder preferences
    const reminderDays = user.emailReminders.reminderDays || [1, 3, 7];
    
    // Check each reminder day (1, 3, 7 days before deadline)
    for (const days of reminderDays) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      
      // Find tasks due on the target date
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const tasks = await Task.find({
        userId: user._id,
        date: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      });

      if (tasks.length === 0) continue;

      // Group tasks and check if reminders already sent
      const tasksToRemind = [];
      
      for (const task of tasks) {
        const alreadySent = await ReminderLog.wasReminderSent(
          user._id,
          task._id,
          'deadline',
          days
        );
        
        if (!alreadySent) {
          tasksToRemind.push(task);
        }
      }

      if (tasksToRemind.length === 0) continue;

      try {
        // Send reminder email
        await emailReminderService.sendDeadlineReminder(user, tasksToRemind, days);
        
        // Log the reminders
        for (const task of tasksToRemind) {
          await ReminderLog.logReminder(
            user._id,
            task._id,
            'deadline',
            days,
            task.date,
            'sent'
          );
        }
        
        remindersSent += tasksToRemind.length;
        console.log(`✅ Sent ${days}-day reminder to ${user.email} for ${tasksToRemind.length} task(s)`);
        
      } catch (error) {
        console.error(`❌ Failed to send ${days}-day reminder to ${user.email}:`, error.message);
        
        // Log failed reminders
        for (const task of tasksToRemind) {
          await ReminderLog.logReminder(
            user._id,
            task._id,
            'deadline',
            days,
            task.date,
            'failed',
            error.message
          );
        }
      }
    }
    
    return remindersSent;
  }

  /**
   * Process daily digests for users who enabled them
   */
  async processDailyDigests() {
    try {
      // Get users with daily digest enabled
      const users = await User.find({
        'emailReminders.enabled': true,
        'emailReminders.dailyDigest': true
      });

      console.log(`📊 Processing daily digests for ${users.length} users...`);

      let totalDigests = 0;

      for (const user of users) {
        try {
          const digestSent = await this.processUserDailyDigest(user);
          if (digestSent) totalDigests++;
        } catch (error) {
          console.error(`❌ Error processing daily digest for user ${user.email}:`, error.message);
        }
      }

      console.log(`✅ Daily digest processing completed. Sent ${totalDigests} digests.`);
    } catch (error) {
      console.error('❌ Error in processDailyDigests:', error);
    }
  }

  /**
   * Process daily digest for a specific user
   * @param {Object} user - User object
   * @returns {Boolean} - True if digest was sent
   */
  async processUserDailyDigest(user) {
    try {
      const today = new Date();
      const startOfToday = new Date(today);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);

      // Get tasks due today
      const todayTasks = await Task.find({
        userId: user._id,
        date: {
          $gte: startOfToday,
          $lte: endOfToday
        }
      });

      // Get tasks due in the next 7 days
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const upcomingTasks = await Task.find({
        userId: user._id,
        date: {
          $gt: endOfToday,
          $lte: nextWeek
        }
      }).sort({ date: 1 }).limit(10); // Limit to 10 upcoming tasks

      // Send digest only if there are tasks to report
      if (todayTasks.length > 0 || upcomingTasks.length > 0) {
        await emailReminderService.sendDailyDigest(user, todayTasks, upcomingTasks);
        console.log(`✅ Sent daily digest to ${user.email}`);
        return true;
      } else {
        console.log(`ℹ️  No tasks to report in daily digest for ${user.email}`);
        return false;
      }
      
    } catch (error) {
      console.error(`❌ Failed to send daily digest to ${user.email}:`, error.message);
      return false;
    }
  }

  /**
   * Manual trigger for testing deadline reminders
   */
  async testDeadlineReminders() {
    console.log('🧪 Testing deadline reminders...');
    await this.processDeadlineReminders();
  }

  /**
   * Manual trigger for testing daily digests  
   */
  async testDailyDigest() {
    console.log('🧪 Testing daily digests...');
    await this.processDailyDigests();
  }

  /**
   * Stop all cron jobs (for graceful shutdown)
   */
  stop() {
    console.log('⏹️  Stopping reminder scheduler...');
    cron.destroy();
    this.isInitialized = false;
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      activeJobs: cron.getTasks().size
    };
  }
}

module.exports = new ReminderScheduler();
