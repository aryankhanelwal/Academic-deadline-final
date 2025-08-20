/**
 * MANUAL REMINDER TEST
 * 
 * This script manually triggers the reminder system to test if it works
 * without waiting for the cron job.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const reminderScheduler = require('./services/reminderScheduler');

async function testRemindersNow() {
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    console.log('\n🧪 MANUAL REMINDER TEST STARTING...\n');

    // Manually trigger the deadline reminder process
    console.log('🚀 Triggering deadline reminders manually...');
    await reminderScheduler.processDeadlineReminders();

    console.log('\n📊 Triggering daily digest manually...');
    await reminderScheduler.processDailyDigests();

    console.log('\n✅ Manual test completed! Check your email for reminders.');

  } catch (error) {
    console.error('❌ Manual test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the manual test
console.log('🧪 Starting Manual Reminder Test...\n');
testRemindersNow();
