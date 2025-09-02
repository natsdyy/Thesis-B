# Telegram Bot Setup Guide

This guide will help you set up the Telegram bot integration for the Countryside Steakhouse feedback system.

## Prerequisites

1. A Telegram account
2. Access to create a bot via @BotFather
3. Access to the @PNCountryside_Feedbacks group

## Step 1: Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Start a chat with BotFather
3. Send `/newbot` command
4. Follow the instructions to create your bot:
   - Choose a name for your bot (e.g., "Countryside Feedback Bot")
   - Choose a username (e.g., "PNCountryside_BOT")
5. BotFather will provide you with a **Bot Token** - save this securely

## Step 2: Add Bot to Feedback Group

1. Open the @PNCountryside_Feedbacks group
2. Add your bot as an administrator
3. Make sure the bot has permission to send messages

## Step 3: Get Group Chat ID

1. Send a message to the group
2. Access this URL in your browser (replace with your bot token):
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
3. Look for the `chat` object and note the `id` value
4. For public groups, the ID will be negative (e.g., -1001234567890)

## Step 4: Configure Environment Variables

Create a `.env` file in your backend directory with these variables:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=@PNCountryside_Feedbacks

# Other required variables...
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here
```

## Step 5: Install Dependencies

In your backend directory, run:

```bash
npm install
```

This will install the `node-telegram-bot-api` package.

## Step 6: Test the Integration

1. Start your backend server
2. Submit a feedback form from the frontend
3. Check the @PNCountryside_Feedbacks group for the message
4. Check your server logs for any errors

## Step 7: Health Check

You can test if the bot is working by calling:

```
GET /api/feedback/health
```

This will show you the status of your Telegram bot configuration.

## Troubleshooting

### Bot Not Sending Messages

1. Check if the bot token is correct
2. Verify the bot is added to the group
3. Ensure the bot has admin permissions
4. Check server logs for error messages

### Group Not Receiving Messages

1. Verify the chat ID is correct
2. Make sure the bot is an admin in the group
3. Check if the group allows bot messages

### Environment Variables Not Loading

1. Ensure the `.env` file is in the correct location
2. Restart your server after making changes
3. Check if `dotenv` is properly configured

## Security Notes

- Never commit your `.env` file to version control
- Keep your bot token secure
- Consider using environment-specific configurations for production
- Monitor bot usage to prevent abuse

## API Endpoints

- `POST /api/feedback` - Submit customer feedback
- `GET /api/feedback/health` - Check service health

## Message Format

The bot will send formatted messages to the group with:
- Customer name and contact information
- Rating (if provided)
- Feedback message
- Timestamp
- Source information

## Support

If you encounter issues:
1. Check the server logs
2. Verify your Telegram bot configuration
3. Test the health endpoint
4. Ensure all environment variables are set correctly
