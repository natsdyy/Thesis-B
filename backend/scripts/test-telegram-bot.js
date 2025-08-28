require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Test Telegram bot functionality
async function testTelegramBot() {
  console.log('🧪 Testing Telegram Bot Integration...\n');

  // Check environment variables
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || '@PNCountryside_Feedbacks';

  console.log('📋 Configuration Check:');
  console.log(`Bot Token: ${botToken ? '✅ Configured' : '❌ Missing'}`);
  console.log(`Chat ID: ${chatId}\n`);

  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN is required in environment variables');
    console.log('Please add it to your .env file and try again.');
    return;
  }

  try {
    // Initialize bot
    const bot = new TelegramBot(botToken, { polling: false });
    console.log('🤖 Bot initialized successfully');

    // Test message
    const testMessage = `🧪 <b>Test Message from Countryside Feedback System</b>

This is a test message to verify the Telegram bot integration is working correctly.

📅 <b>Test Time:</b> ${new Date().toLocaleString('en-PH', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
})}

✅ If you see this message, the bot is working!`;

    console.log('📤 Sending test message...');
    
    const response = await bot.sendMessage(chatId, testMessage, {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    console.log('✅ Test message sent successfully!');
    console.log(`Message ID: ${response.message_id}`);
    console.log(`Chat ID: ${response.chat.id}`);
    console.log(`Chat Type: ${response.chat.type}`);
    console.log(`Chat Title: ${response.chat.title || 'Private Chat'}`);

    console.log('\n🎉 Telegram Bot Integration Test PASSED!');
    console.log('Your feedback system is ready to send messages to the group.');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    
    if (error.code === 'ETELEGRAM') {
      console.log('\n🔍 Common Telegram Bot Issues:');
      console.log('1. Bot token is invalid');
      console.log('2. Bot is not added to the group');
      console.log('3. Bot lacks permission to send messages');
      console.log('4. Group chat ID is incorrect');
      console.log('5. Bot is blocked or banned');
    }
    
    console.log('\n📖 Please check the setup guide for troubleshooting steps.');
  }
}

// Run the test
testTelegramBot().catch(console.error);
