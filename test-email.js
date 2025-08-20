// Email connection test script
const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmailConnection() {
    console.log('🔍 Testing email connection...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
    console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
    
    try {
        // Create transporter with same config as EmailReminderService
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            port: 587,
            secure: false,
            tls: {
                rejectUnauthorized: false
            }
        });

        // Verify connection
        console.log('🔗 Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ Email service connection successful!');

        // Send a test email
        const testEmail = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Send to self for testing
            subject: '🧪 Test Email - Reminder System Check',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #007bff;">✅ Email System Test Successful!</h2>
                    <p>This is a test email to verify that your reminder mail functionality is working properly.</p>
                    <p><strong>Test performed at:</strong> ${new Date().toLocaleString()}</p>
                    <p><strong>Configuration:</strong></p>
                    <ul>
                        <li>Email Host: ${process.env.EMAIL_HOST}</li>
                        <li>Email Port: ${process.env.EMAIL_PORT}</li>
                        <li>From Email: ${process.env.EMAIL_USER}</li>
                    </ul>
                    <p style="color: #28a745; font-weight: bold;">Your email reminder system is ready to go! 🚀</p>
                </div>
            `
        };

        console.log('📧 Sending test email...');
        const result = await transporter.sendMail(testEmail);
        console.log('✅ Test email sent successfully!');
        console.log('Message ID:', result.messageId);
        
        return true;
    } catch (error) {
        console.error('❌ Email connection test failed:');
        console.error('Error:', error.message);
        
        if (error.code === 'EAUTH') {
            console.error('🔐 Authentication failed. Please check:');
            console.error('1. Email address is correct');
            console.error('2. App password is valid (not regular password)');
            console.error('3. 2-Factor Authentication is enabled on Gmail');
            console.error('4. App-specific password is generated');
        } else if (error.code === 'ECONNECTION') {
            console.error('🌐 Connection failed. Please check:');
            console.error('1. Internet connection');
            console.error('2. Firewall settings');
            console.error('3. Gmail SMTP settings');
        }
        
        return false;
    }
}

// Run the test
testEmailConnection().then((success) => {
    process.exit(success ? 0 : 1);
});
