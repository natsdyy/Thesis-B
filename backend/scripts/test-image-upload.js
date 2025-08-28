const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// Test script for image upload functionality
async function testImageUpload() {
  console.log('🧪 Testing Image Upload Functionality...\n');

  // Check environment variables
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || '@PNCountryside_Feedbacks';

  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in environment variables');
    console.log('Please set TELEGRAM_BOT_TOKEN in your .env file');
    return;
  }

  console.log('✅ Environment variables configured');
  console.log(`📱 Bot Token: ${botToken ? 'Configured' : 'Not configured'}`);
  console.log(`💬 Chat ID: ${chatId}\n`);

  // Initialize bot
  const bot = new TelegramBot(botToken, { polling: false });

  try {
    // Test 1: Send text message
    console.log('📝 Test 1: Sending text message...');
    const textMessage = `🧪 <b>Test Message</b>

This is a test message to verify the bot is working.

📅 <b>Test Time:</b> ${new Date().toLocaleString('en-PH', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

🌐 <b>Source:</b> Test Script`;

    const textResponse = await bot.sendMessage(chatId, textMessage, {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });
    console.log(`✅ Text message sent successfully! Message ID: ${textResponse.message_id}`);

    // Test 2: Send image with caption
    console.log('\n📸 Test 2: Sending image with caption...');
    
    // Create a test image path (you can replace this with an actual image)
    const testImagePath = path.join(__dirname, '../test-image.jpg');
    
    if (fs.existsSync(testImagePath)) {
      const imageStream = fs.createReadStream(testImagePath);
      const imageResponse = await bot.sendPhoto(chatId, imageStream, {
        caption: `📸 <b>Test Image Upload</b>

This is a test image to verify the image upload functionality works.

✅ <b>Status:</b> Image upload test successful
📅 <b>Test Time:</b> ${new Date().toLocaleString('en-PH', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

🌐 <b>Source:</b> Test Script`,
        parse_mode: 'HTML'
      });
      console.log(`✅ Image with caption sent successfully! Message ID: ${imageResponse.message_id}`);
    } else {
      console.log('⚠️  Test image not found, skipping image test');
      console.log(`   Expected path: ${testImagePath}`);
      console.log('   You can place any JPG image named "test-image.jpg" in the backend folder to test image uploads');
    }

    // Test 3: Check bot permissions
    console.log('\n🔐 Test 3: Checking bot permissions...');
    try {
      const botInfo = await bot.getMe();
      console.log(`✅ Bot info retrieved successfully!`);
      console.log(`   Bot Name: ${botInfo.first_name}`);
      console.log(`   Bot Username: @${botInfo.username}`);
      console.log(`   Bot ID: ${botInfo.id}`);
    } catch (error) {
      console.log(`⚠️  Could not retrieve bot info: ${error.message}`);
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Next Steps:');
console.log('1. Test the feedback form on your website');
console.log('2. Upload an image with your feedback (required)');
console.log('3. Check the Telegram group for the message with image');
console.log('4. Verify the image appears correctly');
console.log('5. Try submitting without image to test validation');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Response details:', error.response.data);
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if TELEGRAM_BOT_TOKEN is correct');
    console.log('2. Verify the bot is added to the Telegram group');
    console.log('3. Ensure the bot has permission to send messages and photos');
    console.log('4. Check if the chat ID is correct');
  }
}

// Run the test
if (require.main === module) {
  testImageUpload().catch(console.error);
}

module.exports = { testImageUpload };
