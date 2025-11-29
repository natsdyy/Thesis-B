@echo off
echo 🚂 Configuring Railway Email with SendGrid...
echo.

REM Check if Railway CLI is installed
railway --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Railway CLI not found. Please install it first:
    echo    npm install -g @railway/cli
    echo.
    echo Or configure manually in Railway dashboard:
    echo 1. Go to railway.app
    echo 2. Find your backend service
    echo 3. Go to Variables tab
    echo 4. Add: SENDGRID_API_KEY = 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
    echo 5. Add: RAILWAY_ENVIRONMENT = production
    pause
    exit /b 1
)

echo ✅ Railway CLI found
echo.

REM Check login status
echo 🔐 Checking Railway login status...
railway whoami >nul 2>&1
if errorlevel 1 (
    echo ❌ Not logged in to Railway. Please login first:
    echo    railway login
    pause
    exit /b 1
)

echo ✅ Logged in to Railway
echo.

echo 📧 Setting up SendGrid configuration...
railway variables set SENDGRID_API_KEY="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"
railway variables set RAILWAY_ENVIRONMENT="production"

echo.
echo ✅ SendGrid configured successfully!
echo.
echo 🚀 Railway will automatically redeploy your service...
echo.
echo 📝 Next steps:
echo 1. Wait 1-2 minutes for redeploy
echo 2. Check Railway logs: railway logs --tail
echo 3. Test email at: www.countryside-steakhouse.site
echo.
echo 🔍 To monitor deployment:
railway logs --tail
