/**
 * Script to check users data in MongoDB
 */

const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkUsers() {
    try {
        console.log('🔍 Connecting to MongoDB...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Connected to MongoDB\n');
        
        // Get all users
        const users = await User.find({}).sort({ _id: -1 }); // Sort by newest first
        
        console.log(`👥 Total Users Found: ${users.length}\n`);
        
        if (users.length === 0) {
            console.log('📋 No users found in the database.');
            return;
        }
        
        // Display each user
        users.forEach((user, index) => {
            console.log(`🔸 User ${index + 1}:`);
            console.log(`   ID: ${user._id}`);
            console.log(`   Name: ${user.name || 'N/A'}`);
            console.log(`   Email: ${user.email || 'N/A'}`);
            console.log(`   Student ID: ${user.StudentId || 'N/A'}`);
            console.log(`   College: ${user.CollegeName || 'N/A'}`);
            console.log(`   Phone: ${user.phone || 'N/A'}`);
            console.log(`   Email Verified: ${user.emailVerified || false}`);
            console.log(`   Phone Verified: ${user.phoneVerified || false}`);
            
            // Email OTP data
            if (user.emailOtp) {
                console.log(`   Email OTP:`);
                console.log(`     - Code: ${user.emailOtp.code || 'N/A'}`);
                console.log(`     - Expires: ${user.emailOtp.expiresAt || 'N/A'}`);
                console.log(`     - Attempts: ${user.emailOtp.attempts || 0}`);
                console.log(`     - Verified: ${user.emailOtp.verified || false}`);
                console.log(`     - Last Sent: ${user.emailOtp.lastSentAt || 'N/A'}`);
            } else {
                console.log(`   Email OTP: None`);
            }
            
            // SMS OTP data (legacy)
            if (user.otp) {
                console.log(`   SMS OTP (Legacy):`);
                console.log(`     - Code: ${user.otp.code || 'N/A'}`);
                console.log(`     - Expires: ${user.otp.expiresAt || 'N/A'}`);
                console.log(`     - Attempts: ${user.otp.attempts || 0}`);
                console.log(`     - Verified: ${user.otp.verified || false}`);
            } else {
                console.log(`   SMS OTP: None`);
            }
            
            console.log(`   Created: ${user._id.getTimestamp()}`);
            console.log(`   Password: ${user.password ? 'SET' : 'NOT SET'}`);
            console.log('');
        });
        
        // Summary statistics
        const emailVerifiedCount = users.filter(u => u.emailVerified).length;
        const phoneVerifiedCount = users.filter(u => u.phoneVerified).length;
        const withEmailOtpCount = users.filter(u => u.emailOtp).length;
        const withSmsOtpCount = users.filter(u => u.otp).length;
        
        console.log('📊 Summary:');
        console.log(`   Email Verified Users: ${emailVerifiedCount}/${users.length}`);
        console.log(`   Phone Verified Users: ${phoneVerifiedCount}/${users.length}`);
        console.log(`   Users with Email OTP: ${withEmailOtpCount}/${users.length}`);
        console.log(`   Users with SMS OTP: ${withSmsOtpCount}/${users.length}`);
        
    } catch (error) {
        console.error('❌ Error checking users:', error.message);
        if (error.code === 'ENOTFOUND') {
            console.log('💡 Tip: Make sure MongoDB is running and connection string is correct');
        }
    } finally {
        // Close connection
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the check
checkUsers().then(() => {
    console.log('✅ User data check completed');
    process.exit(0);
}).catch((error) => {
    console.error('💥 Check failed:', error);
    process.exit(1);
});
