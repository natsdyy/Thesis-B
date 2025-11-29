# Railway Email Configuration Guide

## Problem: SMTP Blocked on Railway

Railway blocks outgoing SMTP connections on standard ports (25, 465, 587) for security reasons. This causes email timeouts when using Gmail SMTP directly.

## Solutions for Railway Deployment

### Option 1: SendGrid (Recommended) ⭐

SendGrid uses HTTP API instead of SMTP, making it Railway-compatible.

#### Setup Steps:

1. **Create SendGrid Account**
   - Go to [sendgrid.com](https://sendgrid.com)
   - Sign up for free account (100 emails/day free)

2. **Get API Key**
   - Login to SendGrid dashboard
   - Go to Settings → API Keys
   - Create new API key with "Full Access"
   - Copy the API key

3. **Configure Railway Environment**
   ```bash
   # In Railway dashboard, add environment variable:
   SENDGRID_API_KEY=SG.your-actual-api-key-here
   ```

4. **Verify Domain (Optional but Recommended)**
   - Go to Settings → Sender Authentication
   - Verify your domain or single sender email
   - This improves deliverability

#### Cost: FREE (up to 100 emails/day)

### Option 2: Mailgun SMTP

Mailgun provides SMTP on port 2525, which Railway doesn't block.

#### Setup Steps:

1. **Create Mailgun Account**
   - Go to [mailgun.com](https://mailgun.com)
   - Sign up for free account

2. **Get SMTP Credentials**
   - Go to Sending → Domain settings
   - Copy SMTP credentials

3. **Configure Railway Environment**
   ```bash
   RAILWAY_SMTP_HOST=smtp.mailgun.org
   RAILWAY_SMTP_PORT=2525
   RAILWAY_SMTP_USER=your-mailgun-username
   RAILWAY_SMTP_PASS=your-mailgun-password
   ```

#### Cost: FREE (5,000 emails/month for 3 months)

### Option 3: Alternative SMTP Services

Other services that work with Railway:

- **Postmark**: Port 2525 SMTP
- **Amazon SES**: HTTPS API
- **Resend**: HTTPS API

## Quick Setup for Your Site

### For SendGrid (Easiest):

1. **Get SendGrid API Key** (see steps above)

2. **Add to Railway Environment Variables**:
   ```
   SENDGRID_API_KEY=SG.your-actual-sendgrid-api-key
   RAILWAY_ENVIRONMENT=production
   ```

3. **Redeploy your Railway service**

### For Mailgun SMTP:

1. **Get Mailgun SMTP credentials** (see steps above)

2. **Add to Railway Environment Variables**:
   ```
   RAILWAY_SMTP_HOST=smtp.mailgun.org
   RAILWAY_SMTP_PORT=2525
   RAILWAY_SMTP_USER=your-mailgun-user
   RAILWAY_SMTP_PASS=your-mailgun-pass
   RAILWAY_ENVIRONMENT=production
   ```

3. **Redeploy your Railway service**

## Testing Your Configuration

### Method 1: Check Railway Logs
```bash
railway logs --tail
```
Look for:
- `📧 SendGrid initialized for Railway deployment`
- `📧 Using SendGrid for Railway deployment`
- `✅ SendGrid email sent successfully`

### Method 2: Test Feedback Reply
1. Go to your live site: www.countryside-steakhouse.site
2. Submit feedback through the contact form
3. Try to reply to the feedback from CRM
4. Check if email is sent successfully

## Environment Variables Reference

Add these to your Railway service environment variables:

### Required (Choose ONE email method):

**SendGrid (Recommended):**
```env
SENDGRID_API_KEY=SG.your-api-key
RAILWAY_ENVIRONMENT=production
```

**Mailgun SMTP:**
```env
RAILWAY_SMTP_HOST=smtp.mailgun.org
RAILWAY_SMTP_PORT=2525
RAILWAY_SMTP_USER=your-username
RAILWAY_SMTP_PASS=your-password
RAILWAY_ENVIRONMENT=production
```

**Gmail SMTP (Fallback - may not work):**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=mailcountrysidesteakhouse@gmail.com
SMTP_PASS=your-gmail-app-password
```

## Troubleshooting

### Still Getting Timeouts?

1. **Check Railway Logs**:
   ```bash
   railway logs --tail
   ```

2. **Verify Environment Variables**:
   - Go to Railway dashboard
   - Check if variables are set correctly
   - No extra spaces or quotes

3. **Check Email Service Status**:
   - SendGrid: Check dashboard for API usage
   - Mailgun: Check dashboard for delivery logs

### Common Issues:

**"SendGrid API key not configured"**
- Solution: Add `SENDGRID_API_KEY` environment variable

**"Connection timeout" (still happening)**
- Solution: Railway is still trying SMTP. Ensure `RAILWAY_ENVIRONMENT=production` is set

**"Authentication failed"**
- Solution: Check API key or SMTP credentials are correct

## Cost Comparison

| Service | Free Tier | Paid Plans |
|---------|-----------|------------|
| SendGrid | 100 emails/day | $19.95/month (50K emails) |
| Mailgun | 5K emails/3 months | $35/month (50K emails) |
| Gmail SMTP | 500 emails/day | Not reliable on Railway |

## Recommendation

**Use SendGrid** for the best Railway compatibility:
1. HTTP-based (no SMTP blocking issues)
2. Generous free tier
3. Excellent deliverability
4. Easy setup

## Support

If you continue having issues:
1. Check Railway community forums
2. Contact SendGrid/Mailgun support
3. Review Railway documentation on email services

---

**Last Updated**: December 2024  
**Status**: Railway-Compatible ✅
