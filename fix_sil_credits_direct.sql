-- Direct fix for employee 31's SIL credits for 2025
-- This sets the correct values based on rejected leave requests

-- First, check current state
SELECT 
  employee_id,
  year,
  total_credits,
  used_credits,
  available_credits,
  (total_credits - used_credits) as should_be_available
FROM employee_sil_credits
WHERE employee_id = 31 AND year = 2025;

-- Count how many rejected leaves used SIL
SELECT 
  COUNT(*) as rejected_leaves_with_sil,
  SUM(sil_days) as total_sil_days_used
FROM leave_requests
WHERE employee_id = 31
  AND year = 2025
  AND status = 'rejected'
  AND use_sil = true
  AND sil_days > 0
  AND deleted_at IS NULL;

-- Fix: Set correct values
-- If used_credits is 0.00, then the credits were never deducted
-- So available should equal total_credits
UPDATE employee_sil_credits
SET 
  used_credits = 0.00,
  available_credits = total_credits,
  updated_at = NOW()
WHERE 
  employee_id = 31 
  AND year = 2025
  AND (available_credits < total_credits OR used_credits > 0);

