#!/usr/bin/env node

/**
 * SendGrid Test Script
 * Tests the SendGrid integration for Railway deployment
 */

const sgMail = require('@sendgrid/mail');

// Set the API key
sgMail.setApiKey('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');

async function testSendGrid() {
  console.log('🧪 Testing SendGrid Integration...\n');
  
  const msg = {
    to: 'trolbllad@gmail.com', // Your test email
    from: 'mailcountrysidesteakhouse@gmail.com', // Your verified sender
    subject: 'Test Email from Countryside Steak House',
    text: 'This is a test email to verify SendGrid integration is working properly.',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c3e50; margin-bottom: 10px;">Countryside Steak House</h1>
          <h2 style="color: #e74c3c; margin: 0;">Ang Paborito ng Bayan</h2>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
          <h3 style="color: #2c3e50; margin-top: 0;">SendGrid Integration Test</h3>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            This is a test email to verify that SendGrid is working properly with your Railway deployment.
          </p>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            If you receive this email, your email system is ready for production! 🎉
          </p>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
          <p>© 2024 Countryside Steak House. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    console.log('📧 Sending test email via SendGrid...');
    console.log('To:', msg.to);
    console.log('From:', msg.from);
    console.log('Subject:', msg.subject);
    console.log('');
    
    const response = await sgMail.send(msg);
    
    console.log('✅ SUCCESS! SendGrid test email sent successfully');
    console.log('📧 Message ID:', response[0].headers['x-message-id'] || 'sendgrid-success');
    console.log('');
    console.log('🎉 Your SendGrid integration is working perfectly!');
    console.log('📝 Next steps:');
    console.log('1. Add SENDGRID_API_KEY to Railway environment variables');
    console.log('2. Add RAILWAY_ENVIRONMENT=production to Railway');
    console.log('3. Redeploy your Railway service');
    console.log('4. Test feedback replies on your live site');
    console.log('');
    console.log('💡 Check your email inbox for the test message!');
    
  } catch (error) {
    console.error('❌ FAILED! SendGrid test failed');
    console.error('Error:', error.message);
    console.error('');
    console.error('🔍 Troubleshooting:');
    console.error('1. Check if the API key is correct');
    console.error('2. Verify the sender email is verified in SendGrid');
    console.error('3. Check SendGrid account status');
  }
}

// Run the test
testSendGrid().then(() => {
  console.log('\n🏁 SendGrid test completed');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
