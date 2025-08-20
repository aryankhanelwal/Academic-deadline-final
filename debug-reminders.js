/**
 * DEBUG REMINDERS SCRIPT
 * 
 * This script helps debug why reminders aren't being sent by checking:
 * 1. Users in database and their email reminder settings
 * 2. Tasks in database and their due dates
 * 3. The reminder logic step by step
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Task = require('./models/Task');
const ReminderLog = require('./models/ReminderLog');

async function debugReminders() {
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    console.log('\n=== DEBUG REPORT ===\n');

    // 1. Check all users
    console.log('👥 CHECKING USERS:');
    const allUsers = await User.find({});
    console.log(`Total users in database: ${allUsers.length}`);
    
    for (const user of allUsers) {
      console.log(`- User: ${user.email || 'No email'}`);
      console.log(`  Name: ${user.name || 'No name'}`);
      console.log(`  Email reminders enabled: ${user.emailReminders?.enabled || false}`);
      console.log(`  Reminder days: ${user.emailReminders?.reminderDays || 'Not set'}`);
      console.log('');
    }

    // 2. Check users with email reminders enabled
    console.log('📧 USERS WITH EMAIL REMINDERS ENABLED:');
    const usersWithReminders = await User.find({
      'emailReminders.enabled': true
    });
    console.log(`Users with reminders enabled: ${usersWithReminders.length}`);
    
    for (const user of usersWithReminders) {
      console.log(`- ${user.email} (ID: ${user._id})`);
    }
    console.log('');

    // 3. Check all tasks
    console.log('📝 CHECKING TASKS:');
    const allTasks = await Task.find({}).populate('userId', 'email name');
    console.log(`Total tasks in database: ${allTasks.length}`);
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const threeDays = new Date(today);
    threeDays.setDate(threeDays.getDate() + 3);
    const sevenDays = new Date(today);
    sevenDays.setDate(sevenDays.getDate() + 7);

    console.log(`Today: ${today.toDateString()}`);
    console.log(`Tomorrow: ${tomorrow.toDateString()}`);
    console.log(`In 3 days: ${threeDays.toDateString()}`);
    console.log(`In 7 days: ${sevenDays.toDateString()}`);
    console.log('');

    for (const task of allTasks) {
      const taskDate = new Date(task.date);
      const daysFromNow = Math.ceil((taskDate - today) / (1000 * 60 * 60 * 24));
      
      console.log(`- Task: "${task.title}"`);
      console.log(`  User: ${task.userId?.email || 'Unknown user'} (ID: ${task.userId?._id || task.userId})`);
      console.log(`  Due date: ${taskDate.toDateString()} (${daysFromNow} days from now)`);
      console.log(`  Category: ${task.category}`);
      console.log(`  Priority: ${task.isPriority}`);
      console.log('');
    }

    // 4. Check tasks for each reminder day
    console.log('🎯 CHECKING TASKS BY REMINDER DAYS:');
    const reminderDays = [1, 3, 7];
    
    for (const days of reminderDays) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      console.log(`\nTasks due in ${days} day(s) (${targetDate.toDateString()}):`);
      console.log(`Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
      
      const tasksForDay = await Task.find({
        date: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      }).populate('userId', 'email name emailReminders');
      
      console.log(`Found ${tasksForDay.length} tasks due in ${days} day(s)`);
      
      for (const task of tasksForDay) {
        console.log(`  - "${task.title}" by ${task.userId?.email || 'Unknown user'}`);
        console.log(`    User has reminders enabled: ${task.userId?.emailReminders?.enabled || false}`);
        
        // Check if reminder already sent
        if (task.userId) {
          const alreadySent = await ReminderLog.wasReminderSent(
            task.userId._id,
            task._id,
            'deadline',
            days
          );
          console.log(`    Reminder already sent: ${alreadySent}`);
        }
      }
    }

    // 5. Check reminder logs
    console.log('\n📋 RECENT REMINDER LOGS:');
    const recentLogs = await ReminderLog.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'email')
      .populate('taskId', 'title');
    
    console.log(`Recent reminder logs (last 10): ${recentLogs.length}`);
    for (const log of recentLogs) {
      console.log(`  - ${log.userId?.email || 'Unknown user'}: "${log.taskId?.title || 'Unknown task'}" (${log.daysBeforeDeadline} days, ${log.emailStatus}) at ${log.createdAt}`);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the debug
console.log('🔍 Starting Reminder Debug...\n');
debugReminders();
