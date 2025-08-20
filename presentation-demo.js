/**
 * PRESENTATION DEMO SCRIPT
 * 
 * This script creates a complete demo for presentation purposes.
 * It will:
 * 1. Create demo tasks with different due dates
 * 2. Send test reminders
 * 3. Show logs and confirmation
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Task = require('./models/Task');
const emailReminderService = require('./services/emailReminderService');
const reminderScheduler = require('./services/reminderScheduler');

async function presentationDemo() {
  try {
    console.log('🎯 STARTING PRESENTATION DEMO\n');
    console.log('=' .repeat(50));
    
    // Connect to MongoDB
    console.log('\n1️⃣  CONNECTING TO DATABASE...');
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

    console.log('\n2️⃣  USER INFORMATION:');
    console.log(`👤 Name: ${user.name}`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`🔔 Reminders enabled: ${user.emailReminders.enabled}`);
    console.log(`📅 Reminder days: ${user.emailReminders.reminderDays.join(', ')}`);

    // Clean up old demo tasks
    console.log('\n3️⃣  CLEANING OLD DEMO TASKS...');
    await Task.deleteMany({ userId: user._id, title: { $regex: /^DEMO/ } });
    console.log('🧹 Old demo tasks cleaned');

    // Create demo tasks
    console.log('\n4️⃣  CREATING DEMO TASKS FOR PRESENTATION...');
    
    const demoTasks = [
      {
        title: 'DEMO: Database Project Submission',
        category: 'Project',
        date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
        notes: 'Final database project with complete documentation',
        isPriority: true
      },
      {
        title: 'DEMO: Algorithm Test',
        category: 'Exam',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        notes: 'Midterm examination on sorting and searching algorithms',
        isPriority: false
      },
      {
        title: 'DEMO: Web Development Assignment',
        category: 'Assignment',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        notes: 'Create a responsive web application with React',
        isPriority: true
      }
    ];

    const createdTasks = [];
    for (const taskData of demoTasks) {
      const task = new Task({ ...taskData, userId: user._id });
      await task.save();
      createdTasks.push(task);
      console.log(`✅ Created: "${task.title}" (Due: ${task.date.toDateString()})`);
    }

    console.log('\n5️⃣  DEMONSTRATING EMAIL REMINDERS...');
    
    // Send 1-day reminder
    console.log('\n📧 Sending 1-day reminder...');
    const tomorrowTasks = createdTasks.filter(task => {
      const days = Math.ceil((new Date(task.date) - new Date()) / (1000 * 60 * 60 * 24));
      return days === 1;
    });
    
    if (tomorrowTasks.length > 0) {
      await emailReminderService.sendDeadlineReminder(user, tomorrowTasks, 1);
      console.log(`✅ 1-day reminder sent for ${tomorrowTasks.length} task(s)`);
    }

    // Send 3-day reminder
    console.log('\n📧 Sending 3-day reminder...');
    const threeDayTasks = createdTasks.filter(task => {
      const days = Math.ceil((new Date(task.date) - new Date()) / (1000 * 60 * 60 * 1000));
      return days >= 2 && days <= 4;
    });
    
    if (threeDayTasks.length > 0) {
      await emailReminderService.sendDeadlineReminder(user, threeDayTasks, 3);
      console.log(`✅ 3-day reminder sent for ${threeDayTasks.length} task(s)`);
    }

    // Send 7-day reminder
    console.log('\n📧 Sending 7-day reminder...');
    const weekTasks = createdTasks.filter(task => {
      const days = Math.ceil((new Date(task.date) - new Date()) / (1000 * 60 * 60 * 24));
      return days >= 6 && days <= 8;
    });
    
    if (weekTasks.length > 0) {
      await emailReminderService.sendDeadlineReminder(user, weekTasks, 7);
      console.log(`✅ 7-day reminder sent for ${weekTasks.length} task(s)`);
    }

    // Send daily digest
    console.log('\n📊 Sending daily digest...');
    await emailReminderService.sendDailyDigest(user, [], createdTasks);
    console.log('✅ Daily digest sent');

    console.log('\n6️⃣  DEMO SUMMARY:');
    console.log('=' .repeat(50));
    console.log('📧 EMAIL REMINDERS SENT TO: ' + user.email);
    console.log('📝 TYPES OF EMAILS SENT:');
    console.log('   • 1-day deadline reminder (URGENT)');
    console.log('   • 3-day deadline reminder (WARNING)'); 
    console.log('   • 7-day deadline reminder (INFO)');
    console.log('   • Daily digest summary');
    console.log('\n🎯 CHECK YOUR EMAIL NOW TO SEE THE RESULTS!');
    
    console.log('\n7️⃣  AUTOMATIC SCHEDULING:');
    console.log('⏰ Daily reminders scheduled at: 6:18 PM');
    console.log('📊 Daily digest scheduled at: 6:15 PM');
    console.log('🧹 Weekly cleanup: Sundays 2:00 AM');

    console.log('\n8️⃣  NEXT STEPS FOR PRESENTATION:');
    console.log('1. Open your email application');
    console.log('2. Show the 4 emails that were just sent');
    console.log('3. Open each email to show the different templates');
    console.log('4. Explain the automatic scheduling');
    console.log('5. Show the database integration');

    // Cleanup demo tasks (optional)
    const cleanupChoice = process.argv.includes('--keep-tasks') ? 'keep' : 'cleanup';
    if (cleanupChoice === 'cleanup') {
      console.log('\n9️⃣  CLEANING UP DEMO TASKS...');
      await Task.deleteMany({ userId: user._id, title: { $regex: /^DEMO/ } });
      console.log('🧹 Demo tasks cleaned up');
      console.log('💡 Use --keep-tasks flag to keep demo tasks for further testing');
    } else {
      console.log('\n9️⃣  KEEPING DEMO TASKS FOR FURTHER TESTING...');
    }

    console.log('\n🎉 PRESENTATION DEMO COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(50));

  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the demo
console.log('🎤 PREPARING PRESENTATION DEMO...\n');
presentationDemo();
