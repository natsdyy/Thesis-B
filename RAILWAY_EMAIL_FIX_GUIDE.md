# Railway Email Service Fix Guide

## Current Issues
- ❌ SendGrid: "Forbidden" error (API key missing/invalid)
- ❌ SMTP: "Connection timeout" (configuration missing)

## Solution Steps

### 1. Set Up SendGrid (Recommended)

1. **Get SendGrid API Key:**
   - Go to [SendGrid Dashboard](https://app.sendgrid.com/settings/api_keys)
   - Create a new API key with "Full Access" permissions
   - Copy the API key

2. **Add to Railway Environment Variables:**
   ```bash
   # In Railway Dashboard or CLI:
   SENDGRID_API_KEY=your-sendgrid-api-key-here
   ```

### 2. Alternative: Fix Gmail SMTP

1. **Generate Gmail App Password:**
   - Go to [Google Account Settings](https://myaccount.google.com/apppasswords)
   - Generate a new app password for "Mail"
   - Use this password instead of your regular Gmail password

2. **Add to Railway Environment Variables:**
   ```bash
   # In Railway Dashboard or CLI:
   SMTP_USER=mailcountrysidesteakhouse@gmail.com
   SMTP_PASS=your-16-character-app-password
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   ```

### 3. Required Railway Environment Variables

Add these to your Railway project:

```bash
# Basic Configuration
NODE_ENV=production
RAILWAY_ENVIRONMENT=production
PORT=5000

# Database (if not auto-configured)
DATABASE_URL=your-postgresql-connection-string

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# CORS
CORS_ORIGIN=https://your-frontend-domain.railway.app

# Frontend URL
FRONTEND_URL=https://your-frontend-domain.railway.app

# Email (Choose ONE method)
# Method 1: SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key

# Method 2: Gmail SMTP
SMTP_USER=mailcountrysidesteakhouse@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
```

### 4. How to Add Environment Variables in Railway

**Option A: Railway Dashboard**
1. Go to your Railway project
2. Click on your backend service
3. Go to "Variables" tab
4. Add each variable with its value

**Option B: Railway CLI**
```bash
railway variables set SENDGRID_API_KEY=your-key-here
railway variables set NODE_ENV=production
railway variables set RAILWAY_ENVIRONMENT=production
# ... add other variables
```

### 5. Test Email Service

After setting up the environment variables, restart your Railway service and test the email functionality.

## Quick Fix Commands

If you want to use Gmail SMTP immediately:

```bash
# Set Gmail SMTP variables in Railway
railway variables set SMTP_USER=mailcountrysidesteakhouse@gmail.com
railway variables set SMTP_PASS=your-gmail-app-password
railway variables set SMTP_HOST=smtp.gmail.com
railway variables set SMTP_PORT=587
railway variables set SMTP_SECURE=false
railway variables set NODE_ENV=production
railway variables set RAILWAY_ENVIRONMENT=production
```

## Troubleshooting

- **SendGrid Forbidden**: Check API key is correct and has proper permissions
- **SMTP Timeout**: Verify Gmail app password and enable 2FA
- **Connection Issues**: Ensure Railway can access external SMTP servers
- **Environment Variables**: Make sure they're set in Railway, not just locally

## Next Steps

1. Choose either SendGrid or Gmail SMTP
2. Set up the required environment variables in Railway
3. Redeploy your service
4. Test email functionality
