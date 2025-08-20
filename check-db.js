// Simple database check
const mongoose = require('mongoose');
const User = require('./models/User');
const Task = require('./models/Task');
require('dotenv').config();

async function checkDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');
        
        const userCount = await User.countDocuments();
        const taskCount = await Task.countDocuments();
        
        console.log(`📊 Database Status:`);
        console.log(`  Users: ${userCount}`);
        console.log(`  Tasks: ${taskCount}`);
        
        if (userCount > 0) {
            const users = await User.find().limit(3).select('name email emailReminders.enabled');
            console.log('\n👥 Sample Users:');
            users.forEach(user => {
                console.log(`  • ${user.name} (${user.email}) - Reminders: ${user.emailReminders?.enabled || false}`);
            });
        }
        
        if (taskCount > 0) {
            const tasks = await Task.find().limit(3).populate('userId', 'name').select('title date userId');
            console.log('\n📋 Sample Tasks:');
            tasks.forEach(task => {
                const daysUntil = Math.ceil((task.date - new Date()) / (1000 * 60 * 60 * 24));
                console.log(`  • "${task.title}" due in ${daysUntil} days (User: ${task.userId?.name || 'Unknown'})`);
            });
        }
        
        // Clear any duplicate test data
        console.log('\n🧹 Cleaning up test data...');
        await User.deleteMany({ email: /test\.reminder@example\.com/ });
        await Task.deleteMany({ title: /Test/ });
        console.log('✅ Test data cleaned up');
        
    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('📡 Disconnected from MongoDB');
        process.exit();
    }
}

checkDatabase();
