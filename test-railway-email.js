/**
 * Test Railway Email Configuration
 * This script tests if the email service is working on Railway
 */

const https = require('https');

// Test the Railway deployment
const testRailwayEmail = () => {
  console.log('🧪 Testing Railway Email Configuration...\n');

  const postData = JSON.stringify({
    email: 'test@example.com'
  });

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

  const req = https.request(options, (res) => {
    console.log(`✅ Status Code: ${res.statusCode}`);
    console.log(`📋 Headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('📧 Response Body:', data);
      
      try {
        const response = JSON.parse(data);
        if (response.success) {
          console.log('🎉 Email service is working on Railway!');
        } else {
          console.log('❌ Email service error:', response.message);
        }
      } catch (error) {
        console.log('❌ Failed to parse response:', error.message);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
  });

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
      console.log('\n' + '='.repeat(50) + '\n');
      testRailwayEmail();
    });
  });

  req.on('error', (error) => {
    console.error('❌ Health check failed:', error.message);
    console.log('\n' + '='.repeat(50) + '\n');
    testRailwayEmail();
  });

  req.end();
};

// Run tests
testHealth();
