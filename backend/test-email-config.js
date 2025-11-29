#!/usr/bin/env node

/**
 * Email Configuration Test Script
 * This script helps you test and verify your email configuration
 */

require('dotenv').config();

console.log('🔍 Email Configuration Test\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT || 'undefined');
console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅ SET' : '❌ NOT SET');
console.log('SMTP_USER:', process.env.SMTP_USER || '❌ NOT SET');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✅ SET' : '❌ NOT SET');
console.log('SMTP_HOST:', process.env.SMTP_HOST || '❌ NOT SET');
console.log('SMTP_PORT:', process.env.SMTP_PORT || '❌ NOT SET');
console.log('');

// Check SendGrid configuration
if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'your-sendgrid-api-key-here') {
  console.log('✅ SendGrid: API key is configured');
} else {
  console.log('❌ SendGrid: API key is missing or not configured');
}

// Check SMTP configuration
const hasSMTPUser = process.env.SMTP_USER && process.env.SMTP_USER !== 'your-gmail-email-here';
const hasSMTPPass = process.env.SMTP_PASS && process.env.SMTP_PASS !== 'your-gmail-app-password-here';

if (hasSMTPUser && hasSMTPPass) {
  console.log('✅ SMTP: Configuration is complete');
} else {
  console.log('❌ SMTP: Configuration is incomplete');
  if (!hasSMTPUser) console.log('   - SMTP_USER is missing or not configured');
  if (!hasSMTPPass) console.log('   - SMTP_PASS is missing or not configured');
}

console.log('');

// Recommendations
console.log('💡 Recommendations:');
if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === 'your-sendgrid-api-key-here') {
  console.log('1. Set up SendGrid API key in Railway environment variables');
  console.log('   - Get API key from: https://app.sendgrid.com/settings/api_keys');
  console.log('   - Add to Railway: SENDGRID_API_KEY=your-actual-key');
}

if (!hasSMTPUser || !hasSMTPPass) {
  console.log('2. Set up Gmail SMTP in Railway environment variables');
  console.log('   - Generate Gmail app password: https://myaccount.google.com/apppasswords');
  console.log('   - Add to Railway:');
  console.log('     SMTP_USER=mailcountrysidesteakhouse@gmail.com');
  console.log('     SMTP_PASS=your-16-character-app-password');
  console.log('     SMTP_HOST=smtp.gmail.com');
  console.log('     SMTP_PORT=587');
  console.log('     SMTP_SECURE=false');
}

console.log('');
console.log('📖 For detailed instructions, see: RAILWAY_EMAIL_FIX_GUIDE.md');
