# Password Recovery Flow Test Guide

## Overview
This guide tests the complete OTP-based password recovery system that has been implemented.

## Test Steps

### 1. Access the Login Page
- Navigate to: `http://localhost:8081/login`
- Verify the "recover password" link is visible and clickable
- Click on "recover password" link

### 2. Forgot Password Page
- Should redirect to: `http://localhost:8081/forgot-password`
- Enter a test email address (e.g., `test@example.com`)
- Click "Send Verification Code"
- Should show success message and redirect to OTP verification

### 3. OTP Verification Page
- Should redirect to: `http://localhost:8081/verify-otp?email=test@example.com`
- Enter a 6-digit OTP code (e.g., `123456`)
- Click "Verify Code"
- Should show error (since it's a test OTP) or success if using real email

### 4. Reset Password Page
- Should redirect to: `http://localhost:8081/reset-password?email=test@example.com&otp=123456`
- Enter new password (minimum 6 characters)
- Confirm new password
- Click "Reset Password"
- Should show success and redirect to login

## Backend API Endpoints Test

### Test Send OTP
```bash
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Test Verify OTP
```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp_code": "123456"}'
```

### Test Reset Password with OTP
```bash
curl -X POST http://localhost:3000/api/auth/reset-password-with-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp_code": "123456", "new_password": "newpassword123"}'
```

### Test OTP Statistics
```bash
curl http://localhost:3000/api/auth/otp-stats
```

## Expected Results

### Frontend
- ✅ All pages load correctly
- ✅ Navigation between pages works
- ✅ Form validation works
- ✅ Error messages display properly
- ✅ Success messages display properly
- ✅ Router links work correctly

### Backend
- ✅ Send OTP endpoint responds correctly
- ✅ Verify OTP endpoint validates codes
- ✅ Reset password endpoint updates password
- ✅ Statistics endpoint shows OTP data
- ✅ Rate limiting works (429 status for duplicate requests)

## Security Features Verified

1. **Rate Limiting**: Only one active OTP per email
2. **Time Expiration**: OTPs expire after 10 minutes
3. **One-Time Use**: OTPs are marked as used after verification
4. **Input Validation**: Email format and OTP format validation
5. **Password Strength**: Minimum 6 characters required
6. **Secure Email**: OTPs sent via Gmail SMTP

## Troubleshooting

### Common Issues
1. **Frontend not loading**: Check if port 8081 is available
2. **Backend not responding**: Check if port 3000 is available
3. **Email not sending**: Check Gmail SMTP configuration
4. **OTP not working**: Check database migration

### Debug Commands
```bash
# Check frontend
netstat -ano | findstr :8081

# Check backend
netstat -ano | findstr :3000

# Test backend directly
curl http://localhost:3000/api/auth/otp-stats
```

## Files Created/Modified

### New Frontend Files
- `frontend/src/views/ForgotPassword.vue`
- `frontend/src/views/VerifyOTP.vue`
- `frontend/src/views/ResetPassword.vue`

### Modified Frontend Files
- `frontend/src/router/index.js` - Added password recovery routes
- `frontend/src/views/Login.vue` - Updated recover password links

### Backend Files (Previously Created)
- `backend/migrations/20250127000000_create_otp_table.js`
- `backend/models/OTP.js`
- `backend/services/emailService.js` - Added OTP email function
- `backend/routes/auth.js` - Added OTP endpoints

## Success Criteria

The password recovery system is working correctly if:
1. Users can click "recover password" from login page
2. Users can enter email and receive OTP
3. Users can verify OTP code
4. Users can reset password with verified OTP
5. All security features are enforced
6. Error handling works properly
7. Navigation flows correctly between pages

## Next Steps

After successful testing:
1. Deploy to production
2. Configure production email settings
3. Monitor OTP usage via statistics endpoint
4. Set up automated cleanup of expired OTPs
5. Add user documentation
