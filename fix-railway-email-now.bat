@echo off
echo ========================================
echo    RAILWAY EMAIL SERVICE FIX SCRIPT
echo ========================================
echo.

echo This script will help you fix the email issues in Railway.
echo Based on your logs, you need to set up environment variables.
echo.

echo Current issues detected:
echo - SendGrid: Unauthorized (API key missing in Railway)
echo - SMTP: DNS resolution issues (queryA EBADNAME)
echo.

echo Choose your preferred email method:
echo 1. SendGrid (Recommended - uses your existing API key)
echo 2. Gmail SMTP (Alternative - requires app password)
echo 3. Both (SendGrid primary, Gmail SMTP fallback)
echo.

set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" goto sendgrid_only
if "%choice%"=="2" goto gmail_only
if "%choice%"=="3" goto both_methods
goto invalid

:sendgrid_only
echo.
echo Setting up SendGrid only...
echo.
echo Your SendGrid API key: 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
echo.
echo Adding to Railway environment variables...
railway variables set SENDGRID_API_KEY=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
railway variables set NODE_ENV=production
railway variables set RAILWAY_ENVIRONMENT=production
railway variables set FRONTEND_URL=https://countryside-steakhouse.site
echo.
echo ✅ SendGrid configuration complete!
goto deploy

:gmail_only
echo.
echo Setting up Gmail SMTP only...
echo.
echo You need to generate a Gmail App Password:
echo 1. Go to: https://myaccount.google.com/apppasswords
echo 2. Generate a new app password for "Mail"
echo 3. Copy the 16-character password
echo.
set /p gmail_pass="Enter your Gmail app password (16 characters): "

echo.
echo Adding to Railway environment variables...
railway variables set SMTP_USER=mailcountrysidesteakhouse@gmail.com
railway variables set SMTP_PASS=%gmail_pass%
railway variables set SMTP_HOST=smtp.gmail.com
railway variables set SMTP_PORT=587
railway variables set SMTP_SECURE=false
railway variables set NODE_ENV=production
railway variables set RAILWAY_ENVIRONMENT=production
railway variables set FRONTEND_URL=https://countryside-steakhouse.site
echo.
echo ✅ Gmail SMTP configuration complete!
goto deploy

:both_methods
echo.
echo Setting up both SendGrid and Gmail SMTP...
echo.
echo Your SendGrid API key: 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
echo.
echo For Gmail SMTP, you need to generate a Gmail App Password:
echo 1. Go to: https://myaccount.google.com/apppasswords
echo 2. Generate a new app password for "Mail"
echo 3. Copy the 16-character password
echo.
set /p gmail_pass="Enter your Gmail app password (16 characters): "

echo.
echo Adding to Railway environment variables...
railway variables set SENDGRID_API_KEY=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
railway variables set SMTP_USER=mailcountrysidesteakhouse@gmail.com
railway variables set SMTP_PASS=%gmail_pass%
railway variables set SMTP_HOST=smtp.gmail.com
railway variables set SMTP_PORT=587
railway variables set SMTP_SECURE=false
railway variables set NODE_ENV=production
railway variables set RAILWAY_ENVIRONMENT=production
railway variables set FRONTEND_URL=https://countryside-steakhouse.site
echo.
echo ✅ Both SendGrid and Gmail SMTP configuration complete!
goto deploy

:deploy
echo.
echo ========================================
echo    DEPLOYMENT INSTRUCTIONS
echo ========================================
echo.
echo 1. Your environment variables have been set in Railway
echo 2. Now you need to redeploy your service:
echo.
echo    Option A: Automatic redeploy (if connected to GitHub)
echo    - Push your changes to GitHub
echo    - Railway will automatically redeploy
echo.
echo    Option B: Manual redeploy
echo    - Go to Railway dashboard
echo    - Click "Deploy" on your Thesis-B service
echo.
echo 3. After deployment, test the email functionality
echo 4. Check the Railway logs for any remaining issues
echo.
echo ========================================
echo    TESTING INSTRUCTIONS
echo ========================================
echo.
echo To test your email service:
echo 1. Go to your application: https://countryside-steakhouse.site
echo 2. Try to send a feedback reply or trigger any email function
echo 3. Check Railway logs for success/failure messages
echo.
echo Expected success messages:
echo - "✅ SendGrid email sent successfully"
echo - "✅ SMTP email sent (Railway-optimized)"
echo.
echo If you still see errors, check:
echo - Environment variables are properly set
echo - SendGrid API key is valid
echo - Gmail app password is correct
echo.
goto end

:invalid
echo Invalid choice. Please run the script again and choose 1, 2, or 3.
goto end

:end
echo.
echo Script completed. Follow the deployment instructions above.
echo.
pause
