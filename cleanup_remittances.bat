@echo off
echo ========================================
echo    Remittance Data Cleanup Scripts
echo ========================================
echo.

echo Step 1: Preview what will be affected
echo ----------------------------------------
node preview_remittance_cleanup.js

echo.
echo Step 2: Clean the remittance data
echo ----------------------------------------
echo WARNING: This will reset all remittance associations!
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

node clean_remittance_data.js

echo.
echo ========================================
echo    Cleanup Complete!
echo ========================================
pause
