#!/usr/bin/env node

/**
 * Quick Email Test Script
 * Tests both SendGrid and SMTP configurations
 */

const EmailService = require('./services/emailService');

async function testEmailService() {
  console.log('🧪 Testing Email Service Configuration\n');

  // Test email data
  const testEmailData = {
    to: 'charleslouiealvaran@gmail.com',
    subject: 'Test Email from Railway - ' + new Date().toISOString(),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c3e50;">✅ Email Service Test</h2>
        <p>This is a test email from your Railway deployment.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
        <p><strong>Railway Environment:</strong> ${process.env.RAILWAY_ENVIRONMENT || 'not set'}</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          If you receive this email, your email service is working correctly! 🎉
        </p>
      </div>
    `,
    text: `Email Service Test - ${new Date().toISOString()}\n\nThis is a test email from your Railway deployment. If you receive this email, your email service is working correctly!`
  };

  console.log('📧 Sending test email...');
  console.log('To:', testEmailData.to);
  console.log('Subject:', testEmailData.subject);
  console.log('');

  try {
    // Test the email service with fallback
    const result = await EmailService.sendEmailWithFallback(testEmailData);
    
    if (result.success) {
      console.log('✅ SUCCESS! Email sent successfully');
      console.log('Message ID:', result.messageId);
      console.log('');
      console.log('🎉 Your email service is working correctly!');
      console.log('Check your inbox for the test email.');
    } else {
      console.log('❌ FAILED! Email could not be sent');
      console.log('Error:', result.error);
      console.log('');
      console.log('🔧 Troubleshooting:');
      console.log('1. Check Railway environment variables are set');
      console.log('2. Verify SendGrid API key is valid');
      console.log('3. Verify Gmail app password is correct');
      console.log('4. Check Railway logs for detailed error messages');
    }
  } catch (error) {
    console.log('❌ ERROR! Exception occurred during email test');
    console.log('Error:', error.message);
    console.log('');
    console.log('🔧 This might indicate a configuration issue.');
  }

  console.log('');
  console.log('📋 Environment Check:');
  console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅ SET' : '❌ NOT SET');
  console.log('SMTP_USER:', process.env.SMTP_USER || '❌ NOT SET');
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✅ SET' : '❌ NOT SET');
  console.log('NODE_ENV:', process.env.NODE_ENV || '❌ NOT SET');
  console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT || '❌ NOT SET');
}

// Run the test
testEmailService().catch(console.error);
