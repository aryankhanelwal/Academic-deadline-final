// Comprehensive reminder system test
const mongoose = require('mongoose');
const User = require('./models/User');
const Task = require('./models/Task');
const ReminderLog = require('./models/ReminderLog');
const emailReminderService = require('./services/emailReminderService');
const reminderScheduler = require('./services/reminderScheduler');
require('dotenv').config();

async function runReminderTests() {
    console.log('🚀 Starting comprehensive reminder system tests...\n');
    
    try {
        // 1. Test MongoDB connection
        console.log('1️⃣ Testing MongoDB connection...');
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB connected successfully\n');

        // 2. Test email template generation
        console.log('2️⃣ Testing email template generation...');
        await testEmailTemplates();

        // 3. Check if there are any users in the database
        console.log('3️⃣ Checking existing users...');
        const userCount = await User.countDocuments();
        console.log(`📊 Found ${userCount} users in database`);
        
        if (userCount === 0) {
            console.log('⚠️  No users found. Creating test user...');
            await createTestUser();
        }

        // 4. Check if there are tasks that need reminders
        console.log('\n4️⃣ Checking tasks that need reminders...');
        await checkTasksNeedingReminders();

        // 5. Test reminder scheduler manually
        console.log('\n5️⃣ Testing reminder scheduler manually...');
        await testReminderScheduler();

        // 6. Test email sending (if we have data)
        console.log('\n6️⃣ Testing actual email sending...');
        await testEmailSending();

        console.log('\n🎉 All tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('📡 Disconnected from MongoDB');
        process.exit();
    }
}

async function testEmailTemplates() {
    try {
        // Create mock user and tasks
        const mockUser = {
            name: 'Test User',
            email: 'test@example.com'
        };

        const mockTasks = [
            {
                title: 'Complete Assignment',
                category: 'Academic',
                date: new Date(),
                notes: 'Important assignment due soon',
                isPriority: true
            },
            {
                title: 'Study for Exam',
                category: 'Academic',
                date: new Date(),
                notes: 'Final exam preparation',
                isPriority: false
            }
        ];

        // Test deadline reminder HTML generation
        const deadlineHtml = emailReminderService.generateDeadlineReminderHTML(mockUser, mockTasks, 1);
        console.log('✅ Deadline reminder HTML generated successfully');
        console.log(`📄 HTML length: ${deadlineHtml.length} characters`);

        // Test daily digest HTML generation
        const digestHtml = emailReminderService.generateDailyDigestHTML(mockUser, mockTasks, mockTasks);
        console.log('✅ Daily digest HTML generated successfully');
        console.log(`📄 HTML length: ${digestHtml.length} characters`);

        // Test subject generation
        const subject = emailReminderService.generateSubject(mockTasks, 1);
        console.log('✅ Email subject generated:', subject);
        
    } catch (error) {
        console.error('❌ Email template test failed:', error.message);
        throw error;
    }
}

async function createTestUser() {
    try {
        const testUser = new User({
            name: 'Test User',
            email: 'test.reminder@example.com',
            StudentId: 'TEST001',
            CollegeName: 'Test College',
            password: 'testpassword',
            emailReminders: {
                enabled: true,
                reminderDays: [1, 3, 7],
                dailyDigest: true
            }
        });

        await testUser.save();
        console.log('✅ Test user created successfully');

        // Create test tasks for this user
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        const testTasks = [
            {
                userId: testUser._id,
                title: 'Test Assignment Due Tomorrow',
                category: 'Test',
                date: tomorrow,
                notes: 'This is a test task due tomorrow',
                isPriority: true
            },
            {
                userId: testUser._id,
                title: 'Test Project Due Next Week',
                category: 'Test',
                date: nextWeek,
                notes: 'This is a test project due next week',
                isPriority: false
            }
        ];

        await Task.insertMany(testTasks);
        console.log('✅ Test tasks created successfully');
        
        return testUser;
    } catch (error) {
        console.error('❌ Failed to create test user:', error.message);
        throw error;
    }
}

async function checkTasksNeedingReminders() {
    try {
        // Check tasks due in the next 7 days
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        const upcomingTasks = await Task.find({
            date: {
                $gte: new Date(),
                $lte: nextWeek
            }
        }).populate('userId');

        console.log(`📋 Found ${upcomingTasks.length} tasks due in the next 7 days:`);
        
        upcomingTasks.forEach(task => {
            const daysUntil = Math.ceil((task.date - new Date()) / (1000 * 60 * 60 * 24));
            console.log(`  • "${task.title}" due in ${daysUntil} days (User: ${task.userId?.name || 'Unknown'})`);
        });

        // Check users with reminders enabled
        const usersWithReminders = await User.find({
            'emailReminders.enabled': true
        });
        
        console.log(`👥 Found ${usersWithReminders.length} users with email reminders enabled`);
        
        return { upcomingTasks, usersWithReminders };
    } catch (error) {
        console.error('❌ Failed to check tasks:', error.message);
        throw error;
    }
}

async function testReminderScheduler() {
    try {
        console.log('🔄 Testing reminder scheduler logic...');
        
        // Get scheduler status
        const status = reminderScheduler.getStatus();
        console.log('📊 Scheduler status:', status);

        // Test deadline reminders manually
        console.log('🧪 Running manual deadline reminder test...');
        await reminderScheduler.testDeadlineReminders();
        
        console.log('✅ Reminder scheduler test completed');
    } catch (error) {
        console.error('❌ Reminder scheduler test failed:', error.message);
        throw error;
    }
}

async function testEmailSending() {
    try {
        // Find a user with reminders enabled
        const user = await User.findOne({
            'emailReminders.enabled': true
        });

        if (!user) {
            console.log('⚠️  No users with email reminders enabled');
            return;
        }

        console.log(`📧 Testing email sending to: ${user.email}`);

        // Find tasks for this user due tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const startOfTomorrow = new Date(tomorrow);
        startOfTomorrow.setHours(0, 0, 0, 0);
        const endOfTomorrow = new Date(tomorrow);
        endOfTomorrow.setHours(23, 59, 59, 999);

        const tasks = await Task.find({
            userId: user._id,
            date: {
                $gte: startOfTomorrow,
                $lte: endOfTomorrow
            }
        });

        if (tasks.length > 0) {
            console.log(`📬 Sending reminder for ${tasks.length} task(s)...`);
            await emailReminderService.sendDeadlineReminder(user, tasks, 1);
            console.log('✅ Test email sent successfully!');
        } else {
            console.log('ℹ️  No tasks due tomorrow for test email');
            
            // Send daily digest instead
            const todayTasks = [];
            const upcomingTasks = await Task.find({
                userId: user._id,
                date: { $gt: new Date() }
            }).limit(5);
            
            if (upcomingTasks.length > 0) {
                console.log('📊 Sending daily digest instead...');
                await emailReminderService.sendDailyDigest(user, todayTasks, upcomingTasks);
                console.log('✅ Daily digest sent successfully!');
            }
        }
    } catch (error) {
        console.error('❌ Email sending test failed:', error.message);
        if (error.code === 'EAUTH') {
            console.error('🔐 Authentication issue - check email credentials');
        } else if (error.code === 'ECONNECTION') {
            console.error('🌐 Connection issue - check internet and firewall');
        }
    }
}

// Run the tests
console.log('🎯 Academic Deadline Reminder System Test');
console.log('==========================================\n');
runReminderTests();
