# 🚨 URGENT: Railway Email Fix

## Current Issues (from your logs)
- ❌ **SendGrid**: `Unauthorized` - API key not set in Railway
- ❌ **SMTP**: `queryA EBADNAME smtp.gmail.com` - DNS resolution issues

## 🔧 IMMEDIATE FIX (Choose ONE method)

### Method 1: SendGrid Only (Easiest)
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click on your "Thesis-B" service
3. Go to "Variables" tab
4. Add these variables:
   ```
   SENDGRID_API_KEY=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
   NODE_ENV=production
   RAILWAY_ENVIRONMENT=production
   FRONTEND_URL=https://countryside-steakhouse.site
   ```
5. Click "Deploy" to redeploy your service

### Method 2: Gmail SMTP Only
1. Generate Gmail App Password:
   - Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
   - Generate new password for "Mail"
   - Copy the 16-character password
2. In Railway Dashboard → Variables tab, add:
   ```
   SMTP_USER=mailcountrysidesteakhouse@gmail.com
   SMTP_PASS=your-16-character-app-password
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   NODE_ENV=production
   RAILWAY_ENVIRONMENT=production
   FRONTEND_URL=https://countryside-steakhouse.site
   ```
3. Click "Deploy" to redeploy

### Method 3: Both (Recommended)
Add ALL variables from both methods above.

## 🚀 After Setup
1. **Redeploy** your Railway service
2. **Test** email functionality
3. **Check logs** for success messages:
   - `✅ SendGrid email sent successfully`
   - `✅ SMTP email sent (Railway-optimized)`

## 🔍 Troubleshooting
- **Still getting "Unauthorized"**: Check SendGrid API key is correct
- **Still getting DNS errors**: Try Method 1 (SendGrid only)
- **No emails at all**: Check all environment variables are set

## 📞 Quick Commands (if using Railway CLI)
```bash
# SendGrid only
railway variables set SENDGRID_API_KEY=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
railway variables set NODE_ENV=production
railway variables set RAILWAY_ENVIRONMENT=production
railway variables set FRONTEND_URL=https://countryside-steakhouse.site
```

**This should fix your email issues immediately!** 🎯
