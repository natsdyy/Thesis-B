# 🚀 Quick Local Telegram Bot Setup

## ⚡ **5-Minute Setup for Local Development**

### **Step 1: Get Your Bot Token**
1. Open Telegram
2. Search for `@BotFather`
3. Send `/newbot`
4. Choose name: "Countryside Feedback Bot"
5. Choose username: "PNCountryside_BOT"
6. **Copy the bot token** (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### **Step 2: Add Bot to Group**
1. Open @PNCountryside_Feedbacks group
2. Add your bot as admin
3. Give it permission to send messages

### **Step 3: Create .env File**
Create `backend/.env` file with:

```env
# Your existing database config...
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Add these lines:
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=@PNCountryside_Feedbacks
```

**⚠️ Replace the token with your actual bot token!**

### **Step 4: Test Setup**
```bash
cd backend
npm run setup:telegram    # Check your .env configuration
npm run test:telegram     # Test the bot
```

### **Step 5: Restart & Test**
1. Restart your backend server
2. Submit feedback form on website
3. Check @PNCountryside_Feedbacks group

## 🔍 **Troubleshooting**

### **Bot Not Working?**
- ✅ Check `.env` file exists in `backend/` folder
- ✅ Verify bot token is correct (no spaces, no quotes)
- ✅ Ensure bot is admin in the group
- ✅ Restart server after changing `.env`

### **Common Issues**
- **"Token not configured"** → Add TELEGRAM_BOT_TOKEN to .env
- **"Bot not in group"** → Add bot to @PNCountryside_Feedbacks
- **"Permission denied"** → Make bot admin in group

## 📱 **Test Commands**

```bash
# Check your setup
npm run setup:telegram

# Test bot connection
npm run test:telegram

# Check health endpoint
curl http://localhost:5000/api/feedback/health
```

## 🎯 **Expected Result**

After setup, when you submit feedback:
1. ✅ Form submits successfully
2. ✅ Message appears in @PNCountryside_Feedbacks
3. ✅ Server logs show "Feedback sent to Telegram successfully"

## 🆘 **Need Help?**

Run the setup checker:
```bash
npm run setup:telegram
```

This will tell you exactly what's missing!
