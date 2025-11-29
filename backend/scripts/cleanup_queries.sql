-- Cleanup Script for Remittances and Orders
-- Run these queries in your database to reset everything

-- Step 1: Reset all pos_sales_orders remittance_id to null
UPDATE pos_sales_orders 
SET remittance_id = NULL, remitted_at = NULL 
WHERE remittance_id IS NOT NULL;

-- Step 2: Check how many orders were reset
SELECT COUNT(*) as reset_orders_count 
FROM pos_sales_orders 
WHERE remittance_id IS NULL;

-- Step 3: Show current remittances (before deletion)
SELECT 
    id, 
    branch_id, 
    remitted_amount, 
    gross_sales, 
    net_sales, 
    status, 
    approved_at,
    created_at
FROM branch_remittances 
WHERE deleted_at IS NULL 
ORDER BY id DESC;

-- Step 4: Delete all remittances (UNCOMMENT TO EXECUTE)
-- WARNING: This will delete ALL remittances!
-- DELETE FROM branch_remittances WHERE deleted_at IS NULL;

-- Step 5: Verify cleanup
SELECT 
    COUNT(*) as orders_with_remittance_id
FROM pos_sales_orders 
WHERE remittance_id IS NOT NULL;

SELECT 
    COUNT(*) as active_remittances
FROM branch_remittances 
WHERE deleted_at IS NULL;

-- Step 6: Check unlinked orders by branch
SELECT 
    branch_id,
    COUNT(*) as total_orders,
    SUM(total_amount) as total_sales
FROM pos_sales_orders 
WHERE status = 'completed' 
    AND remittance_id IS NULL 
GROUP BY branch_id 
ORDER BY branch_id;
