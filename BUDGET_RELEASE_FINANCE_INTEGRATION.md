# Budget Release Finance Integration

## Overview

This document describes the automatic finance balance deduction and cash movement tracking when budget releases are created for supply requests.

## Implementation Date

October 6, 2025

## Changes Made

### 1. Database Migration

**File:** `backend/migrations/20250206000000_make_cash_movements_branch_id_nullable.js`

- Made `branch_id` nullable in the `cash_movements` table
- This allows recording cash movements for non-branch entities (SCM, HQ, etc.)
- Properly handles foreign key constraints during the alteration

### 2. Backend Model Updates

**File:** `backend/models/BudgetRelease.js`

#### Added Dependencies

```javascript
const FinanceBalance = require("./FinanceBalance");
const CashMovement = require("./CashMovement");
```

#### Enhanced `create()` Method

The budget release creation now performs the following operations in a **single transaction**:

1. **Creates Budget Release Record**
   - Generates unique release ID (e.g., BR2025001)
   - Records release amount, released by, and remarks

2. **Updates Supply Request Status**
   - Sets status to "Budget Released"
   - Links the release ID to the supply request

3. **Deducts from Finance Balance** ✨ NEW
   - Retrieves the latest finance balance
   - Deducts the released amount from capital
   - Creates a new finance balance snapshot with updated values
   - Recalculates total_balance automatically

4. **Creates Cash Movement Record** ✨ NEW
   - Records an "out" (outflow) type movement
   - Links to the budget release via reference_id and reference_type
   - Includes descriptive notes with request details
   - Supports both branch-specific and non-branch (SCM/HQ) requests

## How It Works

### Flow Diagram

```
Finance Manager releases budget
         ↓
Budget Release created (BR2025XXX)
         ↓
Supply Request status → "Budget Released"
         ↓
Finance Balance Capital deducted
         ↓
Cash Movement "out" recorded
         ↓
All changes committed (or rolled back on error)
```

### Example Scenario

**Before Budget Release:**

- Finance Balance Capital: ₱500,000.00
- Finance Balance Profit: ₱100,000.00
- Total Balance: ₱600,000.00

**Supply Request Details:**

- Request ID: 1759142810598
- Department: SCM
- Description: Egg restock
- Total Amount: ₱10,000.00

**After Budget Release:**

- Finance Balance Capital: ₱490,000.00 (deducted ₱10,000.00)
- Finance Balance Profit: ₱100,000.00 (unchanged)
- Total Balance: ₱590,000.00
- Cash Movement Record:
  ```json
  {
    "branch_id": null,
    "movement_type": "out",
    "amount": 10000.0,
    "source": "budget_release",
    "reference_id": 43,
    "reference_type": "budget_release",
    "notes": "Budget released for Egg restock (BR2025043) - SCM"
  }
  ```

## Frontend Integration

### Store Integration

**budgetReleaseStore.js** has been enhanced to automatically refresh related stores:

- After creating/releasing a budget, it now calls:
  - `financeBalanceStore.fetchTotals()` - Updates current balance
  - `cashMovementStore.fetchMovements()` - Refreshes cash movement list

### Component Reactivity

**CurrentBalance.vue** automatically displays:

- Updated capital after deductions (reactive via computed store reference)
- Real-time total balance
- Reflects changes immediately after budget release
- No manual refresh needed

**CashMovement.vue** automatically shows:

- All budget release outflows in the cash movement table (reactive via computed store reference)
- Filterable by date range (Today, This Week, This Month, etc.)
- Displays as "Outflow" with red/warning badge
- Shows descriptive notes with supply request details
- Fixed pagination bug (was starting at page 10 instead of 1)

## Data Structure

### Finance Balance Record

```javascript
{
  capital: 490000.00,           // Deducted amount
  profit: 100000.00,            // Unchanged
  sales_remittances: 0.00,      // Unchanged
  total_balance: 590000.00,     // Auto-calculated
  balance_date: "2025-10-06T...",
  created_at: "2025-10-06T...",
  updated_at: "2025-10-06T..."
}
```

### Cash Movement Record

```javascript
{
  id: 125,
  branch_id: null,                          // Can be null for SCM/HQ
  movement_type: "out",                     // Outflow
  amount: 10000.00,
  source: "budget_release",
  reference_id: "43",                       // Budget release ID
  reference_type: "budget_release",
  notes: "Budget released for Egg restock (BR2025043) - SCM",
  occurred_at: "2025-10-06T...",
  created_at: "2025-10-06T...",
  updated_at: "2025-10-06T..."
}
```

## Transaction Safety

All operations are wrapped in a **database transaction** to ensure:

- ✅ Atomicity: All changes succeed or all fail together
- ✅ Consistency: Finance balance always matches cash movements
- ✅ Isolation: Concurrent budget releases don't interfere
- ✅ Durability: Committed changes are permanent

If any step fails:

- Transaction is rolled back
- No partial updates occur
- Error is logged and reported to the user

## API Response Example

When creating a budget release, the API returns:

```json
{
  "success": true,
  "message": "Budget release created successfully",
  "data": {
    "id": 43,
    "release_id": "BR2025043",
    "supply_request_id": 43,
    "released_amount": "10000.00",
    "released_by": "Patricia Garcia",
    "released_at": "2025-10-06T10:53:24.237Z",
    "release_remarks": "Request approved by Finance",
    "receipt_confirmed": false,
    "receipt_confirmed_by": null,
    "receipt_confirmed_at": null,
    "created_at": "2025-10-06T10:53:24.237Z",
    "updated_at": "2025-10-06T10:53:24.237Z"
  }
}
```

## Testing Checklist

- [x] Migration runs successfully
- [x] No linting errors in modified files
- [x] Budget release creates finance balance snapshot
- [x] Capital is deducted correctly
- [x] Cash movement record is created with type "out"
- [x] Transaction rollback works on errors
- [x] Branch-specific and non-branch requests both work
- [x] Store integration refreshes finance balance automatically
- [x] Store integration refreshes cash movements automatically
- [x] Fixed CashMovement pagination bug
- [ ] Frontend displays updated balance immediately (pending UI test)
- [ ] Cash movement appears in CashMovement.vue (pending UI test)
- [ ] Date filtering works correctly (pending UI test)

## Files Modified

### Backend

1. `backend/models/BudgetRelease.js` - Enhanced create method with finance integration
2. `backend/migrations/20250206000000_make_cash_movements_branch_id_nullable.js` - New migration
3. `backend/models/CashMovement.js` - Added support for non-branch (HQ/SCM) movements filtering
4. `backend/routes/cashMovements.js` - Made branch_id optional for POST, added include_non_branch filter

### Frontend

5. `frontend/src/stores/budgetReleaseStore.js` - Auto-refresh finance balance and cash movements with non-branch support
6. `frontend/src/components/finance/CashMovement.vue` - Fixed pagination bug (currentPage)

## Files Referenced (No Changes Required)

1. `backend/models/FinanceBalance.js` - Finance balance model
2. `frontend/src/components/finance/CurrentBalance.vue` - Balance display (reactive via store)
3. `frontend/src/stores/financeBalanceStore.js` - Finance balance state management
4. `frontend/src/stores/cashMovementStore.js` - Cash movement state management

## Benefits

1. **Automatic Tracking**: No manual entry needed for finance deductions
2. **Audit Trail**: Complete history of all budget releases in cash movements
3. **Real-time Updates**: Finance balance reflects immediately
4. **Data Integrity**: Transaction ensures consistency
5. **Comprehensive Notes**: Easy to identify what each outflow represents
6. **Department Support**: Works for both branch and non-branch (SCM/HQ) requests

## Future Enhancements

1. Add notification when balance is low
2. Create report of budget releases by department
3. Add approval workflow for large releases
4. Integrate with budget planning module
5. Add budget vs actual analysis

## Support

For questions or issues, contact the development team.
