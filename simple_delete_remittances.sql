-- Simple Commands to Delete All Branch Remittances
-- Copy and paste these commands into pgAdmin

-- 1. Show what will be deleted (optional)
SELECT COUNT(*) as total_remittances FROM branch_remittances;

-- 2. DELETE ALL branch remittances
DELETE FROM branch_remittances;

-- 3. Verify deletion
SELECT COUNT(*) as remaining_remittances FROM branch_remittances;
