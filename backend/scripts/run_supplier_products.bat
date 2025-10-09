@echo off
echo ========================================
echo    Supplier Products Script Runner
echo ========================================
echo.

echo Testing database connection and functionality...
node test_supplier_products.js

echo.
echo ========================================
echo.

echo Creating supplier products from purchase order items...
node create_supplier_products_from_po_items.js

echo.
echo ========================================
echo Script execution completed!
pause
