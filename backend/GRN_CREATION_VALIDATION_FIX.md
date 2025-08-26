# GRN Creation Validation Fix

## Issue

When a GRN fails quality inspection and creates pending returns, users were still able to create new GRNs from the same Purchase Order. This violates the business logic where pending returns must be completed before creating new GRNs.

## Root Cause

The GRN creation process was not checking for pending returns from failed GRNs. The system allowed creating new GRNs even when there were unprocessed returns.

## Solution

Implemented comprehensive validation to prevent GRN creation when there are pending returns.

### Backend Changes

#### 1. Enhanced PurchaseOrder Model (`backend/models/PurchaseOrder.js`)

- **Added `getPendingReturnsCount()` method**: Counts pending returns for failed GRNs
- **Enhanced `getAll()` method**: Now includes pending returns information in PO data
- **Existing `canCreateNewGRN()` method**: Already had the correct logic but wasn't being used

#### 2. Updated GoodsReceiptNote Model (`backend/models/GoodsReceiptNote.js`)

- **Enhanced `createFromPO()` method**: Now calls `PurchaseOrder.canCreateNewGRN()` before creating GRN
- **Added validation**: Throws error if GRN creation is not allowed

#### 3. Existing API Endpoint (`backend/routes/purchaseOrders.js`)

- **`GET /api/purchase-orders/:id/can-create-grn`**: Already existed and uses the validation logic

### Frontend Changes

#### 1. Updated PurchaseOrder.vue (`frontend/src/views/scm/PurchaseOrder.vue`)

- **Enhanced "Create GRN" button logic**: Now checks for pending returns
- **Added disabled state**: Shows "Create GRN (X Returns Pending)" when returns are pending
- **Added `hasPendingReturns()` function**: Uses backend data to determine if returns are pending
- **Improved user feedback**: Clear tooltips explaining why GRN creation is blocked

### Validation Logic

The system now prevents GRN creation when:

1. **Failed GRNs exist** with pending returns (status != "Completed")
2. **Completed/Passed GRNs exist** (items already received and processed)

The system allows GRN creation when:

1. **No GRNs exist** for the PO
2. **All returns from failed GRNs are completed**
3. **Only draft or pending_inspection GRNs exist**

### User Experience

- **Clear visual feedback**: Disabled "Create GRN" button with count of pending returns
- **Informative tooltips**: Explain why GRN creation is blocked
- **Backend validation**: Prevents creation even if frontend validation is bypassed
- **Error messages**: Clear explanation when GRN creation fails

### Testing

Created test scripts to verify the fix:

- `backend/scripts/test-grn-creation-validation.js`: Tests GRN creation validation
- `backend/scripts/test-grn-quality-inspection.js`: Tests quality inspection with decimal quantities

## Impact

- **Prevents workflow violations**: Users can no longer create GRNs while returns are pending
- **Maintains data integrity**: Ensures proper return processing before new GRN creation
- **Improves user experience**: Clear feedback about why actions are blocked
- **Backward compatibility**: Existing functionality remains unchanged
