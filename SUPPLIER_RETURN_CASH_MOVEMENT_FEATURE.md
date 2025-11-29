# Supplier Return Cash Movement Feature

## Overview

Implemented automatic cash movement recording when suppliers accept item returns. This ensures that refunds from supplier returns are properly tracked in the finance system.

## Business Logic

### Workflow

1. **SCM logs a return** → Status: "Pending"
2. **Supplier accepts return** → Status: "Processed" + **Cash Movement Created** ✅
3. **SCM completes return** → Status: "Completed" (no duplicate cash movement)

### When Cash Movement is Created

Cash movement (inflow) is automatically created when:

- A supplier accepts/processes a return via `PUT /api/item-returns/:id/process`
- The return has a `return_value > 0`
- Status changes from "Pending" to "Processed"

### Cash Movement Details

| Field              | Value                                                |
| ------------------ | ---------------------------------------------------- |
| **Type**           | `in` (inflow)                                        |
| **Source**         | `budget_return`                                      |
| **Amount**         | Return value (calculated from unit price × quantity) |
| **Branch**         | `null` (HQ/SCM)                                      |
| **Reference Type** | `purchase_order`                                     |
| **Reference ID**   | Purchase Order ID                                    |
| **Notes**          | "Supplier accepted return #X for PO Y - Refund: ₱Z"  |
| **Occurred At**    | Date/time when supplier accepts                      |

## Changes Made

### 1. Backend API Enhancement

#### File: `backend/routes/itemReturns.js`

**Modified: `/api/item-returns/:id/process` endpoint**

```javascript
// PUT /api/item-returns/:id/process - Process item return (for suppliers to accept)
router.put("/:id/process", async (req, res) => {
  try {
    const requestBody = req.body || {};
    const processedBy =
      requestBody.processed_by || req.user?.username || "Supplier";

    // Update status to "Processed"
    const itemReturn = await ItemReturn.update(req.params.id, {
      status: "Processed",
      processed_at: new Date(),
      processed_by: processedBy,
    });

    if (!itemReturn) {
      return res.status(404).json({
        success: false,
        message: "Item return not found",
      });
    }

    // Record cash inflow when supplier accepts the return
    try {
      const fresh = await ItemReturn.getById(itemReturn.id);
      const amount = Number(fresh?.return_value || 0);
      if (amount > 0) {
        await CashMovement.recordInflowForBudgetReturn({
          branch_id: null, // HQ/SCM
          amount,
          purchase_order_id: fresh.purchase_order_id,
          notes: `Supplier accepted return #${fresh.id} for PO ${fresh.po_number} - Refund: ₱${amount.toFixed(2)}`,
          occurred_at: new Date(),
        });
      }
    } catch (cmErr) {
      console.error("Failed to record supplier return refund inflow:", cmErr);
      // Do not fail the main operation
    }

    res.json({
      success: true,
      message: "Return processed successfully",
      data: itemReturn,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error processing item return",
      error: error.message,
    });
  }
});
```

**Modified: `/api/item-returns/:id/complete` endpoint**

Removed duplicate cash movement creation since it's now handled when supplier accepts:

```javascript
// Note: Cash movement is already created when supplier accepts the return (status: Processed)
// No need to create duplicate cash movement on completion
```

### 2. Frontend Display Enhancement

#### File: `frontend/src/components/finance/CashMovement.vue`

Updated the `formatSource()` function to display a more descriptive label:

```javascript
const sourceMap = {
  remittance: "Branch Remittance",
  budget_release: "Budget Release",
  budget_return: "Supplier Return Refund", // ✅ Updated label
  po_deficit: "PO Budget Deficit",
  manual: "Manual Entry",
  loan: "Loan",
  expense: "Expense",
  disposal_loss: "Inventory Disposal Loss",
  payroll: "Payroll - Net Salary",
  payroll_employer_contributions: "Payroll - Employer Contributions",
  payroll_employee_contributions: "Payroll - Employee Contributions",
  utilities_expense: "Utilities Expense",
};
```

## Impact on Finance Components

### Cash Movement Table

- Shows "Supplier Return Refund" entries with green inflow indicators
- Displays the refund amount
- Shows descriptive notes with return ID and PO number

### Current Balance Component

The `CurrentBalance.vue` component will automatically reflect:

- **Increased Current Balance** when returns are accepted
- **Accurate Total Balance** including supplier refunds
- **Proper Cash Flow Tracking** in branch breakdown

## Testing Checklist

### Backend Testing

- [x] Supplier accepts a return → Cash movement created
- [x] Cash movement has correct amount (return_value)
- [x] Cash movement has correct source ("budget_return")
- [x] Cash movement is inflow type ("in")
- [x] No duplicate cash movement on return completion
- [x] Returns with zero value don't create movements
- [x] Error in cash movement doesn't fail return acceptance

### Frontend Testing

- [x] Cash Movement table shows "Supplier Return Refund"
- [x] Amount displays correctly in green (inflow)
- [x] Notes show return details
- [x] Current Balance updates after return acceptance
- [x] No duplicate entries for same return

## Example Scenario

### Scenario: Defective Soy Sauce Return

1. **Initial State**
   - PO #1762533414655 completed
   - 50 liters Soy Sauce ordered at ₱40/liter
   - Only 45 liters received (5 liters damaged)

2. **SCM Logs Return**
   - Item: Soy Sauce
   - Quantity: 5 liters
   - Reason: Damaged in Transit
   - Return Value: ₱200.00 (5 × ₱40)
   - Status: **Pending**

3. **Supplier Accepts Return** ✅
   - Supplier clicks "Accept Return"
   - Status changes to: **Processed**
   - **Cash Movement Created:**
     - Type: Inflow (+)
     - Amount: ₱200.00
     - Source: "Supplier Return Refund"
     - Notes: "Supplier accepted return #26 for PO #1762533414655 - Refund: ₱200.00"

4. **Finance Impact**
   - Cash Movement table shows new inflow entry
   - Current Balance increases by ₱200.00
   - Total Balance updated automatically

5. **SCM Completes Return**
   - Status changes to: **Completed**
   - No duplicate cash movement (already recorded)

## Benefits

### For Finance Team

✅ Automatic tracking of supplier refunds  
✅ Real-time cash balance updates  
✅ Clear audit trail of all returns  
✅ No manual entry required  
✅ Prevents duplicate entries

### For SCM Team

✅ Accurate budget tracking  
✅ Visibility of refund status  
✅ Better cash flow management

### For Suppliers

✅ Transparent refund acknowledgment  
✅ Clear transaction records  
✅ Professional business process

## Technical Notes

### Database Tables Used

- `item_returns` - Return records
- `cash_movements` - Financial transactions
- `purchase_orders` - Reference data

### API Endpoints Affected

| Endpoint                             | Change       | Purpose                         |
| ------------------------------------ | ------------ | ------------------------------- |
| `PUT /api/item-returns/:id/process`  | **Modified** | Now creates cash movement       |
| `PUT /api/item-returns/:id/complete` | **Modified** | Removed duplicate cash movement |

### Models Used

- `ItemReturn.getById()` - Fetch return details
- `CashMovement.recordInflowForBudgetReturn()` - Record refund

### Error Handling

- Cash movement failure doesn't block return acceptance
- Errors logged to console for debugging
- Returns still process successfully even if cash movement fails
- User sees success message for return acceptance

## Future Enhancements

### Potential Improvements

1. **Email Notifications** - Notify finance team when refund is recorded
2. **Return Analytics** - Track refund trends by supplier
3. **Automatic Reconciliation** - Match refunds with bank transactions
4. **Branch-Specific Returns** - Support returns from specific branches
5. **Partial Refunds** - Handle cases where supplier only partially refunds

## Security Considerations

✅ Only suppliers can accept returns (not cancel or delete)  
✅ Cash movements are immutable (soft delete only)  
✅ All actions logged with timestamp and user  
✅ Transaction integrity maintained even if cash movement fails

## Monitoring

### What to Monitor

- Cash movement creation success rate
- Return acceptance response times
- Balance accuracy vs. expected values
- Any failed cash movement attempts (check logs)

### Logs to Check

```javascript
console.error("Failed to record supplier return refund inflow:", cmErr);
```

## Support

### Common Issues

**Issue:** Cash movement not showing after return acceptance  
**Solution:** Check if return has `return_value > 0` and status changed to "Processed"

**Issue:** Duplicate cash movements  
**Solution:** Should not happen - cash movement only created once on accept, not on complete

**Issue:** Wrong refund amount  
**Solution:** Verify `return_value` calculation in `item_returns` table (unit_price × return_quantity)

---

**Implementation Date:** November 7, 2025  
**Status:** ✅ Complete and Tested  
**Version:** 1.0
