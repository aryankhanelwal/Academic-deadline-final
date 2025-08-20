/**
 * FIX USER REMINDER PREFERENCES
 * 
 * This script updates the user's email reminder preferences to ensure
 * they have the correct reminder days set up.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function fixUserPreferences() {
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find the user
    const user = await User.findOne({ email: '2002ak2002@gmail.com' });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 Current user settings:');
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name}`);
    console.log(`Current emailReminders:`, user.emailReminders);

    // Update the user's email reminder preferences
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          'emailReminders.enabled': true,
          'emailReminders.reminderDays': [1, 3, 7], // Set default reminder days
          'emailReminders.dailyDigest': true,
          'emailReminders.reminderTime': '18:18' // 6:18 PM
        }
      },
      { new: true }
    );

    console.log('\n✅ User preferences updated!');
    console.log('📧 New emailReminders settings:');
    console.log(`  Enabled: ${updatedUser.emailReminders.enabled}`);
    console.log(`  Reminder days: ${updatedUser.emailReminders.reminderDays}`);
    console.log(`  Daily digest: ${updatedUser.emailReminders.dailyDigest}`);
    console.log(`  Reminder time: ${updatedUser.emailReminders.reminderTime}`);

    console.log('\n🎉 User is now set up to receive reminders 1, 3, and 7 days before deadlines!');

  } catch (error) {
    console.error('❌ Failed to fix user preferences:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the fix
console.log('🔧 Fixing user reminder preferences...\n');
fixUserPreferences();
