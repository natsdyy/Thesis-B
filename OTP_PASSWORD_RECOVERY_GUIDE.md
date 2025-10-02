# OTP Password Recovery System

## Overview

This system implements a secure One-Time Password (OTP) based password recovery mechanism using SMTP Gmail for email delivery. The system provides a more secure alternative to traditional password reset links.

## Features

- ✅ 6-digit OTP generation
- ✅ 10-minute expiration time
- ✅ Rate limiting (one active OTP per email)
- ✅ SMTP Gmail integration
- ✅ Automatic cleanup of expired OTPs
- ✅ Comprehensive error handling
- ✅ Security-focused design

## Database Schema

### OTP Table (`otp_codes`)

```sql
CREATE TABLE otp_codes (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### 1. Send OTP
**POST** `/api/auth/send-otp`

Send a 6-digit OTP code to the user's email address.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If the email exists, an OTP code has been sent",
  "code": "OTP_SENT"
}
```

**Rate Limiting:**
- Only one active OTP per email address
- Returns 429 status if OTP already exists

### 2. Verify OTP
**POST** `/api/auth/verify-otp`

Verify the OTP code before allowing password reset.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp_code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "code": "OTP_VERIFIED"
}
```

### 3. Reset Password with OTP
**POST** `/api/auth/reset-password-with-otp`

Reset the user's password using verified OTP.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp_code": "123456",
  "new_password": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password has been reset successfully",
  "code": "PASSWORD_RESET_SUCCESS"
}
```

### 4. Get OTP Statistics
**GET** `/api/auth/otp-stats`

Get statistics about OTP usage (admin only).

**Response:**
```json
{
  "success": true,
  "message": "OTP statistics retrieved successfully",
  "code": "STATS_RETRIEVED",
  "data": {
    "total_otps": "10",
    "used_otps": "8",
    "active_otps": "1",
    "expired_otps": "1"
  }
}
```

### 5. Cleanup Expired OTPs
**POST** `/api/auth/cleanup-otp`

Clean up expired OTP records (admin only).

**Response:**
```json
{
  "success": true,
  "message": "Cleaned up 5 expired OTPs",
  "code": "CLEANUP_SUCCESS",
  "data": {
    "deletedCount": 5
  }
}
```

## Email Template

The system sends beautifully formatted HTML emails with:

- Company branding (Countryside Steak House)
- Large, easy-to-read OTP code
- 10-minute expiration notice
- Security warnings
- Professional styling

## Security Features

1. **Rate Limiting**: Only one active OTP per email
2. **Time Expiration**: OTPs expire after 10 minutes
3. **One-Time Use**: OTPs are marked as used after verification
4. **Secure Generation**: 6-digit random numeric codes
5. **Email Validation**: Proper email format validation
6. **Password Strength**: Minimum 6 characters for new passwords

## Usage Flow

1. **User requests password reset** → Call `/api/auth/send-otp`
2. **User receives OTP via email** → Check email inbox
3. **User enters OTP** → Call `/api/auth/verify-otp`
4. **User sets new password** → Call `/api/auth/reset-password-with-otp`

## Error Handling

The system provides comprehensive error handling for:

- Invalid email formats
- Expired OTPs
- Already used OTPs
- Rate limiting violations
- Database errors
- Email delivery failures

## Configuration

### Environment Variables

```env
# Gmail SMTP Configuration
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Frontend URL for email links
FRONTEND_URL=http://localhost:8080
```

### Gmail Setup

1. Enable 2-Factor Authentication on Gmail
2. Generate an App Password
3. Use the App Password in `SMTP_PASS`

## Testing

Run the test script to verify functionality:

```bash
# PowerShell
powershell -ExecutionPolicy Bypass -File test-otp-simple.ps1

# Node.js
node test-otp-functionality.js
```

## Maintenance

### Automatic Cleanup

The system includes automatic cleanup of expired OTPs. You can also manually trigger cleanup:

```bash
curl -X POST http://localhost:3000/api/auth/cleanup-otp
```

### Monitoring

Use the statistics endpoint to monitor OTP usage:

```bash
curl http://localhost:3000/api/auth/otp-stats
```

## Migration

The OTP system requires a database migration:

```bash
cd backend
npm run migrate
```

## Files Created/Modified

### New Files
- `backend/migrations/20250127000000_create_otp_table.js`
- `backend/models/OTP.js`
- `backend/test-otp-functionality.js`
- `backend/test-otp-simple.ps1`

### Modified Files
- `backend/services/emailService.js` - Added OTP email function
- `backend/routes/auth.js` - Added OTP endpoints

## Security Considerations

1. **Never log OTP codes** in production
2. **Use HTTPS** for all API calls
3. **Implement rate limiting** at the server level
4. **Monitor for abuse** using the statistics endpoint
5. **Regular cleanup** of expired OTPs
6. **Secure email delivery** using Gmail's security features

## Troubleshooting

### Common Issues

1. **Email not sending**: Check Gmail SMTP configuration
2. **OTP not working**: Verify database migration ran successfully
3. **Rate limiting**: Wait for current OTP to expire
4. **Invalid OTP**: Check if OTP has expired or been used

### Debug Commands

```bash
# Check server status
netstat -ano | findstr :3000

# Test email configuration
node test-email-config.js

# Check database connection
node test_query.js
```

## Support

For issues or questions about the OTP system, check:

1. Server logs for error messages
2. Database connection status
3. Email service configuration
4. Network connectivity

The system is designed to be robust and secure, providing a reliable password recovery mechanism for your application.
