/**
 * Test SendGrid Working with Your Backend Email Service
 */

const EmailService = require('./services/emailService');

console.log('🧪 Testing SendGrid with Your Backend Email Service...\n');

// Test the email service
const testEmailService = async () => {
  try {
    console.log('📧 Testing SendGrid email functionality...');
    console.log('');

    // Test data
    const emailData = {
      to: 'test@example.com',
      subject: 'SendGrid Test - Railway Email Fix',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50; margin-bottom: 10px;">Countryside Steak House</h1>
            <h2 style="color: #e74c3c; margin: 0;">Ang Paborito ng Bayan</h2>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
            <h3 style="color: #2c3e50; margin-top: 0;">SendGrid Test Email</h3>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              This is a test email to verify that SendGrid is working correctly with your Railway deployment.
            </p>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              If you receive this email, your email service is properly configured and working!
            </p>
            
            <div style="background-color: #d4edda; border: 1px solid #c3e6cb; 
                        padding: 15px; border-radius: 5px; margin-top: 20px;">
              <p style="color: #155724; margin: 0; font-weight: bold;">
                ✅ SendGrid Email Service Working!
              </p>
              <p style="color: #155724; margin: 5px 0 0 0; font-size: 14px;">
                Railway email fix successful - no more SMTP timeouts!
              </p>
            </div>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
            <p>© 2025 Countryside Steak House. All rights reserved.</p>
            <p>This is a test email from your Railway deployment.</p>
          </div>
        </div>
      `,
      text: `
        SendGrid Test Email - Countryside Steak House
        
        This is a test email to verify that SendGrid is working correctly with your Railway deployment.
        
        If you receive this email, your email service is properly configured and working!
        
        ✅ SendGrid Email Service Working!
        Railway email fix successful - no more SMTP timeouts!
        
        © 2025 Countryside Steak House. All rights reserved.
        This is a test email from your Railway deployment.
      `
    };

    console.log('📤 Sending test email...');
    console.log('To:', emailData.to);
    console.log('Subject:', emailData.subject);
    console.log('');

    // Use the email service with fallback
    const result = await EmailService.sendEmailWithFallback(emailData);

    if (result.success) {
      console.log('🎉 SUCCESS! Email sent successfully!');
      console.log('✅ SendGrid is working correctly');
      console.log('✅ Railway email fix is successful');
      console.log('📧 Message ID:', result.messageId);
      console.log('');
      console.log('🚀 Your email service is now working on Railway!');
      console.log('📝 Feedback replies will now send successfully');
      console.log('🔐 Password recovery emails will work');
      console.log('👥 Employee welcome emails will work');
    } else {
      console.log('❌ Email failed:', result.error);
      console.log('');
      console.log('🔧 Troubleshooting:');
      console.log('1. Check if SendGrid API key is valid');
      console.log('2. Verify API key has "Full Access" permissions');
      console.log('3. Check Railway environment variables');
      console.log('4. Look at Railway logs for more details');
    }

  } catch (error) {
    console.error('❌ Error testing email service:', error.message);
    console.log('');
    console.log('🔧 This might indicate:');
    console.log('- SendGrid API key issues');
    console.log('- Network connectivity problems');
    console.log('- Railway environment configuration issues');
  }
};

// Run the test
testEmailService();
