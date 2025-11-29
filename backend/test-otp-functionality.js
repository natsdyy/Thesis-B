/**
 * Test script for OTP functionality
 * This script demonstrates the complete OTP password recovery flow
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/auth';

// Test email (replace with a real email for actual testing)
const TEST_EMAIL = 'test@example.com';
const TEST_OTP = '123456'; // This would be the actual OTP sent via email
const NEW_PASSWORD = 'newpassword123';

async function testOTPFlow() {
  console.log('🧪 Testing OTP Password Recovery Flow\n');

  try {
    // Step 1: Send OTP
    console.log('1️⃣ Sending OTP...');
    try {
      const sendOTPResponse = await axios.post(`${BASE_URL}/send-otp`, {
        email: TEST_EMAIL
      });
      console.log('✅ Send OTP Response:', sendOTPResponse.data);
    } catch (error) {
      console.log('❌ Send OTP Error:', error.response?.data || error.message);
    }
    console.log('');

    // Step 2: Get OTP Statistics
    console.log('2️⃣ Getting OTP Statistics...');
    try {
      const statsResponse = await axios.get(`${BASE_URL}/otp-stats`);
      console.log('✅ OTP Stats Response:', statsResponse.data);
    } catch (error) {
      console.log('❌ OTP Stats Error:', error.response?.data || error.message);
    }
    console.log('');

    // Step 3: Verify OTP (this would fail with test OTP, but shows the flow)
    console.log('3️⃣ Verifying OTP...');
    try {
      const verifyOTPResponse = await axios.post(`${BASE_URL}/verify-otp`, {
        email: TEST_EMAIL,
        otp_code: TEST_OTP
      });
      console.log('✅ Verify OTP Response:', verifyOTPResponse.data);
    } catch (error) {
      console.log('❌ Verify OTP Error (expected with test OTP):', error.response?.data || error.message);
    }
    console.log('');

    // Step 4: Reset Password with OTP (this would also fail with test OTP)
    console.log('4️⃣ Resetting Password with OTP...');
    try {
      const resetPasswordResponse = await axios.post(`${BASE_URL}/reset-password-with-otp`, {
        email: TEST_EMAIL,
        otp_code: TEST_OTP,
        new_password: NEW_PASSWORD
      });
      console.log('✅ Reset Password Response:', resetPasswordResponse.data);
    } catch (error) {
      console.log('❌ Reset Password Error (expected with test OTP):', error.response?.data || error.message);
    }
    console.log('');

    // Step 5: Cleanup expired OTPs
    console.log('5️⃣ Cleaning up expired OTPs...');
    try {
      const cleanupResponse = await axios.post(`${BASE_URL}/cleanup-otp`);
      console.log('✅ Cleanup Response:', cleanupResponse.data);
    } catch (error) {
      console.log('❌ Cleanup Error:', error.response?.data || error.message);
    }
    console.log('');

    console.log('🎉 OTP functionality test completed!');
    console.log('\n📋 Available OTP Endpoints:');
    console.log('   POST /api/auth/send-otp - Send OTP to email');
    console.log('   POST /api/auth/verify-otp - Verify OTP code');
    console.log('   POST /api/auth/reset-password-with-otp - Reset password with OTP');
    console.log('   GET  /api/auth/otp-stats - Get OTP statistics');
    console.log('   POST /api/auth/cleanup-otp - Clean up expired OTPs');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testOTPFlow();
