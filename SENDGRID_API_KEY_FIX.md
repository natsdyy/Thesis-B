# SendGrid API Key Fix - 401 Unauthorized Error

## Problem Identified

The SendGrid API key `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` is returning a 401 Unauthorized error, which means:

1. **API Key is Invalid/Expired**: The key may have been revoked or expired
2. **Insufficient Permissions**: The key may not have the required permissions
3. **Sender Email Not Verified**: The "from" email address may not be verified in SendGrid

## Solution Steps

### Step 1: Generate a New SendGrid API Key

1. **Go to SendGrid Dashboard**: https://app.sendgrid.com/
2. **Navigate to Settings > API Keys**
3. **Click "Create API Key"**
4. **Choose "Full Access" permissions**
5. **Name it**: "Countryside Steakhouse Production"
6. **Copy the new API key** (starts with "SG.")

### Step 2: Verify Sender Email

1. **Go to Settings > Sender Authentication**
2. **Verify Single Sender**: `mailcountrysidesteakhouse@gmail.com`
3. **Or verify Domain**: `countryside-steakhouse.site`

### Step 3: Update Environment Variables

#### For Local Development:

Create/update `backend/.env`:

```env
SENDGRID_API_KEY_2=YOUR_NEW_API_KEY_HERE
```

#### For Railway Deployment:

1. Go to Railway dashboard
2. Navigate to your backend service
3. Go to Variables tab
4. Update `SENDGRID_API_KEY_2` with the new API key
5. Redeploy the service

### Step 4: Test the Configuration

Run the test script:

```bash
cd backend
node test-sendgrid-simple.js
```

Expected output:

```
✅ SendGrid appears to be configured correctly!
```

### Step 5: Test Email Sending

Try these features to test email functionality:

1. **Create a new employee** (should send welcome email)
2. **Approve an employee transfer** (should send transfer notification)
3. **Generate payroll** (should send payroll notification)

## Alternative: Use SMTP Instead

If SendGrid continues to have issues, you can switch to SMTP (Gmail) which is already configured:

1. **Update `backend/services/sendGridService.js`** to fallback to SMTP
2. **Or modify the email service** to use SMTP as primary method

## Troubleshooting

### If you still get 401 errors:

1. **Double-check the API key** - make sure it's copied correctly
2. **Verify permissions** - ensure the key has "Full Access"
3. **Check sender verification** - verify the "from" email address
4. **Wait a few minutes** - API key changes can take time to propagate

### If emails are not sending:

1. **Check Railway logs** for SendGrid errors
2. **Verify sender email** is verified in SendGrid
3. **Check SendGrid activity dashboard** for delivery status
4. **Monitor SendGrid usage** and costs

## Quick Fix Commands

```bash
# Test current configuration
cd backend
node test-sendgrid-simple.js

# Set new API key (replace with your new key)
$env:SENDGRID_API_KEY_2="YOUR_NEW_API_KEY_HERE"
node test-sendgrid-simple.js
```

## Next Steps

1. **Generate new SendGrid API key** with full permissions
2. **Update environment variables** in both local and Railway
3. **Test email functionality** with the new key
4. **Monitor logs** for any remaining issues

The SendGrid service configuration is now correct - you just need a valid API key!
