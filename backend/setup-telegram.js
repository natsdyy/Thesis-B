const fs = require('fs');
const path = require('path');

console.log('🔧 Telegram Bot Setup for Local Development\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('✅ .env file already exists');
  
  // Read existing .env file
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  if (envContent.includes('TELEGRAM_BOT_TOKEN=')) {
    console.log('✅ TELEGRAM_BOT_TOKEN is configured');
    
    // Check if it's the default value
    if (envContent.includes('your_bot_token_here')) {
      console.log('⚠️  But it still has the default value. Please update it with your actual bot token.');
    } else {
      console.log('🎉 Your Telegram bot should be working!');
      console.log('Try submitting a feedback form to test it.');
    }
  } else {
    console.log('❌ TELEGRAM_BOT_TOKEN is missing from .env file');
  }
} else {
  console.log('❌ .env file not found');
}

console.log('\n📋 To set up your Telegram bot locally:');
console.log('\n1. Create a .env file in the backend directory with:');
console.log('   TELEGRAM_BOT_TOKEN=your_actual_bot_token_here');
console.log('   TELEGRAM_CHAT_ID=@PNCountryside_Feedbacks');
console.log('\n2. Replace "your_actual_bot_token_here" with the token from @BotFather');
console.log('\n3. Restart your backend server');
console.log('\n4. Test with: npm run test:telegram');

console.log('\n🔍 Current .env file status:');
console.log(`File exists: ${envExists ? 'Yes' : 'No'}`);

if (envExists) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasToken = envContent.includes('TELEGRAM_BOT_TOKEN=');
  const hasDefaultValue = envContent.includes('your_bot_token_here');
  
  console.log(`Has TELEGRAM_BOT_TOKEN: ${hasToken ? 'Yes' : 'No'}`);
  console.log(`Has default value: ${hasDefaultValue ? 'Yes' : 'No'}`);
  
  if (hasToken && !hasDefaultValue) {
    console.log('\n🎉 Your .env file looks properly configured!');
    console.log('Try restarting your server and testing the feedback form.');
  }
}
