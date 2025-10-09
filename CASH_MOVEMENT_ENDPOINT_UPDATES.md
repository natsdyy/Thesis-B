# Cash Movement Endpoint Updates

## Overview

Updated the Cash Movement endpoints to support budget releases to SCM/HQ (non-branch) departments. This allows tracking outflows for supply requests that aren't tied to a specific branch.

## Date

October 6, 2025

---

## Changes Made

### 1. Backend Route Updates (`backend/routes/cashMovements.js`)

#### POST `/api/cash-movements` - Create Cash Movement

**BEFORE:**

```javascript
// Required branch_id (would fail for SCM movements)
if (!branch_id || !movement_type || !amount) {
  return res.status(400).json({
    success: false,
    message: "branch_id, movement_type, and amount are required",
  });
}

const data = await CashMovement.create({
  branch_id: parseInt(branch_id), // Always required a branch_id
  // ...
});
```

**AFTER:**

```javascript
// branch_id is now optional for HQ/SCM movements
if (!movement_type || amount === undefined || amount === null) {
  return res.status(400).json({
    success: false,
    message: "movement_type and amount are required",
  });
}

const data = await CashMovement.create({
  branch_id: branch_id ? parseInt(branch_id) : null, // Can be null
  // ...
});
```

**Why:**

- SCM supply requests don't have a branch_id (they're for headquarters/central supply)
- Budget releases for these requests need to create cash movements with `branch_id: null`
- Previous validation would reject these requests

---

#### GET `/api/cash-movements` - List Cash Movements

**ADDED FEATURE:**

```javascript
{
  branch_id,
  movement_type,
  date_from,
  date_to,
  limit,
  offset,
  include_non_branch, // ✨ NEW PARAMETER
}
```

**Filter Behavior:**

- `include_non_branch=false` (default): Only show movements with branch_id
- `include_non_branch=true`: Show both branch and non-branch movements
- `branch_id=X`: Show only movements for specific branch (ignores include_non_branch)

**Why:**

- By default, showing only branch movements maintains backward compatibility
- Finance users can choose to view HQ/SCM movements by setting `include_non_branch=true`
- Branch-specific views remain unaffected

---

### 2. Model Updates (`backend/models/CashMovement.js`)

#### Enhanced `list()` Method

**BEFORE:**

```javascript
static async list(filters = {}) {
  // ...
  if (branch_id) q.where("cm.branch_id", branch_id);
  // No handling for non-branch movements
}
```

**AFTER:**

```javascript
static async list(filters = {}) {
  const { include_non_branch = false } = filters;

  // Handle branch_id filtering with support for non-branch movements
  if (branch_id) {
    q.where("cm.branch_id", branch_id);
  } else if (!include_non_branch) {
    // Default: show only movements with branches
    q.whereNotNull("cm.branch_id");
  }
  // If include_non_branch is true: show all movements
}
```

**Logic:**

1. If `branch_id` specified → Show only that branch
2. If no `branch_id` AND `include_non_branch=false` → Show all branches (exclude null)
3. If no `branch_id` AND `include_non_branch=true` → Show everything (include null)

---

### 3. Store Updates (`frontend/src/stores/budgetReleaseStore.js`)

**Updated refresh calls:**

```javascript
await cashMovementStore.fetchMovements({
  limit: 50,
  offset: 0,
  include_non_branch: true, // ✨ NEW: Include HQ/SCM budget release movements
});
```

**Why:**

- When a budget is released (could be for SCM), we want to show that outflow
- Setting `include_non_branch: true` ensures non-branch movements appear in the list
- Users will see budget release outflows regardless of whether they're for a branch or HQ/SCM

---

## API Examples

### Example 1: Create Budget Release Movement for SCM

**Request:**

```http
POST /api/cash-movements
Content-Type: application/json

{
  "branch_id": null,
  "movement_type": "out",
  "amount": 10000.00,
  "source": "budget_release",
  "reference_id": "43",
  "reference_type": "budget_release",
  "notes": "Budget released for Egg restock (BR2025043) - SCM"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 16,
    "branch_id": null,
    "movement_type": "out",
    "amount": "10000.00",
    "source": "budget_release",
    "reference_id": "43",
    "reference_type": "budget_release",
    "notes": "Budget released for Egg restock (BR2025043) - SCM",
    "occurred_at": "2025-10-06T...",
    "branch_name": null
  },
  "message": "Cash movement created successfully"
}
```

---

### Example 2: List All Cash Movements (Including Non-Branch)

**Request:**

```http
GET /api/cash-movements?include_non_branch=true&limit=50&offset=0
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 16,
      "branch_id": null,
      "movement_type": "out",
      "amount": "10000.00",
      "source": "budget_release",
      "reference_id": "43",
      "reference_type": "budget_release",
      "notes": "Budget released for Egg restock (BR2025043) - SCM",
      "occurred_at": "2025-10-06T...",
      "branch_name": null
    },
    {
      "id": 15,
      "branch_id": 6,
      "movement_type": "in",
      "amount": "2925.00",
      "source": "remittance",
      "reference_id": "47",
      "reference_type": "branch_remittance",
      "notes": "Remittance for today",
      "occurred_at": "2025-10-05T...",
      "branch_name": "Burol Main Branch"
    }
  ],
  "pagination": {
    "total": 16,
    "limit": 50,
    "offset": 0,
    "pages": 1
  }
}
```

---

### Example 3: List Only Branch Cash Movements (Default)

**Request:**

```http
GET /api/cash-movements?limit=50&offset=0
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 15,
      "branch_id": 6,
      "movement_type": "in",
      "amount": "2925.00",
      "source": "remittance",
      "notes": "Remittance for today",
      "branch_name": "Burol Main Branch"
    }
    // ... only movements with branch_id
  ]
}
```

_Note: Movement with `branch_id: null` is excluded by default_

---

## Database Schema Support

The migration `20250206000000_make_cash_movements_branch_id_nullable.js` already made `branch_id` nullable:

```javascript
// cash_movements table
{
  id: integer (PK),
  branch_id: integer (nullable), // ✅ Can be null for HQ/SCM
  movement_type: enum('in', 'out'),
  amount: decimal(15, 2),
  source: string(50),
  reference_id: string(50),
  reference_type: string(50),
  notes: text,
  occurred_at: timestamp
}
```

---

## Integration Flow

### Complete Flow: Budget Release to Cash Movement

```
1. Finance releases budget for SCM supply request
   ↓
2. BudgetRelease.create() in transaction:
   - Creates budget_releases record
   - Deducts from finance_balances.capital
   - Creates cash_movements record:
     {
       branch_id: null,        // SCM has no branch
       movement_type: "out",
       amount: 10000.00,
       source: "budget_release",
       reference_type: "budget_release",
       notes: "Budget released for Egg restock (BR2025043) - SCM"
     }
   ↓
3. Frontend budgetReleaseStore refreshes:
   - financeBalanceStore.fetchTotals()
   - cashMovementStore.fetchMovements({ include_non_branch: true })
   ↓
4. UI Updates:
   - CurrentBalance shows decreased capital
   - CashMovement shows new outflow (even though branch_id is null)
```

---

## Testing

### Test Case 1: Create Non-Branch Cash Movement

```bash
curl -X POST http://localhost:5000/api/cash-movements \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "movement_type": "out",
    "amount": 5000,
    "source": "budget_release",
    "reference_id": "45",
    "reference_type": "budget_release",
    "notes": "Test SCM budget release"
  }'
```

**Expected:** ✅ Success (no branch_id required)

---

### Test Case 2: List with Non-Branch Movements

```bash
curl "http://localhost:5000/api/cash-movements?include_non_branch=true" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** ✅ Returns both branch and non-branch movements

---

### Test Case 3: List without Non-Branch Movements (Default)

```bash
curl "http://localhost:5000/api/cash-movements" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** ✅ Returns only movements with branch_id (excludes null)

---

## Backward Compatibility

✅ **Fully Backward Compatible**

1. **Existing API calls work unchanged:**
   - POST with branch_id still works
   - GET without filters returns branch movements only

2. **Existing frontend code unaffected:**
   - Components can continue using old filter parameters
   - New parameter is optional

3. **Database queries maintain performance:**
   - Added index on branch_id already exists
   - Query optimizer handles null checks efficiently

---

## Frontend Display Logic

### CurrentBalance.vue

- Shows aggregated totals (includes all movements)
- Not affected by branch_id filtering

### CashMovement.vue

- Displays all movements when refreshed from budget release
- Shows "—" or empty for branch_name when branch_id is null
- Already handles null values gracefully

```vue
<td>{{ movement.branch_name || '—' }}</td>
```

---

## Benefits

1. **✅ Supports Non-Branch Requests**
   - SCM supply requests can create cash movements
   - HQ-level budget releases are tracked

2. **✅ Flexible Filtering**
   - Branch managers see only their branch movements
   - Finance sees all movements (branch + non-branch)

3. **✅ Complete Audit Trail**
   - Every budget release creates a cash movement
   - Full traceability for all outflows

4. **✅ Backward Compatible**
   - Existing functionality unchanged
   - No breaking changes to API

---

## Summary

### Files Modified

- ✅ `backend/routes/cashMovements.js` - Made branch_id optional, added include_non_branch filter
- ✅ `backend/models/CashMovement.js` - Enhanced filtering logic for non-branch movements
- ✅ `frontend/src/stores/budgetReleaseStore.js` - Added include_non_branch: true when refreshing

### Key Changes

1. POST endpoint no longer requires branch_id
2. GET endpoint supports include_non_branch filter
3. Model handles null branch_id filtering
4. Store refreshes include non-branch movements

### Result

✨ **Budget releases for SCM supply requests now automatically create and display cash movements!**
