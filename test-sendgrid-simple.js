/**
 * Simple SendGrid Test
 * Test if SendGrid is working with your configured API key
 */

const sgMail = require('@sendgrid/mail');

// Use the API key from your Railway variables
const SENDGRID_API_KEY = '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';

console.log('🧪 Testing SendGrid Email Service...\n');

// Set the API key
sgMail.setApiKey(SENDGRID_API_KEY);

// Test email configuration
const testEmail = async () => {
  try {
    const msg = {
      to: 'test@example.com', // This won't actually send to this email
      from: 'mailcountrysidesteakhouse@gmail.com',
      subject: 'SendGrid Test - Railway Email Fix',
      text: 'This is a test email to verify SendGrid configuration.',
      html: '<p>This is a test email to verify SendGrid configuration.</p>',
    };

    console.log('📧 Attempting to send test email...');
    console.log('From:', msg.from);
    console.log('To:', msg.to);
    console.log('Subject:', msg.subject);
    console.log('');

    // Try to send (this will validate the API key)
    const response = await sgMail.send(msg);
    
    console.log('✅ SUCCESS! SendGrid is working correctly');
    console.log('📧 Email sent successfully');
    console.log('Status Code:', response[0].statusCode);
    console.log('Message ID:', response[0].headers['x-message-id']);
    console.log('');
    console.log('🎉 Your Railway email service should be working!');
    
  } catch (error) {
    console.log('❌ SendGrid Error:', error.message);
    
    if (error.response) {
      console.log('Response Status:', error.response.status);
      console.log('Response Body:', error.response.body);
      
      if (error.response.status === 401) {
        console.log('💡 Issue: Invalid API key - check your SendGrid configuration');
      } else if (error.response.status === 403) {
        console.log('💡 Issue: API key lacks permissions - ensure "Full Access" is enabled');
      } else if (error.response.status === 400) {
        console.log('💡 Issue: Invalid email format or sender not verified');
      }
    }
    
    console.log('');
    console.log('🔧 Troubleshooting steps:');
    console.log('1. Check SendGrid dashboard for API key permissions');
    console.log('2. Verify sender email is verified in SendGrid');
    console.log('3. Ensure API key has "Full Access" permissions');
  }
};

// Run the test
testEmail();
