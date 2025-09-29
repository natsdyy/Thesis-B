@echo off
echo ================================================
echo Countryside Steakhouse - Add Department Employees
echo ================================================
echo.

REM Set the API base URL (adjust if needed)
set API_BASE_URL=http://localhost:5000

REM Check if admin token is provided as argument
if "%1"=="" (
    echo ERROR: Please provide your admin token as an argument.
    echo.
    echo Usage: run_add_employees.bat YOUR_ADMIN_TOKEN
    echo.
    echo Example: run_add_employees.bat eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    echo.
    echo To get your admin token:
    echo 1. Log in to the system as an admin user
    echo 2. Open browser developer tools (F12)
    echo 3. Go to Application/Storage tab
    echo 4. Look for localStorage and find the 'token' key
    echo 5. Copy the token value
    echo.
    echo Available scripts:
    echo   - add_department_employees.js    (Main script)
    echo   - add_remaining_employees.js     (For conflicts)
    echo   - check_existing_benefits.js     (Check existing)
    echo.
    pause
    exit /b 1
)

REM Set the admin token
set ADMIN_TOKEN=%1

echo API Base URL: %API_BASE_URL%
echo Admin Token: %ADMIN_TOKEN:~0,20%...
echo.

REM Run the Node.js script
echo Starting employee creation script...
echo.

node add_department_employees.js

echo.
echo Script completed.
echo.
echo If you encountered conflicts, you can also run:
echo   node add_remaining_employees.js
echo   node check_existing_benefits.js
echo.
pause
