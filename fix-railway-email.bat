@echo off
echo 🚨 URGENT: Fixing Railway Email Configuration
echo ============================================
echo.
echo The issue: Railway is still using SMTP (blocked) instead of SendGrid
echo The fix: Add environment variables to Railway
echo.

echo 📋 MANUAL STEPS REQUIRED:
echo.
echo 1. Go to https://railway.app
echo 2. Login to your account
echo 3. Find your backend service (thesis-b-backend)
echo 4. Click on the service
echo 5. Go to "Variables" tab
echo 6. Add these EXACT variables:
echo.
echo    SENDGRID_API_KEY = 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
echo    RAILWAY_ENVIRONMENT = production
echo.
echo 7. Click "Save" or "Deploy"
echo 8. Wait 1-2 minutes for redeploy
echo.

echo 🔍 After redeploy, check logs for:
echo    📧 SendGrid initialized for Railway deployment
echo    📧 Using SendGrid for Railway deployment
echo    ✅ SendGrid email sent successfully
echo.

echo ⚠️  IMPORTANT: Without these environment variables,
echo    Railway will continue trying SMTP (which is blocked)
echo    and you'll keep getting connection timeouts.
echo.

echo 🎯 Once configured, your email will work immediately!
echo.

pause
