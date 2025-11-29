/**
 * Test Email Service After Railway Fix
 * This script tests if the email service is working after SendGrid setup
 */

const https = require('https');

// Test the Railway deployment email functionality
const testRailwayEmail = () => {
  console.log('🧪 Testing Railway Email Service After Fix...\n');

  const testData = {
    email: 'test@example.com',
    name: 'Test User'
  };

  const postData = JSON.stringify(testData);

  const options = {
    hostname: 'countryside-steakhouse.site',
    port: 443,
    path: '/api/auth/send-otp',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    // Ignore SSL certificate issues for testing
    rejectUnauthorized: false
  };

  console.log('📧 Testing OTP email endpoint...');
  console.log('URL:', `https://${options.hostname}${options.path}`);
  console.log('Data:', testData);
  console.log('');

  const req = https.request(options, (res) => {
    console.log(`✅ Status Code: ${res.statusCode}`);
    console.log(`📋 Response Headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('📧 Response Body:', data);
      console.log('');
      
      try {
        const response = JSON.parse(data);
        if (response.success) {
          console.log('🎉 EMAIL SERVICE IS WORKING!');
          console.log('✅ SendGrid configuration successful');
          console.log('✅ Railway email fix completed');
        } else {
          console.log('❌ Email service error:', response.message);
          console.log('💡 Check Railway logs: railway logs --tail');
        }
      } catch (error) {
        console.log('❌ Failed to parse response:', error.message);
        console.log('💡 Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
    console.log('💡 Check if the service is deployed and accessible');
  });

  req.on('timeout', () => {
    console.log('⏰ Request timed out - this might indicate email processing delays');
    req.destroy();
  });

  req.setTimeout(30000); // 30 second timeout
  req.write(postData);
  req.end();
};

// Test health endpoint first
const testHealth = () => {
  console.log('🏥 Testing Railway Health Endpoint...\n');

  const options = {
    hostname: 'countryside-steakhouse.site',
    port: 443,
    path: '/api/health',
    method: 'GET',
    rejectUnauthorized: false
  };

  const req = https.request(options, (res) => {
    console.log(`✅ Health Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('📋 Health Response:', data);
      console.log('\n' + '='.repeat(60) + '\n');
      testRailwayEmail();
    });
  });

  req.on('error', (error) => {
    console.error('❌ Health check failed:', error.message);
    console.log('💡 Service might be down or not accessible');
    console.log('\n' + '='.repeat(60) + '\n');
    testRailwayEmail(); // Still try email test
  });

  req.setTimeout(15000); // 15 second timeout
  req.end();
};

// Test feedback reply endpoint
const testFeedbackReply = () => {
  console.log('\n📝 Testing Feedback Reply Email...\n');

  const testData = {
    message: 'Thank you for your feedback! We appreciate your input.',
    internal_note: 'Test reply from automated test'
  };

  const postData = JSON.stringify(testData);

  const options = {
    hostname: 'countryside-steakhouse.site',
    port: 443,
    path: '/api/feedback/1/reply', // Assuming feedback ID 1 exists
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    rejectUnauthorized: false
  };

  console.log('📧 Testing feedback reply endpoint...');
  console.log('URL:', `https://${options.hostname}${options.path}`);
  console.log('');

  const req = https.request(options, (res) => {
    console.log(`✅ Status Code: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('📧 Response:', data);
      
      try {
        const response = JSON.parse(data);
        if (response.success) {
          console.log('🎉 FEEDBACK REPLY EMAIL WORKING!');
        } else if (res.statusCode === 404) {
          console.log('ℹ️  No feedback with ID 1 found (expected if database is empty)');
        } else {
          console.log('❌ Feedback reply error:', response.message);
        }
      } catch (error) {
        console.log('ℹ️  Response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Feedback reply test failed:', error.message);
  });

  req.setTimeout(30000);
  req.write(postData);
  req.end();
};

// Main test function
const runTests = () => {
  console.log('🚂 RAILWAY EMAIL SERVICE TEST SUITE');
  console.log('====================================');
  console.log('');
  console.log('This script tests if your Railway email fix is working.');
  console.log('Expected results after SendGrid setup:');
  console.log('- ✅ SendGrid initialization messages in logs');
  console.log('- ✅ Email endpoints responding successfully');
  console.log('- ✅ No SMTP timeout errors');
  console.log('');

  testHealth();

  // Run feedback test after a delay
  setTimeout(() => {
    testFeedbackReply();
  }, 5000);
};

// Run the tests
runTests();
