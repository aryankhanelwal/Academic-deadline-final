/**
 * DAILY DIGEST TEST SCRIPT
 * 
 * This script manually tests the daily digest functionality
 * Run with: node test_daily_digest.js
 */

const mongoose = require('mongoose');
const User = require('./models/User');
const Task = require('./models/Task');
const reminderScheduler = require('./services/reminderScheduler');
require('dotenv').config();

async function testDailyDigest() {
  try {
    console.log('🧪 Starting Daily Digest Test...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // 1. Check users with daily digest enabled
    const usersWithDigest = await User.find({
      'emailReminders.enabled': true,
      'emailReminders.dailyDigest': true
    });
    console.log(`📊 Found ${usersWithDigest.length} users with daily digest enabled`);

    if (usersWithDigest.length === 0) {
      console.log('⚠️  No users have daily digest enabled. Let\'s check all users...');
      const allUsers = await User.find({}, 'name email emailReminders');
      console.log('👥 All users:', allUsers.map(u => ({
        name: u.name,
        email: u.email,
        emailReminders: u.emailReminders
      })));
    }

    // 2. For each user with digest enabled, check their tasks
    for (const user of usersWithDigest) {
      console.log(`\n👤 Checking tasks for user: ${user.name} (${user.email})`);
      
      const today = new Date();
      const startOfToday = new Date(today);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);

      // Tasks due today
      const todayTasks = await Task.find({
        userId: user._id,
        date: {
          $gte: startOfToday,
          $lte: endOfToday
        }
      });

      // Tasks due in the next 7 days
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const upcomingTasks = await Task.find({
        userId: user._id,
        date: {
          $gt: endOfToday,
          $lte: nextWeek
        }
      }).sort({ date: 1 }).limit(10);

      console.log(`  📅 Tasks due today: ${todayTasks.length}`);
      console.log(`  📋 Upcoming tasks (next 7 days): ${upcomingTasks.length}`);
      
      if (todayTasks.length > 0) {
        console.log('  Today\'s tasks:', todayTasks.map(t => `"${t.title}" (${new Date(t.date).toLocaleDateString()})`));
      }
      
      if (upcomingTasks.length > 0) {
        console.log('  Upcoming tasks:', upcomingTasks.map(t => `"${t.title}" (${new Date(t.date).toLocaleDateString()})`));
      }
    }

    // 3. Test the daily digest processing
    console.log('\n🧪 Testing daily digest processing...');
    
    // WARNING: This will actually send emails if there are eligible users
    // Comment out the line below if you don't want to send real emails
    // await reminderScheduler.testDailyDigest();
    
    console.log('⚠️  Email sending test skipped to avoid spam. Uncomment line in script to test actual email sending.');

    console.log('\n✅ Daily Digest Test Completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testDailyDigest();
