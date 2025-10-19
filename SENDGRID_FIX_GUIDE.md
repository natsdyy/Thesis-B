# SendGrid Configuration Fix Guide

## Problem Identified

The SendGrid service is failing with "401 Unauthorized" error because:

1. The hardcoded API key in the service is invalid/expired
2. Environment variables are not properly configured
3. The service was falling back to a hardcoded key instead of using environment variables

## Changes Made

### 1. Fixed SendGrid Service (`backend/services/sendGridService.js`)

- ✅ Removed hardcoded API key fallback
- ✅ Added proper environment variable checking
- ✅ Enhanced configuration validation
- ✅ Added debug logging for troubleshooting

### 2. Created Test Scripts

- ✅ `test-sendgrid-simple.js` - Simple configuration test
- ✅ `test-sendgrid-config.js` - Comprehensive test with SendGrid service

## How to Fix the SendGrid Configuration

### For Railway Deployment (Production)

1. **Go to your Railway dashboard**
2. **Navigate to your backend service**
3. **Go to Variables tab**
4. **Add the following environment variable:**
   ```
   SENDGRID_API_KEY_2=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
   ```
   (Use the API key from your Railway dashboard configuration)

### For Local Development

1. **Create a `.env` file in the backend directory:**

   ```bash
   cd backend
   echo "SENDGRID_API_KEY_2=your-sendgrid-api-key-here" > .env
   ```

2. **Or add to existing `.env` file:**
   ```
   SENDGRID_API_KEY_2=your-sendgrid-api-key-here
   ```

### Verify Configuration

Run the test script to verify:

```bash
cd backend
node test-sendgrid-simple.js
```

Expected output:

```
✅ SendGrid appears to be configured correctly!
```

## Testing Email Functionality

After fixing the configuration, test these features:

1. **Employee Welcome Email**: Create a new employee
2. **Transfer Notification**: Approve an employee transfer
3. **Payroll Notification**: Generate payroll for an employee

## Troubleshooting

### If you still get 401 errors:

1. Verify the API key is correct in Railway dashboard
2. Check that the API key starts with "SG."
3. Ensure the API key has proper permissions in SendGrid
4. Try regenerating the API key in SendGrid dashboard

### If emails are not sending:

1. Check Railway logs for SendGrid errors
2. Verify the "from" email address is verified in SendGrid
3. Check SendGrid activity dashboard for delivery status

## Environment Variables Priority

The service checks for API keys in this order:

1. `SENDGRID_API_KEY_2` (preferred)
2. `SENDGRID_API_KEY` (fallback)

## Security Notes

- Never commit API keys to version control
- Use environment variables for all sensitive data
- Rotate API keys regularly
- Monitor SendGrid usage and costs

## Next Steps

1. Set the environment variable in Railway
2. Redeploy the backend service
3. Test email functionality
4. Monitor logs for any remaining issues
