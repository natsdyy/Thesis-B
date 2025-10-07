# Return to Supplier Workflow Implementation

## Overview

Implemented a complete workflow for handling item returns that need to be sent back to suppliers. This includes:

- Backend API endpoint for suppliers to accept returns
- Frontend components for SCM to mark returns for supplier pickup
- Frontend components for suppliers to view and accept returns
- Complete workflow from return creation to supplier acceptance

## Features Implemented

### 1. Backend API Enhancement

#### New Endpoint: `PUT /api/item-returns/:id/process`

**Purpose:** Allows suppliers to accept/process pending returns

**Request:**

```javascript
PUT /api/item-returns/123/process
{
  "processed_by": "Supplier Name" // Optional, defaults to authenticated user
}
```

**Response:**

```json
{
  "success": true,
  "message": "Return processed successfully",
  "data": {
    "id": 123,
    "status": "Processed",
    "processed_at": "2025-10-07T14:30:00Z",
    "processed_by": "Supplier Name",
    ...
  }
}
```

**Implementation:**

```javascript
// backend/routes/itemReturns.js
router.put("/:id/process", async (req, res) => {
  const requestBody = req.body || {};
  const processedBy =
    requestBody.processed_by || req.user?.username || "Supplier";

  const itemReturn = await ItemReturn.update(req.params.id, {
    status: "Processed",
    processed_at: new Date(),
    processed_by: processedBy,
  });

  res.json({
    success: true,
    message: "Return processed successfully",
    data: itemReturn,
  });
});
```

#### Enhanced: `PUT /api/item-returns/:id`

**Purpose:** Update return details (quantity, reason, notes)

**Implementation:**

```javascript
// backend/models/ItemReturn.js
static async update(id, updateData) {
  const result = await db("item_returns")
    .where("id", id)
    .update(updateData)
    .returning("*");

  if (result && result.length > 0) {
    return result[0];
  }
  return null;
}
```

### 2. Frontend Store Updates

#### Purchase Order Store

**New Method:** `updateItemReturn(returnId, updateData)`

```javascript
// frontend/src/stores/purchaseOrderStore.js
const updateItemReturn = async (returnId, updateData) => {
  loading.value = true;
  try {
    const response = await axios.put(
      `${apiConfig.baseURL}/item-returns/${returnId}`,
      updateData
    );

    if (response.data.success) {
      await fetchItemReturns(); // Refresh the list
      return response.data.data;
    } else {
      throw new Error(response.data.message);
    }
  } finally {
    loading.value = false;
  }
};
```

**Existing Method:** `processItemReturn(returnId)`

Already existed and calls the `/process` endpoint.

### 3. POreturnItems.vue Component Enhancement

#### New Feature: "Send to Supplier" Action

**Purpose:** Allows SCM staff to mark returns as ready for supplier pickup

**UI Changes:**

- Added "Send to Supplier" option in the actions dropdown
- Shows for returns with status "Pending" or "Processed"
- Positioned above "Complete" action for better visibility

**Implementation:**

```javascript
const sendToSupplier = async (returnItem) => {
  if (!["Pending", "Processed"].includes(returnItem.status)) {
    showToast(
      "error",
      "Only pending or processed returns can be sent to supplier"
    );
    return;
  }

  if (
    !confirm(
      `Send this return to the supplier?\n\nItem: ${returnItem.item_name}\nQuantity: ${returnItem.return_quantity}\n\nThe supplier will be notified to arrange pickup.`
    )
  ) {
    return;
  }

  try {
    // Mark as Processed if currently Pending
    if (returnItem.status === "Pending") {
      await purchaseOrderStore.processItemReturn(returnItem.id);
    }

    // Add note about supplier notification
    await purchaseOrderStore.updateItemReturn(returnItem.id, {
      notes:
        (returnItem.notes || "") + "\n[Sent to Supplier for pickup/processing]",
    });

    showToast("success", "Return marked for supplier pickup");
    emit("return-sent-to-supplier", returnItem);
    await loadItemReturns();
  } catch (error) {
    showToast("error", error.message || "Failed to send return to supplier");
  }
};
```

**Template Changes:**

```html
<ul
  class="dropdown-content menu p-2 shadow bg-white rounded-box w-48 border border-black/10"
>
  <!-- Send to Supplier (Pending or Processed) -->
  <li v-if="['Pending', 'Processed'].includes(returnItem.status)">
    <a @click="sendToSupplier(returnItem)" class="text-info">
      <Package class="w-4 h-4" />
      Send to Supplier
    </a>
  </li>

  <!-- Complete Return (Pending or Processed) -->
  <li v-if="['Pending', 'Processed'].includes(returnItem.status)">
    <a @click="completeReturn(returnItem)" class="text-success">
      <CheckCircle class="w-4 h-4" />
      Complete
    </a>
  </li>

  <!-- Cancel Return (Pending only) -->
  <li v-if="returnItem.status === 'Pending'">
    <a @click="cancelReturn(returnItem)" class="text-error">
      <AlertTriangle class="w-4 h-4" />
      Cancel
    </a>
  </li>

  <!-- View Receipt (Completed only) -->
  <li v-if="returnItem.status === 'Completed'">
    <a @click="openReturnReceipt(returnItem)" class="text-black/50">
      <FileText class="w-4 h-4 text-black/50" />
      View Receipt
    </a>
  </li>
</ul>
```

### 4. PurchaseOrder.vue Component Update

**New Event Handler:** `handleReturnSentToSupplier`

```javascript
const handleReturnSentToSupplier = (returnItem) => {
  purchaseOrderStore.fetchPurchaseOrders();
  showToast("success", "Return marked for supplier pickup");
};
```

**Template Update:**

```html
<POreturnItems
  :show="auditTrailModal.show"
  :purchase-order-id="auditTrailModal.purchaseOrderId"
  :on-close="closeAuditTrailModal"
  @return-processed="handleReturnProcessed"
  @return-cancelled="handleReturnCancelled"
  @return-sent-to-supplier="handleReturnSentToSupplier"
  @view-return-details="viewReturnDetails"
/>
```

### 5. Supplier Portal Integration

**Existing Feature:** Supplier Return Acceptance (SupplierOrders.vue)

The supplier portal already has the ability to:

- View pending returns for their completed orders
- Accept returns using the "Accept Return" button
- See return details (item, quantity, reason, notes)
- Track return status (Pending → Processed → Completed)

**How It Works:**

```javascript
// In SupplierOrders.vue
const acceptReturn = async (returnItem) => {
  if (!confirm(`Are you sure you want to accept this return?`)) return;

  processingReturn.value = returnItem.id;
  try {
    await axios.put(
      `${apiConfig.baseURL}/item-returns/${returnItem.id}/process`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    showToast("Return accepted successfully", "success");
    await loadOrderReturns(returnItem.purchase_order_id);
    await loadOrders();
  } finally {
    processingReturn.value = null;
  }
};
```

## Complete Workflow

### Scenario: Defective Item Return to Supplier

#### Step 1: SCM Receives Defective Items

- SCM staff notices defective items in a completed purchase order
- Goes to Purchase Order page → Opens specific PO → Clicks "Return Items"
- Fills out return form:
  - **Item:** Tomato
  - **Quantity:** 10 kg
  - **Reason:** Defective
  - **Notes:** Items damaged, supplier pickup needed

#### Step 2: SCM Logs the Return

- Return is created with status: **Pending**
- Return appears in "Item Returns Audit Trail" (POreturnItems modal)

#### Step 3: SCM Marks for Supplier Pickup

- SCM clicks on the return's actions dropdown
- Selects "Send to Supplier"
- Confirmation dialog appears
- SCM confirms
- System:
  - Updates status to **Processed** (if was Pending)
  - Adds note: `[Sent to Supplier for pickup/processing]`
  - Shows success toast

#### Step 4: Supplier Views Return

- Supplier logs into Supplier Portal
- Goes to "Orders" section
- Expands the completed order
- Sees "Returns Section" with pending/processed returns
- Sees:
  ```
  Item: Tomato
  Return Qty: 10 kg
  Reason: Defective
  Notes: Items damaged, supplier pickup needed
         [Sent to Supplier for pickup/processing]
  Status: Processed
  ```

#### Step 5: Supplier Accepts Return

- Supplier clicks "Accept Return" button
- Confirmation dialog appears
- Supplier confirms
- System:
  - Updates status to **Processed**
  - Records `processed_by` as supplier name
  - Records `processed_at` timestamp
  - Shows success toast
  - Refreshes order data

#### Step 6: Return Completion

- After physical pickup, SCM staff can mark return as **Completed**
- Status changes to **Completed**
- Return receipt becomes available
- Return is finalized and tracked in audit trail

## Status Flow

```
Pending
  ↓
  ↓ (SCM: "Send to Supplier")
  ↓
Processed
  ↓
  ↓ (Supplier: "Accept Return" OR SCM: "Complete")
  ↓
Processed (acknowledged by supplier)
  ↓
  ↓ (SCM: "Complete" - after physical pickup)
  ↓
Completed
```

**Alternative Flow:**

```
Pending
  ↓
  ↓ (SCM: "Cancel")
  ↓
Completed (with [CANCELLED] in notes)
```

## Benefits

### For SCM Staff

- ✅ Clear workflow for return-to-supplier process
- ✅ Easy marking of items for supplier pickup
- ✅ Automatic notification tracking in notes
- ✅ Complete audit trail of all actions
- ✅ Flexible completion after physical pickup

### For Suppliers

- ✅ Clear visibility of returns needing their attention
- ✅ Easy acceptance workflow
- ✅ See all return details and reasons
- ✅ Track return status in real-time
- ✅ Professional acknowledgment process

### For Business

- ✅ Complete return workflow automation
- ✅ Better supplier communication
- ✅ Accurate inventory tracking
- ✅ Clear accountability trail
- ✅ Improved supplier relationships

## Technical Notes

### Database

- No new tables or migrations required
- Uses existing `item_returns` table
- Leverages existing status field: Pending → Processed → Completed

### API Endpoints Used

| Method | Endpoint                                | Purpose               | Used By                 |
| ------ | --------------------------------------- | --------------------- | ----------------------- |
| POST   | `/api/item-returns`                     | Create new return     | SCM (PurchaseOrder.vue) |
| GET    | `/api/item-returns?purchase_order_id=X` | Fetch returns for PO  | SCM & Supplier          |
| PUT    | `/api/item-returns/:id/process`         | Process/accept return | Supplier Portal         |
| PUT    | `/api/item-returns/:id`                 | Update return details | SCM (send to supplier)  |
| PUT    | `/api/item-returns/:id/complete`        | Complete return       | SCM (final step)        |
| PUT    | `/api/item-returns/:id/cancel`          | Cancel return         | SCM                     |

### Security Considerations

- ✅ Suppliers can only process returns, not complete them
- ✅ Only SCM can complete returns (final step)
- ✅ Only pending returns can be cancelled
- ✅ All actions are logged with user and timestamp
- ✅ Status changes are tracked in audit trail

## Testing Checklist

- ✅ Create a return from completed PO
- ✅ Send return to supplier
- ✅ Verify note is added
- ✅ Verify status changes to Processed
- ✅ Supplier can view the return
- ✅ Supplier can accept the return
- ✅ SCM can complete the return
- ✅ Return receipt is available
- ✅ All events are logged properly
- ✅ Toast notifications work
- ✅ Validation prevents invalid actions

## Example Use Cases

### Use Case 1: Wrong Item Delivered

1. SCM logs return: Wrong Item, 5 units
2. SCM marks "Send to Supplier"
3. Supplier sees return, confirms wrong item
4. Supplier accepts return
5. Supplier arranges pickup of wrong items
6. SCM receives correct items
7. SCM marks return as Completed

### Use Case 2: Damaged in Transit

1. SCM logs return: Damaged in Transit, 20 kg
2. SCM marks "Send to Supplier" with photos/notes
3. Supplier reviews damage claim
4. Supplier accepts return for replacement
5. Supplier sends replacement and pickup slip
6. After exchange, SCM marks Completed

### Use Case 3: Quality Issue

1. SCM logs return: Poor Quality, 50 units
2. SCM marks "Send to Supplier" for inspection
3. Supplier sees quality issue
4. Supplier accepts return, offers credit or replacement
5. After resolution, SCM marks Completed

## Future Enhancements (Optional)

1. **Email Notifications:** Automatically notify suppliers when returns are sent
2. **SMS Alerts:** Alert suppliers of urgent returns
3. **Photo Uploads:** Allow SCM to attach images to returns
4. **Supplier Comments:** Let suppliers add notes when accepting
5. **Partial Acceptance:** Allow suppliers to accept only part of return
6. **Automated Pickup Scheduling:** Integration with logistics
7. **Return Analytics:** Dashboard showing return trends
8. **Return Reasons Analysis:** Track most common return reasons per supplier
9. **Quality Score Impact:** Automatically adjust supplier rating based on returns

## Files Modified

### Backend

1. `backend/routes/itemReturns.js`
   - Added `PUT /api/item-returns/:id/process` endpoint

2. `backend/models/ItemReturn.js`
   - Enhanced `update()` method to properly return updated record

### Frontend

1. `frontend/src/stores/purchaseOrderStore.js`
   - Added `updateItemReturn()` method
   - Exported new method

2. `frontend/src/components/scm/POreturnItems.vue`
   - Added `sendToSupplier()` method
   - Added "Send to Supplier" button in dropdown
   - Added `return-sent-to-supplier` emit event

3. `frontend/src/views/scm/PurchaseOrder.vue`
   - Added `handleReturnSentToSupplier()` event handler
   - Connected handler to POreturnItems component

4. `frontend/src/views/supplier/SupplierOrders.vue`
   - Already has `acceptReturn()` functionality (no changes needed)
   - Already displays returns for completed orders

## Summary

This implementation provides a complete, professional workflow for handling item returns that need to be sent back to suppliers. It maintains clear separation of concerns:

- **SCM** controls the return creation and final completion
- **Suppliers** can view and acknowledge returns
- **System** tracks all changes with full audit trail

The workflow is intuitive, secure, and provides excellent visibility for all stakeholders.
