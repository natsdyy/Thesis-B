/**
 * Debug Railway Environment Variables
 * Run this in Railway to see what environment variables are actually available
 */

console.log('🔍 DEBUGGING RAILWAY ENVIRONMENT VARIABLES');
console.log('==========================================\n');

// Check all environment variables
console.log('All Environment Variables:');
Object.keys(process.env).forEach(key => {
  if (key.includes('SMTP') || key.includes('SENDGRID') || key.includes('RAILWAY') || key.includes('NODE')) {
    const value = process.env[key];
    if (value && value.length > 10) {
      console.log(`${key}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`${key}: ${value}`);
    }
  }
});

console.log('\n' + '='.repeat(50) + '\n');

// Test the exact logic from emailService.js
const hasValidEmailConfig = () => {
  const hasSendGrid = process.env.SENDGRID_API_KEY && 
    process.env.SENDGRID_API_KEY !== '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' &&
    process.env.SENDGRID_API_KEY !== 'your-sendgrid-api-key-here' &&
    process.env.SENDGRID_API_KEY.length > 20;
  
  const hasSMTP = process.env.SMTP_PASS && 
    process.env.SMTP_PASS !== 'sclg quvi fuyh dcfa' &&
    process.env.SMTP_PASS !== 'your-gmail-app-password' &&
    process.env.SMTP_PASS.length > 10;
  
  console.log('Email Config Analysis:');
  console.log('SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY);
  console.log('SENDGRID_API_KEY length:', process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.length : 0);
  console.log('SENDGRID_API_KEY starts with SG:', process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.startsWith('SG.') : false);
  console.log('hasSendGrid:', hasSendGrid);
  
  console.log('\nSMTP_PASS exists:', !!process.env.SMTP_PASS);
  console.log('SMTP_PASS length:', process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0);
  console.log('hasSMTP:', hasSMTP);
  
  console.log('\nFinal result:', hasSendGrid || hasSMTP);
  
  return hasSendGrid || hasSMTP;
};

const isValid = hasValidEmailConfig();

if (isValid) {
  console.log('\n✅ Email configuration is VALID!');
} else {
  console.log('\n❌ Email configuration is INVALID!');
  console.log('\nPossible issues:');
  console.log('1. Environment variables not set in Railway');
  console.log('2. Environment variables have wrong values');
  console.log('3. Environment variables not being loaded by the application');
}
