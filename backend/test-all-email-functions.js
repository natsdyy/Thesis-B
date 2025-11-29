/**
 * Test All Email Functions
 * This script tests all email functions to ensure they work properly with SendGrid and SMTP fallback
 */

const EmailService = require('./services/emailService');

console.log('🧪 Testing All Email Functions...\n');

// Test data
const testData = {
  email: 'test@example.com',
  name: 'Test User',
  otpCode: '123456',
  resetToken: 'test-reset-token-123',
  password: 'TempPass123!',
  employeeName: 'John Doe',
  subject: 'Test Notification',
  message: 'This is a test notification message.'
};

// Test functions
const testFunctions = [
  {
    name: 'sendOTPEmail',
    fn: () => EmailService.sendOTPEmail(testData.email, testData.otpCode, testData.name),
    description: 'OTP Email for password recovery'
  },
  {
    name: 'sendPasswordRecoveryEmail',
    fn: () => EmailService.sendPasswordRecoveryEmail(testData.email, testData.resetToken, testData.name),
    description: 'Password recovery email'
  },
  {
    name: 'sendWelcomeEmail',
    fn: () => EmailService.sendWelcomeEmail(testData.email, testData.name, testData.password),
    description: 'Welcome email with temporary password'
  },
  {
    name: 'sendEmployeeWelcomeEmail',
    fn: () => EmailService.sendEmployeeWelcomeEmail(testData.email, testData.employeeName, testData.email, testData.password),
    description: 'Employee welcome email with credentials'
  },
  {
    name: 'sendNotificationEmail',
    fn: () => EmailService.sendNotificationEmail(testData.email, testData.subject, testData.message),
    description: 'General notification email'
  },
  {
    name: 'sendFeedbackReplyEmail',
    fn: () => EmailService.sendFeedbackReplyEmail(testData.email, testData.name, 'This is test feedback', 'Thank you for your feedback!', 5),
    description: 'Feedback reply email'
  }
];

// Run tests
const runTests = async () => {
  console.log('📧 Email Service Status Check:');
  console.log('================================');
  console.log(`Email Service Ready: ${EmailService.isEmailServiceReady()}`);
  console.log('');

  let passedTests = 0;
  let failedTests = 0;

  for (const test of testFunctions) {
    console.log(`🧪 Testing ${test.name}...`);
    console.log(`📝 Description: ${test.description}`);
    console.log(`📧 Sending to: ${testData.email}`);
    console.log('');

    try {
      const startTime = Date.now();
      const result = await test.fn();
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (result.success) {
        console.log(`✅ ${test.name} - SUCCESS`);
        console.log(`📧 Message ID: ${result.messageId}`);
        console.log(`⏱️  Duration: ${duration}ms`);
        passedTests++;
      } else {
        console.log(`❌ ${test.name} - FAILED`);
        console.log(`❌ Error: ${result.error}`);
        failedTests++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} - ERROR`);
      console.log(`❌ Exception: ${error.message}`);
      failedTests++;
    }

    console.log('');
    console.log('-'.repeat(60));
    console.log('');

    // Add delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('📊 TEST SUMMARY');
  console.log('===============');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📧 Total Tests: ${testFunctions.length}`);
  console.log(`📈 Success Rate: ${((passedTests / testFunctions.length) * 100).toFixed(1)}%`);
  console.log('');

  if (passedTests === testFunctions.length) {
    console.log('🎉 ALL EMAIL FUNCTIONS ARE WORKING PERFECTLY!');
    console.log('✅ SendGrid/SMTP configuration is correct');
    console.log('✅ All email types will work on Railway');
    console.log('✅ Feedback replies, password recovery, and employee welcome emails will all work');
  } else if (passedTests > 0) {
    console.log('⚠️  SOME EMAIL FUNCTIONS ARE WORKING');
    console.log('✅ Basic email functionality is operational');
    console.log('💡 Check failed functions for specific issues');
  } else {
    console.log('❌ ALL EMAIL FUNCTIONS FAILED');
    console.log('💡 Check SendGrid API key and SMTP configuration');
    console.log('💡 Verify Railway environment variables');
  }

  console.log('');
  console.log('🔧 TROUBLESHOOTING TIPS:');
  console.log('- Check Railway logs for detailed error messages');
  console.log('- Verify SendGrid API key has "Full Access" permissions');
  console.log('- Ensure SMTP credentials are correct (if using fallback)');
  console.log('- Check that Railway environment variables are set');
};

// Run the tests
runTests().catch(error => {
  console.error('❌ Test suite failed:', error.message);
  process.exit(1);
});
