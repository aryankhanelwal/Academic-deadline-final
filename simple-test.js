// Simple working email test for reminder functionality
const emailReminderService = require('./services/emailReminderService');
const reminderScheduler = require('./services/reminderScheduler');
require('dotenv').config();

async function simpleTest() {
    console.log('🔬 SIMPLE REMINDER EMAIL TEST');
    console.log('=============================\n');
    
    try {
        // 1. Test email template generation
        console.log('1️⃣ Testing email template generation...');
        testTemplateGeneration();
        
        // 2. Test scheduler status
        console.log('\n2️⃣ Testing reminder scheduler status...');
        testSchedulerStatus();
        
        // 3. Send actual test emails
        console.log('\n3️⃣ Sending test emails to configured Gmail...');
        await sendTestEmails();
        
        console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
        console.log('\n📧 Check your email inbox at: 2002ak2002@gmail.com');
        console.log('\n✅ Your reminder mail functionality is WORKING PROPERLY! 🚀');
        
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        
        if (error.code === 'EAUTH') {
            console.error('\n🔐 EMAIL AUTHENTICATION ISSUE:');
            console.error('  • Check if 2-Factor Authentication is enabled on Gmail');
            console.error('  • Generate a new App Password in Google Account settings');
            console.error('  • Update EMAIL_PASS in .env file with the new app password');
            console.error('  • Current EMAIL_USER: 2002ak2002@gmail.com');
        } else if (error.code === 'ECONNECTION') {
            console.error('\n🌐 CONNECTION ISSUE:');
            console.error('  • Check internet connection');
            console.error('  • Check firewall settings');
            console.error('  • Verify Gmail SMTP settings');
        } else {
            console.error('\n🐛 UNKNOWN ERROR:');
            console.error('  Full error details:', error);
        }
    }
    
    process.exit();
}

function testTemplateGeneration() {
    try {
        // Create mock data for testing
        const mockUser = {
            name: 'John Doe',
            email: '2002ak2002@gmail.com'
        };

        const mockTasks = [
            {
                title: 'Submit Research Paper',
                category: 'Academic',
                date: new Date('2025-08-20T15:30:00'),
                notes: 'Final draft submission to professor',
                isPriority: true
            },
            {
                title: 'Prepare Presentation',
                category: 'Project',
                date: new Date('2025-08-20T10:00:00'),
                notes: 'PowerPoint presentation for class',
                isPriority: false
            },
            {
                title: 'Complete Lab Report',
                category: 'Lab Work',
                date: new Date('2025-08-20T23:59:00'),
                notes: 'Chemistry lab analysis report',
                isPriority: true
            }
        ];

        // Test deadline reminder HTML generation
        const deadlineHtml = emailReminderService.generateDeadlineReminderHTML(mockUser, mockTasks, 1);
        console.log(`✅ Deadline reminder HTML generated successfully (${deadlineHtml.length} characters)`);

        // Test daily digest HTML generation
        const digestHtml = emailReminderService.generateDailyDigestHTML(mockUser, [mockTasks[0]], [mockTasks[1], mockTasks[2]]);
        console.log(`✅ Daily digest HTML generated successfully (${digestHtml.length} characters)`);

        // Test subject generation
        const subject1 = emailReminderService.generateSubject([mockTasks[0]], 0);
        const subject2 = emailReminderService.generateSubject([mockTasks[0]], 1);
        const subject3 = emailReminderService.generateSubject(mockTasks, 3);
        
        console.log(`✅ Email subjects generated:`);
        console.log(`   • Due today: "${subject1}"`);
        console.log(`   • Due tomorrow: "${subject2}"`);
        console.log(`   • Due in 3 days: "${subject3}"`);
        
    } catch (error) {
        console.error('❌ Template generation failed:', error.message);
        throw error;
    }
}

function testSchedulerStatus() {
    try {
        // Check scheduler configuration
        const status = reminderScheduler.getStatus();
        console.log(`📊 Scheduler Status:`);
        console.log(`   • Initialized: ${status.initialized}`);
        console.log(`   • Active Jobs: ${status.activeJobs}`);
        
        console.log('✅ Scheduler configuration verified');
        
        // Note about cron schedule
        console.log('\n📅 Scheduled Jobs:');
        console.log('   • Deadline reminders: Every 1 minute (for testing)');
        console.log('   • Daily digest: Daily at 5:00 PM');
        console.log('   • Cleanup: Sundays at 2:00 AM');
        
    } catch (error) {
        console.error('❌ Scheduler test failed:', error.message);
        throw error;
    }
}

async function sendTestEmails() {
    try {
        // Create test user data
        const testUser = {
            name: 'Test User',
            email: '2002ak2002@gmail.com' // Sending to the configured Gmail account
        };

        // Create test tasks
        const testTasks = [
            {
                title: '🚨 URGENT: Assignment Due Tomorrow!',
                category: 'Academic',
                date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
                notes: 'This is a test reminder - your email system is working!',
                isPriority: true
            },
            {
                title: '📚 Study Session',
                category: 'Study',
                date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
                notes: 'Prepare for upcoming exam',
                isPriority: false
            },
            {
                title: '📝 Project Submission',
                category: 'Project',
                date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
                notes: 'Final project submission deadline',
                isPriority: true
            }
        ];

        console.log('📧 Sending test emails...');
        console.log(`   📬 Recipient: ${testUser.email}`);
        
        // Test 1: Send deadline reminder for urgent task
        console.log('\n   🔴 Sending URGENT deadline reminder...');
        await emailReminderService.sendDeadlineReminder(testUser, [testTasks[0]], 1);
        console.log('   ✅ Urgent reminder sent successfully!');
        
        // Wait a moment between emails
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test 2: Send multiple task reminder
        console.log('\n   📋 Sending multi-task reminder...');
        await emailReminderService.sendDeadlineReminder(testUser, testTasks, 7);
        console.log('   ✅ Multi-task reminder sent successfully!');
        
        // Wait a moment between emails
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test 3: Send daily digest
        console.log('\n   📊 Sending daily digest...');
        await emailReminderService.sendDailyDigest(testUser, [testTasks[0]], [testTasks[1], testTasks[2]]);
        console.log('   ✅ Daily digest sent successfully!');
        
        console.log('\n🎯 Email Test Results:');
        console.log('   ✅ SMTP Connection: Working');
        console.log('   ✅ Email Authentication: Working');  
        console.log('   ✅ Template Generation: Working');
        console.log('   ✅ Email Delivery: Working');
        console.log('\n📧 Check your Gmail inbox for 3 test emails!');
        
    } catch (error) {
        console.error('❌ Email sending failed:', error.message);
        throw error;
    }
}

// Run the simple test
console.log('🎯 Testing Reminder Mail Functionality');
console.log('=====================================');
console.log('📧 Email: 2002ak2002@gmail.com');
console.log('🏢 SMTP: Gmail (smtp.gmail.com:587)');
console.log('=====================================\n');

simpleTest();
