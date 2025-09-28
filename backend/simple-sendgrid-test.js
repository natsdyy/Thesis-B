const sgMail = require('@sendgrid/mail');

// Set the API key
sgMail.setApiKey('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');

async function testSimple() {
  console.log('🧪 Simple SendGrid Test...\n');
  
  const msg = {
    to: 'trolbllad@gmail.com',
    from: 'mailcountrysidesteakhouse@gmail.com', // This needs to be verified in SendGrid
    subject: 'Simple Test from SendGrid',
    text: 'This is a simple test email.',
    html: '<p>This is a simple test email.</p>'
  };

  try {
    console.log('📧 Sending simple test email...');
    const response = await sgMail.send(msg);
    console.log('✅ SUCCESS! Email sent');
    console.log('Response:', response[0].statusCode);
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    console.error('Full error:', error.response?.body);
    
    if (error.message === 'Forbidden') {
      console.log('\n🔧 SOLUTION:');
      console.log('1. Go to SendGrid dashboard');
      console.log('2. Settings → Sender Authentication');
      console.log('3. Verify mailcountrysidesteakhouse@gmail.com');
      console.log('4. Check Gmail for verification email');
    }
  }
}

testSimple();
