-- ========================================
-- Delete All Branch Remittances Data
-- ========================================
-- 
-- WARNING: This will permanently delete ALL data in branch_remittances table
-- Make sure you want to completely clear all remittance records!
--
-- Run these commands in pgAdmin or any PostgreSQL client
--

-- Step 1: Show current data before deletion (optional - for verification)
SELECT 
    COUNT(*) as total_remittances,
    MIN(created_at) as oldest_remittance,
    MAX(created_at) as newest_remittance,
    SUM(CAST(remitted_amount AS DECIMAL)) as total_remitted_amount
FROM branch_remittances;

-- Step 2: Show sample of data that will be deleted (optional - for verification)
SELECT 
    id,
    branch_id,
    period_type,
    status,
    gross_sales,
    net_sales,
    remitted_amount,
    approved_at,
    created_at
FROM branch_remittances
ORDER BY created_at DESC
LIMIT 10;

-- Step 3: DELETE ALL DATA in branch_remittances table
-- ⚠️  WARNING: This is irreversible!
DELETE FROM branch_remittances;

-- Step 4: Reset the auto-increment sequence (optional - starts IDs from 1 again)
-- Uncomment the next line if you want to reset the ID sequence
-- ALTER SEQUENCE branch_remittances_id_seq RESTART WITH 1;

-- Step 5: Verify deletion (should show 0 records)
SELECT COUNT(*) as remaining_remittances FROM branch_remittances;

-- ========================================
-- Alternative: Truncate Table (faster for large datasets)
-- ========================================
-- 
-- If you prefer to use TRUNCATE instead of DELETE:
-- TRUNCATE TABLE branch_remittances RESTART IDENTITY CASCADE;
--
-- TRUNCATE is faster but:
-- - Cannot be rolled back in some cases
-- - RESTART IDENTITY resets auto-increment
-- - CASCADE removes dependent data (if any)
--

-- ========================================
-- Complete Cleanup Commands (All in One)
-- ========================================
--
-- If you want to clean BOTH tables at once:
--

-- Clean pos_sales_orders (set remittance_id to null)
UPDATE pos_sales_orders 
SET 
    remittance_id = NULL,
    remitted_at = NULL,
    updated_at = NOW()
WHERE remittance_id IS NOT NULL;

-- Clean branch_remittances (delete all records)
DELETE FROM branch_remittances;

-- Reset sequences (optional)
-- ALTER SEQUENCE branch_remittances_id_seq RESTART WITH 1;

-- Verify cleanup
SELECT 
    'pos_sales_orders' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN remittance_id IS NULL THEN 1 END) as records_with_null_remittance_id
FROM pos_sales_orders
UNION ALL
SELECT 
    'branch_remittances' as table_name,
    COUNT(*) as total_records,
    NULL as records_with_null_remittance_id
FROM branch_remittances;
