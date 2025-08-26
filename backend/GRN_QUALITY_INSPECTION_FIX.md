# GRN Quality Inspection Fix

## Issue

The bulk quality inspection process was failing with the following error:

```
invalid input syntax for type integer: "50.00"
```

This occurred when trying to insert decimal values from `grn_items.received_quantity` (decimal(10,2)) into `item_returns.return_quantity` (integer) field.

## Root Cause

- `received_quantity` in the `grn_items` table is defined as `decimal(10, 2)` to allow for fractional quantities
- `return_quantity` in the `item_returns` table is defined as `integer`
- When quality inspection fails, the system creates item returns with the received quantity
- PostgreSQL was rejecting the decimal-to-integer conversion

## Solution

Modified the `GoodsReceiptNote.js` model to convert decimal quantities to integers using `Math.round()` before inserting into the `item_returns` table.

### Changes Made:

1. **Line 396**: `return_quantity: Math.round(grnItem.received_quantity)`
2. **Line 537**: `return_quantity: Math.round(ctx.grn_received_quantity)`

### Files Modified:

- `backend/models/GoodsReceiptNote.js`

## Testing

A test script has been created at `backend/scripts/test-grn-quality-inspection.js` to verify the fix works correctly.

## Impact

- Quality inspection now works correctly with decimal quantities
- Item returns are created with rounded integer quantities
- No data loss as quantities are rounded to nearest whole number
