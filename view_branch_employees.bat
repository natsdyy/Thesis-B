@echo off
echo ========================================
echo Branch Employees Details
echo ========================================
echo.

cd backend
node scripts/get_branch_employees_details.js

echo.
echo ========================================
echo Press any key to exit...
echo ========================================
pause


