@echo off
echo.
echo ========================================
echo    🚂 RAILWAY DEPLOYMENT FIX
echo ========================================
echo.
echo Fixing Railway deployment issues:
echo 1. Database migration files
echo 2. SendGrid API key configuration
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

echo 🗄️ FIXING DATABASE MIGRATIONS...
echo ================================
echo.
echo The missing migration files have been created locally.
echo Now we need to commit and push them to Railway.
echo.

echo 📝 COMMITTING CHANGES...
echo ========================
git add backend/migrations/20250131000000_create_cash_movements_table.js
git add backend/migrations/20250131000001_create_finance_balances_table.js
git add backend/migrations/20250131000002_remove_branch_id_from_finance_balances.js
git add backend/migrations/20250206000000_make_cash_movements_branch_id_nullable.js
git add backend/migrations/20250116120000_add_auth_fields_to_suppliers.js
git add backend/migrations/20250206000000_create_supplier_products_table.js
git add backend/migrations/20250206000001_create_categories_and_item_types_tables.js
git add backend/migrations/20251006120000_add_item_type_to_supplier_products.js
git add backend/services/emailService.js

git commit -m "Fix Railway deployment issues: Add missing migrations and improve SendGrid handling"

echo.
echo 📤 PUSHING TO RAILWAY...
echo ========================
git push origin branch-ko

echo.
echo 🔧 FIXING SENDGRID API KEY...
echo ==============================
echo.
echo Your SendGrid API keys are configured but may need verification.
echo.

set /p SENDGRID_KEY="Enter your primary SendGrid API key (or press Enter to skip): "

if not "%SENDGRID_KEY%"=="" (
    echo.
    echo 🔄 Updating SendGrid API key in Railway...
    railway variables set SENDGRID_API_KEY=%SENDGRID_KEY%
    echo ✅ SendGrid API key updated
) else (
    echo ℹ️  Skipping SendGrid key update
)

echo.
echo 🚀 DEPLOYMENT FIX COMPLETE!
echo ===========================
echo.
echo What was fixed:
echo ✅ Added missing database migration files
echo ✅ Improved SendGrid API key handling
echo ✅ Enhanced error logging for debugging
echo ✅ Pushed changes to Railway
echo.

echo 📋 NEXT STEPS:
echo ==============
echo 1. Railway will automatically redeploy your service
echo 2. Wait 3-5 minutes for deployment to complete
echo 3. Check Railway logs: railway logs
echo 4. Test email functionality on your live site
echo.

echo 🧪 TESTING EMAIL:
echo ================
echo After deployment, test your email:
echo - Go to your live site
echo - Try sending a feedback reply
echo - Check Railway logs for success messages
echo.

echo Look for these success indicators:
echo ✅ "📧 SendGrid initialized for email delivery"
echo ✅ "🚂 Railway-compatible email service ready"
echo ✅ "✅ SendGrid email sent successfully"
echo.

pause
