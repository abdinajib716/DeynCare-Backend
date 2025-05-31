/**
 * Email Test Script
 * Run this script to test email functionality
 * Usage: node src/tests/emailTest.js
 */
require('dotenv').config();
const nodemailer = require('nodemailer');
const path = require('path');

// Print current directory and .env file path for debugging
console.log('Current directory:', process.cwd());
console.log('.env file path:', path.join(process.cwd(), '.env'));

// Check if environment variables are loaded
console.log('\n🔍 Checking environment variables:');
console.log('EMAIL_HOST:', process.env.EMAIL_HOST || 'MISSING');
console.log('EMAIL_PORT:', process.env.EMAIL_PORT || 'MISSING');
console.log('EMAIL_USER:', process.env.EMAIL_USER || 'MISSING');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '********' : 'MISSING');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'MISSING');

// Email configuration from .env with fallbacks to ensure we don't get null values
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: parseInt(process.env.EMAIL_PORT || '587') === 465,
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || ''
  }
};

// Test email details
const mailOptions = {
  from: process.env.EMAIL_FROM || '"DeynCare Test" <trustytester2@gmail.com>',
  to: process.env.EMAIL_USER, // Send to the same email for testing
  subject: 'DeynCare Email Test',
  text: 'If you receive this email, the email service is working correctly.',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
      <h2 style="color: #4CAF50;">DeynCare Email Test</h2>
      <p>This is a test email to verify that the email service is working correctly.</p>
      <p>Email configuration used:</p>
      <ul>
        <li><strong>Host:</strong> ${emailConfig.host}</li>
        <li><strong>Port:</strong> ${emailConfig.port}</li>
        <li><strong>Secure:</strong> ${emailConfig.secure}</li>
        <li><strong>User:</strong> ${emailConfig.auth.user}</li>
      </ul>
      <p>Time sent: ${new Date().toLocaleString()}</p>
      <hr>
      <p style="font-size: 12px; color: #666;">&copy; ${new Date().getFullYear()} DeynCare. All rights reserved.</p>
    </div>
  `
};

console.log('🔍 Testing email service with the following configuration:');
console.log(JSON.stringify(emailConfig, null, 2));
console.log('\n📧 Attempting to send test email to:', mailOptions.to);

async function testEmail() {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport(emailConfig);
    
    // Verify SMTP connection
    console.log('\n🔄 Verifying SMTP connection...');
    const connectionResult = await transporter.verify();
    console.log('✅ SMTP connection verified:', connectionResult);
    
    // Send test email
    console.log('\n🔄 Sending test email...');
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully!');
    console.log('📨 Message ID:', info.messageId);
    console.log('📬 Preview URL:', nodemailer.getTestMessageUrl(info));
    
    return true;
  } catch (error) {
    console.error('❌ Email test failed with error:');
    console.error(error);
    
    // Provide troubleshooting tips based on error
    console.log('\n🔧 Troubleshooting tips:');
    
    if (error.code === 'EAUTH') {
      console.log('- Authentication failed. Check your email and password.');
      console.log('- For Gmail, you need to use an App Password if 2FA is enabled.');
      console.log('- Create an App Password at: https://myaccount.google.com/apppasswords');
    } else if (error.code === 'ESOCKET') {
      console.log('- Connection issue. Check if the host and port are correct.');
      console.log('- Ensure your network allows SMTP connections.');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('- Connection refused. The SMTP server may be blocking your connection.');
      console.log('- Check if your IP is allowed to connect to the SMTP server.');
    }
    
    return false;
  }
}

// Run the test with a timeout to ensure completion
const EMAIL_TEST_TIMEOUT = 30000; // 30 seconds

let timeoutId = setTimeout(() => {
  console.log('\n⚠️ Test took too long to complete. The email might still be sending.');
  console.log('Please check your email inbox for the test message.');
  process.exit(0);
}, EMAIL_TEST_TIMEOUT);

testEmail()
  .then(success => {
    clearTimeout(timeoutId);
    if (success) {
      console.log('\n🎉 Email service is working correctly!');
      console.log('Check your inbox for the test email.');
    } else {
      console.log('\n❌ Email service is not working. See errors above.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    clearTimeout(timeoutId);
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });
