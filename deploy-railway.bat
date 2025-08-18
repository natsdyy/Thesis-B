@echo off
REM Railway Deployment Script for Thesis-B (Windows)
REM This script helps deploy your application to Railway

echo 🚂 Starting Railway deployment for Thesis-B...

REM Check if Railway CLI is installed
railway --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Railway CLI not found. Installing...
    npm install -g @railway/cli
    if %errorlevel% neq 0 (
        echo ❌ Failed to install Railway CLI
        pause
        exit /b 1
    )
    echo ✅ Railway CLI installed successfully
) else (
    echo ✅ Railway CLI found
)

REM Login to Railway
echo 🔐 Logging into Railway...
railway login
if %errorlevel% neq 0 (
    echo ❌ Failed to login to Railway
    pause
    exit /b 1
)

REM Initialize Railway project
echo 📁 Initializing Railway project...
if not exist ".railway" (
    railway init
    if %errorlevel% neq 0 (
        echo ❌ Failed to initialize Railway project
        pause
        exit /b 1
    )
) else (
    echo ✅ Railway project already initialized
)

REM Set environment variables
echo 🔧 Setting environment variables...
railway variables set NODE_ENV=production
railway variables set PORT=5000

REM Set database URL
echo 🗄️ Setting database URL...
set /p DATABASE_URL="Please enter your Railway PostgreSQL database URL: "
railway variables set DATABASE_URL="%DATABASE_URL%"

REM Set CORS origin
echo 🌐 Setting CORS origin...
set /p CORS_ORIGIN="Please enter your frontend Railway URL: "
railway variables set CORS_ORIGIN="%CORS_ORIGIN%"

REM Generate and set JWT secret
echo 🔑 Generating JWT secret...
for /f "tokens=*" %%i in ('openssl rand -base64 32 2^>nul') do set JWT_SECRET=%%i
if "%JWT_SECRET%"=="" (
    echo ⚠️ Could not generate JWT secret with openssl, using default
    set JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
)
railway variables set JWT_SECRET="%JWT_SECRET%"

REM Deploy backend
echo 🚀 Deploying backend to Railway...
cd backend
railway up
if %errorlevel% neq 0 (
    echo ❌ Backend deployment failed
    cd ..
    pause
    exit /b 1
)
echo ✅ Backend deployed successfully
cd ..

REM Deploy frontend
echo 🎨 Deploying frontend to Railway...
cd frontend
railway up
if %errorlevel% neq 0 (
    echo ❌ Frontend deployment failed
    cd ..
    pause
    exit /b 1
)
echo ✅ Frontend deployed successfully
cd ..

REM Run database migrations
echo 🔄 Running database migrations...
cd backend
railway run npm run migrate
if %errorlevel% neq 0 (
    echo ⚠️ Database migrations failed, but deployment completed
) else (
    echo ✅ Database migrations completed
)
cd ..

echo.
echo 🎉 Deployment completed successfully!
echo.
echo 📋 Next steps:
echo    1. Check your Railway dashboard for service URLs
echo    2. Test your application endpoints
echo    3. Set up custom domains if needed
echo    4. Monitor logs and performance
echo.
pause
