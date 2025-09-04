/**
 * Test script to verify email OTP functionality
 */

const emailOtpService = require('./services/emailOtpService');
require('dotenv').config();

async function testEmailOTP() {
    console.log('🧪 Testing Email OTP Service...\n');
    
    // Check service status
    console.log('1. Service Status:');
    const status = emailOtpService.getStatus();
    console.log(JSON.stringify(status, null, 2));
    console.log('');
    
    // Test email validation
    console.log('2. Email Validation Test:');
    const testEmail = '2002ak2002@gmail.com';
    const isValid = emailOtpService.isValidEmail(testEmail);
    console.log(`Email ${testEmail} is valid: ${isValid}`);
    console.log('');
    
    // Test OTP generation
    console.log('3. OTP Generation Test:');
    const otp = emailOtpService.generateOTP();
    console.log(`Generated OTP: ${otp}`);
    console.log('');
    
    // Test sending OTP
    console.log('4. Sending OTP Test:');
    try {
        const result = await emailOtpService.sendOTP(testEmail);
        console.log('Send OTP Result:');
        console.log(JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('\n✅ SUCCESS: OTP email sent successfully!');
            if (result.simulationMode) {
                console.log('📝 Note: Running in simulation mode - check server logs for OTP code');
            } else {
                console.log('📧 Check your email inbox for the OTP code');
            }
        } else {
            console.log('\n❌ FAILED: Could not send OTP email');
            console.log('Error:', result.message);
        }
        
    } catch (error) {
        console.error('\n💥 ERROR: Exception occurred while sending OTP');
        console.error('Details:', error.message);
    }
}

// Run the test
testEmailOTP().then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
}).catch((error) => {
    console.error('\n💥 Test failed with exception:', error);
    process.exit(1);
});
