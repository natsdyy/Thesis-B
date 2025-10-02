/**
 * Test Railway Environment Variables
 * This script tests if environment variables are being read correctly
 */

console.log('🔍 Testing Railway Environment Variables...\n');

console.log('Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? `${process.env.SENDGRID_API_KEY.substring(0, 10)}...` : 'undefined');
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS:', process.env.SMTP_PASS ? `${process.env.SMTP_PASS.substring(0, 5)}...` : 'undefined');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_SECURE:', process.env.SMTP_SECURE);

// Test email configuration logic
const hasValidEmailConfig = () => {
  const hasSendGrid = process.env.SENDGRID_API_KEY && 
    process.env.SENDGRID_API_KEY !== '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' &&
    process.env.SENDGRID_API_KEY !== 'your-sendgrid-api-key-here' &&
    process.env.SENDGRID_API_KEY.length > 20;
  
  const hasSMTP = process.env.SMTP_PASS && 
    process.env.SMTP_PASS !== 'sclg quvi fuyh dcfa' &&
    process.env.SMTP_PASS !== 'your-gmail-app-password' &&
    process.env.SMTP_PASS.length > 10;
  
  console.log('\nEmail Config Check:');
  console.log('hasSendGrid:', hasSendGrid);
  console.log('hasSMTP:', hasSMTP);
  console.log('hasValidEmailConfig:', hasSendGrid || hasSMTP);
  
  return hasSendGrid || hasSMTP;
};

const isValid = hasValidEmailConfig();

if (isValid) {
  console.log('\n✅ Email configuration is valid!');
} else {
  console.log('\n❌ Email configuration is invalid!');
  console.log('Make sure to set either SENDGRID_API_KEY or SMTP_PASS in Railway environment variables.');
}
