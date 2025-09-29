# 🚂 Railway Environment Variables Setup Guide

## Current Problem
Your Railway deployment is still using SMTP (blocked) instead of SendGrid because environment variables are not set.

## Step-by-Step Fix

### 1. Go to Railway Dashboard
- Visit: https://railway.app
- Login to your account
- Find your backend service (thesis-b-backend)

### 2. Access Variables Section
- Click on your backend service
- Look for "Variables" tab (usually near "Deployments", "Settings")
- Click on "Variables"

### 3. Add First Variable
- Click "New Variable" or "+" button
- **Name**: `SENDGRID_API_KEY`
- **Value**: `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`
- Click "Save" or "Add"

### 4. Add Second Variable
- Click "New Variable" again
- **Name**: `RAILWAY_ENVIRONMENT`
- **Value**: `production`
- Click "Save" or "Add"

### 5. Deploy
- Railway will automatically redeploy
- Wait 1-2 minutes for deployment to complete

## Expected Result

### Before (Current - Wrong):
```
📧 Using primary transporter (port 587 STARTTLS)
❌ Primary transporter failed: Connection timeout
```

### After (Fixed - Correct):
```
📧 SendGrid initialized for Railway deployment
📧 Using SendGrid for Railway deployment
✅ SendGrid email sent successfully
```

## Verification Steps

1. **Check Railway Logs**:
   - Go to your service → Deployments
   - Click on latest deployment
   - Look for SendGrid messages

2. **Test Email**:
   - Go to your live site
   - Try replying to feedback
   - Should work without errors

## Troubleshooting

### Still seeing SMTP errors?
- Double-check variable names are EXACT: `SENDGRID_API_KEY` and `RAILWAY_ENVIRONMENT`
- Make sure values are correct (no extra spaces)
- Wait for full redeployment (1-2 minutes)

### Variables not showing?
- Refresh the Railway dashboard
- Check if you're in the right service
- Try logging out and back in

## Quick Test

After setup, test by:
1. Going to your live site
2. CRM → Feedback Management
3. Click "Reply" on any feedback
4. Send a test reply
5. Check if it works without timeout errors

---

**This is the ONLY thing preventing your email from working!** 🎯

