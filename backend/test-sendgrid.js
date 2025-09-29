const EmailService = require('./services/emailService');
const path = require('path');

// Load .env file explicitly
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testSendGridIntegration() {
  console.log('🧪 Testing SendGrid Integration...\n');
  
  // Check if SendGrid API key is configured
  if (!process.env.SENDGRID_API_KEY) {
    console.log('❌ SENDGRID_API_KEY not found in environment variables');
    console.log('📝 Please add your SendGrid API key to the .env file:');
    console.log('   SENDGRID_API_KEY=your_api_key_here\n');
    return;
  }
  
  console.log('✅ SendGrid API key found');
  console.log('📧 Testing feedback reply email...\n');
  
  try {
    const result = await EmailService.sendFeedbackReplyEmail(
      'mailcountrysidesteakhouse@gmail.com', // Using your actual email for testing
      'Test Customer',
      'This is a test feedback message to verify SendGrid integration.',
      'Thank you for your feedback! This is a test reply to verify our email system is working correctly.',
      5
    );
    
    if (result.success) {
      console.log('✅ SendGrid test email sent successfully!');
      console.log('📧 Message ID:', result.messageId);
      console.log('🎉 SendGrid integration is working properly!');
    } else {
      console.log('❌ SendGrid test failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error during SendGrid test:', error.message);
  }
}

// Run the test
testSendGridIntegration();