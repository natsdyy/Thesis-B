-- Fix all SIL credits that have precision errors or incorrect values
-- This ensures available_credits never exceeds total_credits
-- and rounds values to 2 decimal places

-- Step 1: Check all problematic records
SELECT 
  employee_id,
  year,
  total_credits,
  used_credits,
  available_credits,
  (total_credits - used_credits) as correct_available,
  CASE 
    WHEN available_credits > total_credits THEN 'EXCEEDS_TOTAL'
    WHEN ABS(available_credits - (total_credits - used_credits)) > 0.01 THEN 'MISMATCH'
    ELSE 'OK'
  END as status
FROM employee_sil_credits
WHERE available_credits > total_credits 
   OR ABS(available_credits - (total_credits - used_credits)) > 0.01
ORDER BY employee_id, year;

-- Step 2: Fix all records where available_credits exceeds total_credits
UPDATE employee_sil_credits
SET 
  available_credits = LEAST(available_credits, total_credits),
  used_credits = GREATEST(0, total_credits - available_credits),
  updated_at = NOW()
WHERE 
  available_credits > total_credits;

-- Step 3: Fix records where the math doesn't add up correctly
UPDATE employee_sil_credits
SET 
  available_credits = ROUND(total_credits - used_credits, 2),
  used_credits = ROUND(used_credits, 2),
  updated_at = NOW()
WHERE 
  ABS(available_credits - (total_credits - used_credits)) > 0.01
  AND available_credits <= total_credits;

-- Step 4: Ensure used_credits never exceeds total_credits
UPDATE employee_sil_credits
SET 
  used_credits = LEAST(used_credits, total_credits),
  available_credits = ROUND(total_credits - used_credits, 2),
  updated_at = NOW()
WHERE 
  used_credits > total_credits;

-- Step 5: Fix any floating point precision issues by normalizing all values
UPDATE employee_sil_credits
SET 
  total_credits = ROUND(total_credits, 2),
  used_credits = ROUND(used_credits, 2),
  available_credits = ROUND(LEAST(total_credits - used_credits, total_credits), 2),
  updated_at = NOW()
WHERE 
  ROUND(total_credits, 2) != total_credits
   OR ROUND(used_credits, 2) != used_credits
   OR ROUND(available_credits, 2) != available_credits
   OR available_credits > total_credits;

-- Step 6: Final verification - should return no rows if everything is fixed
SELECT 
  employee_id,
  year,
  total_credits,
  used_credits,
  available_credits,
  (total_credits - used_credits) as should_be_available,
  ABS(available_credits - (total_credits - used_credits)) as difference
FROM employee_sil_credits
WHERE 
  available_credits > total_credits 
   OR ABS(available_credits - (total_credits - used_credits)) > 0.01
   OR used_credits > total_credits
ORDER BY employee_id, year;

-- For specific employee 31, year 2025:
-- Quick fix query
UPDATE employee_sil_credits
SET 
  used_credits = 0.00,
  available_credits = ROUND(total_credits, 2),
  updated_at = NOW()
WHERE 
  employee_id = 31 
  AND year = 2025;

-- Verify the fix
SELECT 
  employee_id,
  year,
  total_credits,
  used_credits,
  available_credits,
  (total_credits - used_credits) as should_be_available
FROM employee_sil_credits
WHERE employee_id = 31 AND year = 2025;

