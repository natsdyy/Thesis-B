# Testing Budget Release Finance Integration

## Quick Test Guide

### Prerequisites

1. Ensure the migration has been run: `npm run migrate`
2. Have at least one approved supply request in the system
3. Have a finance balance record with sufficient capital

### Automated Test (Recommended)

Run the test script to verify the integration:

```bash
cd backend
node test_budget_release_integration.js
```

The script will:

- ✅ Check current finance balance
- ✅ Find an approved supply request
- ✅ Create a budget release
- ✅ Verify finance balance deduction
- ✅ Verify cash movement record creation
- ✅ Verify supply request status update

### Manual Test via UI

1. **Login as Finance Manager**
   - Navigate to Finance → Budget Release

2. **Find Approved Supply Request**
   - Look for supply requests with status "Approved"
   - Note the current finance balance (Capital)

3. **Release Budget**
   - Click "Release Budget" for a supply request
   - Enter release remarks (optional)
   - Confirm the release

4. **Verify Current Balance**
   - Navigate to Finance → Current Balance
   - Confirm that the Capital has been deducted
   - The Total Balance should also reflect the deduction

5. **Check Cash Movement**
   - Scroll down to the "Cash Movement (In/Out)" section
   - Set the period filter (e.g., "Today" or "This Month")
   - Look for an "Outflow" record with:
     - Type: Outflow (red/warning badge)
     - Amount: Same as the released budget
     - Source: budget_release
     - Notes: Should describe the supply request

### Verification Checklist

After releasing a budget, verify:

- [ ] Finance Balance Capital decreased by the released amount
- [ ] Total Balance decreased by the released amount
- [ ] Profit and Sales Remittances remain unchanged
- [ ] Cash Movement table shows new "Outflow" record
- [ ] Cash Movement notes include the supply request details
- [ ] Supply Request status changed to "Budget Released"
- [ ] Budget Release record created with unique Release ID

### Example Expected Results

**Scenario:** Release ₱10,000.00 for SCM Egg Restock

**Before Release:**

```
Capital:            ₱500,000.00
Profit:             ₱100,000.00
Sales Remittances:  ₱50,000.00
Total Balance:      ₱650,000.00
```

**After Release:**

```
Capital:            ₱490,000.00  ← Deducted ₱10,000.00
Profit:             ₱100,000.00
Sales Remittances:  ₱50,000.00
Total Balance:      ₱640,000.00  ← Decreased by ₱10,000.00
```

**Cash Movement Record:**

```
Movement Type:  Outflow
Amount:         ₱10,000.00
Source:         budget_release
Branch:         — (null for SCM)
Notes:          Budget released for Egg restock (BR2025043) - SCM
```

### Testing Different Scenarios

#### 1. Branch Supply Request

- Create a supply request from a specific branch
- Verify the cash movement includes the branch_id

#### 2. SCM/HQ Supply Request (No Branch)

- Create a supply request from SCM/HQ
- Verify the cash movement has null branch_id
- Should still work correctly

#### 3. Multiple Budget Releases

- Release budgets for multiple supply requests
- Verify each deduction is recorded
- Check that cash movements show all outflows

#### 4. Period Filtering

- Release budgets on different dates
- Test the period filters in Cash Movement:
  - Today
  - This Week
  - This Month
  - Custom Month
- Verify correct records are shown

### Troubleshooting

**Issue: Migration not found**

```bash
cd backend
npm run migrate:status
# Ensure 20250206000000_make_cash_movements_branch_id_nullable.js is in the list
```

**Issue: Finance balance not deducting**

- Check browser console for errors
- Verify the backend API response
- Check if the transaction committed successfully

**Issue: Cash movement not appearing**

- Refresh the page
- Check the date filter settings
- Verify the movement was created in the database

### Database Verification (Optional)

If you want to verify directly in the database:

```sql
-- Check latest finance balance
SELECT * FROM finance_balances
ORDER BY balance_date DESC
LIMIT 5;

-- Check recent cash movements
SELECT * FROM cash_movements
WHERE movement_type = 'out'
  AND source = 'budget_release'
ORDER BY occurred_at DESC
LIMIT 10;

-- Check budget releases
SELECT br.*, sr.request_description, sr.department, sr.total_amount
FROM budget_releases br
JOIN supply_requests sr ON br.supply_request_id = sr.id
ORDER BY br.released_at DESC
LIMIT 10;
```

### Success Criteria

The integration is working correctly if:

1. ✅ Budget release creates without errors
2. ✅ Finance balance capital is deducted
3. ✅ Total balance reflects the deduction
4. ✅ Cash movement record appears with type "out"
5. ✅ Supply request status updates to "Budget Released"
6. ✅ All operations happen in a single transaction
7. ✅ Rollback occurs on any error (no partial updates)

### Performance Test

For high-volume scenarios, test:

- Creating multiple budget releases simultaneously
- Verifying no race conditions occur
- Checking transaction isolation

### Cleanup (After Testing)

If you used the test script and want to clean up test data:

```sql
-- Find test budget releases
SELECT * FROM budget_releases
WHERE released_by = 'Test Finance Manager';

-- Note: Cleanup should be done carefully to maintain referential integrity
```

## Support

If you encounter any issues during testing:

1. Check the backend console logs
2. Review the browser console for frontend errors
3. Verify the migration was applied successfully
4. Ensure you have sufficient finance balance capital
5. Contact the development team with error details

## Next Steps

After successful testing:

1. Train finance team on the new feature
2. Document the workflow in user manual
3. Set up monitoring for finance balance changes
4. Consider adding alerts for low balance
