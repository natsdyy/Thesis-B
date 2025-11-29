@echo off
echo.
echo ========================================
echo    🚂 RAILWAY EMAIL FIX - COMPLETE
echo ========================================
echo.
echo This script will fix your Railway email issues by setting up SendGrid.
echo.
echo PROBLEM: Railway blocks SMTP ports (465/587) that Gmail uses
echo SOLUTION: Use SendGrid (HTTP-based, Railway compatible)
echo.

REM Check if Railway CLI is installed
railway --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Railway CLI not found. Please install it first:
    echo.
    echo Windows: npm install -g @railway/cli
    echo Then run: railway login
    echo.
    pause
    exit /b 1
)

echo ✅ Railway CLI found
echo.

REM Check if user is logged in
railway whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Not logged into Railway. Please login first:
    echo.
    railway login
    echo.
    pause
    exit /b 1
)

echo ✅ Logged into Railway
echo.

echo 📧 SENDGRID SETUP REQUIRED
echo ==========================
echo.
echo To fix Railway email issues, you need a SendGrid account (FREE):
echo.
echo 1. Go to: https://sendgrid.com
echo 2. Sign up (100 emails/day free)
echo 3. Go to Settings → API Keys
echo 4. Create new key with "Full Access"
echo 5. Copy the API key (starts with SG.)
echo.
echo Press any key when you have your SendGrid API key...
pause >nul

echo.
set /p SENDGRID_KEY="Enter your SendGrid API key: "

if "%SENDGRID_KEY%"=="" (
    echo ❌ No API key provided. Exiting...
    pause
    exit /b 1
)

echo.
echo 🚀 CONFIGURING RAILWAY...
echo ========================

REM Set Railway environment variables
echo Setting SENDGRID_API_KEY...
railway variables set SENDGRID_API_KEY=%SENDGRID_KEY%

echo Setting RAILWAY_ENVIRONMENT...
railway variables set RAILWAY_ENVIRONMENT=production

echo Setting NODE_ENV...
railway variables set NODE_ENV=production

echo Setting EMAIL_SERVICE=sendgrid...
railway variables set EMAIL_SERVICE=sendgrid

echo.
echo ✅ RAILWAY CONFIGURATION COMPLETE!
echo ==================================
echo.
echo The following variables have been set:
echo - SENDGRID_API_KEY: %SENDGRID_KEY:~0,10%...
echo - RAILWAY_ENVIRONMENT: production
echo - NODE_ENV: production
echo - EMAIL_SERVICE: sendgrid
echo.

echo 🚀 DEPLOYING CHANGES...
echo ======================
echo Railway will automatically redeploy your service.
echo This may take 2-3 minutes.
echo.

echo 🧪 TESTING EMAIL SERVICE...
echo ===========================
echo After deployment completes, test your email:
echo.
echo 1. Go to your live site
echo 2. Try sending feedback reply
echo 3. Check Railway logs: railway logs --tail
echo 4. Look for: "📧 SendGrid initialized for email delivery"
echo.

echo 📋 MONITORING DEPLOYMENT...
echo ==========================
echo Run this command to watch the deployment:
echo railway logs --tail
echo.

echo 🎉 EMAIL FIX COMPLETE!
echo ======================
echo.
echo Your email service should now work on Railway!
echo.
echo If you still have issues:
echo 1. Check SendGrid dashboard for email activity
echo 2. Verify API key has "Full Access" permissions
echo 3. Check Railway logs for specific errors
echo.

pause
