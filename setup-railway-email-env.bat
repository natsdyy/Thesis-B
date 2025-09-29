@echo off
echo Setting up Railway email environment variables...
echo.

echo This script will help you set up email configuration in Railway.
echo Make sure you have Railway CLI installed and are logged in.
echo.

echo Choose your email method:
echo 1. SendGrid (Recommended)
echo 2. Gmail SMTP
echo 3. Skip (manual setup)
echo.

set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" goto sendgrid
if "%choice%"=="2" goto gmail
if "%choice%"=="3" goto manual
goto invalid

:sendgrid
echo.
echo Setting up SendGrid configuration...
echo.
echo Please get your SendGrid API key from: https://app.sendgrid.com/settings/api_keys
set /p sendgrid_key="Enter your SendGrid API key: "

echo Setting Railway environment variables...
railway variables set NODE_ENV=production
railway variables set RAILWAY_ENVIRONMENT=production
railway variables set SENDGRID_API_KEY=%sendgrid_key%
railway variables set FRONTEND_URL=https://your-frontend-domain.railway.app

echo.
echo ✅ SendGrid configuration complete!
echo Please update FRONTEND_URL with your actual frontend domain.
goto end

:gmail
echo.
echo Setting up Gmail SMTP configuration...
echo.
echo Please generate a Gmail app password from: https://myaccount.google.com/apppasswords
set /p gmail_pass="Enter your Gmail app password (16 characters): "

echo Setting Railway environment variables...
railway variables set NODE_ENV=production
railway variables set RAILWAY_ENVIRONMENT=production
railway variables set SMTP_USER=mailcountrysidesteakhouse@gmail.com
railway variables set SMTP_PASS=%gmail_pass%
railway variables set SMTP_HOST=smtp.gmail.com
railway variables set SMTP_PORT=587
railway variables set SMTP_SECURE=false
railway variables set FRONTEND_URL=https://your-frontend-domain.railway.app

echo.
echo ✅ Gmail SMTP configuration complete!
echo Please update FRONTEND_URL with your actual frontend domain.
goto end

:manual
echo.
echo Manual setup instructions:
echo 1. Go to your Railway project dashboard
echo 2. Click on your backend service
echo 3. Go to Variables tab
echo 4. Add the required environment variables
echo 5. See RAILWAY_EMAIL_FIX_GUIDE.md for detailed instructions
goto end

:invalid
echo Invalid choice. Please run the script again.
goto end

:end
echo.
echo Next steps:
echo 1. Redeploy your Railway service
echo 2. Test email functionality
echo 3. Check logs for any errors
echo.
pause
