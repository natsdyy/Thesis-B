# Email Connection Timeout Troubleshooting Guide

## Problem Description
You're experiencing email connection timeouts when trying to send feedback reply emails, with errors like:
```
❌ Error sending feedback reply email (attempt 1): Connection timeout
❌ Primary transporter failed: Connection timeout
❌ All attempts failed for feedback reply email
```

## Root Causes & Solutions

### 1. Network/Firewall Issues
**Symptoms:** All transporters fail with "Connection timeout"
**Solutions:**
- Check if your hosting provider (Railway, Heroku, etc.) blocks outgoing SMTP connections
- Verify that ports 587 and 465 are not blocked
- Test from a different network/server

### 2. Gmail Security Settings
**Symptoms:** Authentication errors or connection refused
**Solutions:**
- Ensure 2-Factor Authentication is enabled on your Gmail account
- Generate a new App Password:
  1. Go to Google Account settings
  2. Security → 2-Step Verification → App passwords
  3. Generate password for "Mail"
  4. Update the password in `emailService.js`

### 3. Rate Limiting
**Symptoms:** Intermittent failures, especially after multiple attempts
**Solutions:**
- Gmail limits: 500 emails/day, 100 emails/hour for free accounts
- Add delays between email attempts (already implemented)
- Consider upgrading to Google Workspace for higher limits

### 4. Server Location/IP Issues
**Symptoms:** Consistent timeouts from specific servers
**Solutions:**
- Some hosting providers' IPs might be flagged by Gmail
- Try using a different SMTP service (SendGrid, Mailgun, etc.)
- Contact your hosting provider about SMTP restrictions

## Quick Fixes Applied

### 1. Increased Timeouts
- Connection timeout: 30s → 60s
- Socket timeout: 30s → 60s
- Email operation timeout: 45s → 90s

### 2. Multiple Transporter Strategy
- Primary: Port 587 (STARTTLS) - Better for cloud hosting
- Fallback: Port 465 (SSL)
- Alternative: Port 587 with relaxed TLS settings

### 3. Enhanced Retry Logic
- Increased retries: 2 → 3 attempts
- Added progressive delays between attempts
- Better error handling and logging

### 4. Improved TLS Configuration
```javascript
tls: {
  rejectUnauthorized: false,
  secureProtocol: 'TLSv1_2_method',
  ciphers: 'SSLv3'
}
```

## Testing Your Configuration

### Option 1: Use the Test Script
```bash
cd backend
node test-email.js
```

### Option 2: Manual Testing
1. Check server logs for email verification messages
2. Try sending a feedback reply through the UI
3. Monitor console output for detailed error messages

## Alternative SMTP Services

If Gmail continues to have issues, consider these alternatives:

### SendGrid (Recommended)
```javascript
// Already included in package.json
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
```

### Mailgun
- Reliable for transactional emails
- Good free tier
- Better deliverability

### Amazon SES
- Very reliable
- Pay-per-email pricing
- Requires domain verification

## Environment Variables
Create a `.env` file in the backend directory:
```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=mailcountrysidesteakhouse@gmail.com
SMTP_PASS=your-app-password-here
SMTP_SECURE=false

# Alternative service
SENDGRID_API_KEY=your-sendgrid-key-here
```

## Monitoring and Debugging

### Enable Debug Mode
The configuration now includes:
```javascript
debug: true,
logger: true
```

### Check Logs
Look for these log messages:
- `✅ Primary email service ready to send messages`
- `📧 Attempt X/3 - Sending feedback reply to...`
- `✅ Feedback reply email sent`

### Common Error Messages
- `Connection timeout`: Network/firewall issue
- `Authentication failed`: Wrong credentials or 2FA not enabled
- `Rate limit exceeded`: Too many emails sent
- `Connection refused`: Port blocked or service down

## Production Recommendations

1. **Use Environment Variables**: Don't hardcode credentials
2. **Implement Email Queue**: For high-volume scenarios
3. **Monitor Email Status**: Track delivery success/failure
4. **Have Fallback Options**: Multiple SMTP services
5. **Regular Testing**: Automated email configuration tests

## Support

If issues persist:
1. Check Gmail account security settings
2. Verify hosting provider SMTP policies
3. Consider switching to a dedicated email service
4. Contact technical support with specific error messages

---

**Last Updated:** December 2024
**Configuration Version:** v2.0 (Enhanced Timeouts & Multi-Transporter)
