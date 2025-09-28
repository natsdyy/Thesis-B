@echo off
echo 🚂 Using Railway CLI to fix email configuration
echo ==============================================
echo.

REM Check if Railway CLI is installed
railway --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Railway CLI not found.
    echo Please use the manual method instead.
    echo Run: fix-railway-email.bat
    pause
    exit /b 1
)

echo ✅ Railway CLI found
echo.

REM Check login status
echo 🔐 Checking Railway login status...
railway whoami >nul 2>&1
if errorlevel 1 (
    echo ❌ Not logged in to Railway.
    echo Please login first: railway login
    pause
    exit /b 1
)

echo ✅ Logged in to Railway
echo.

echo 📧 Setting up SendGrid configuration...
railway variables set SENDGRID_API_KEY="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"
railway variables set RAILWAY_ENVIRONMENT="production"

echo.
echo ✅ Environment variables set successfully!
echo.
echo 🚀 Railway will automatically redeploy...
echo Please wait 1-2 minutes for deployment to complete.
echo.
echo 🔍 To monitor deployment:
railway logs --tail
