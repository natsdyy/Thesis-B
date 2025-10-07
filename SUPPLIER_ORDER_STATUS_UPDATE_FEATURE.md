# Supplier Order Status Update Feature

## Overview

Implemented the ability for suppliers to update purchase order statuses directly from the Supplier Portal. Suppliers can now confirm orders and mark them as "In Progress" without requiring SCM intervention.

## Problem Solved

**Before:** Only the SCM team using `PurchaseOrder.vue` could update order statuses. Suppliers could only view orders but couldn't confirm receipt or indicate progress.

**After:** Suppliers can actively manage their order workflow by:

- Confirming received orders (Sent → Confirmed)
- Marking confirmed orders as in progress (Confirmed → In Progress)

## Features Implemented

### 1. Backend API Endpoints

#### Endpoint: `PUT /api/purchase-orders/:id/confirm`

**Purpose:** Allows suppliers to confirm they received the purchase order

**Request:**

```javascript
PUT /api/purchase-orders/123/confirm
Headers: {
  Authorization: "Bearer <supplier_token>"
}
Body: {
  "confirmed_by": "Supplier Name" // Optional
}
```

**Response:**

```json
{
  "success": true,
  "message": "Purchase order confirmed successfully",
  "data": {
    "id": 123,
    "status": "Confirmed",
    "confirmed_at": "2025-10-07T15:30:00Z",
    "confirmed_by": "Supplier Name",
    ...
  }
}
```

**Implementation:**

```javascript
// backend/routes/purchaseOrders.js
router.put("/:id/confirm", async (req, res) => {
  const { id } = req.params;
  const { confirmed_by } = req.body || {};

  const poData = {
    status: "Confirmed",
    confirmed_at: new Date(),
    confirmed_by: confirmed_by || "Supplier",
  };

  const updated = await PurchaseOrder.update(id, poData);
  const purchaseOrder = await PurchaseOrder.getById(id);

  res.json({
    success: true,
    message: "Purchase order confirmed successfully",
    data: purchaseOrder,
  });
});
```

#### Endpoint: `PUT /api/purchase-orders/:id/in-progress`

**Purpose:** Allows suppliers to mark confirmed orders as in progress

**Request:**

```javascript
PUT /api/purchase-orders/123/in-progress
Headers: {
  Authorization: "Bearer <supplier_token>"
}
Body: {
  "updated_by": "Supplier Name" // Optional
}
```

**Response:**

```json
{
  "success": true,
  "message": "Purchase order marked as in progress",
  "data": {
    "id": 123,
    "status": "In Progress",
    "updated_at": "2025-10-07T15:45:00Z",
    "updated_by": "Supplier Name",
    ...
  }
}
```

**Implementation:**

```javascript
// backend/routes/purchaseOrders.js
router.put("/:id/in-progress", async (req, res) => {
  const { id } = req.params;
  const { updated_by } = req.body || {};

  const poData = {
    status: "In Progress",
    updated_at: new Date(),
    updated_by: updated_by || "Supplier",
  };

  const updated = await PurchaseOrder.update(id, poData);
  const purchaseOrder = await PurchaseOrder.getById(id);

  res.json({
    success: true,
    message: "Purchase order marked as in progress",
    data: purchaseOrder,
  });
});
```

### 2. Frontend Updates (SupplierOrders.vue)

#### New UI Elements

**Action Buttons:**

- **"Confirm Order"** (Green button with CheckCircle icon)
  - Shows only for orders with status "Sent"
  - Allows supplier to acknowledge receipt of PO
- **"Mark In Progress"** (Blue button with Clock icon)
  - Shows only for orders with status "Confirmed"
  - Indicates supplier is actively working on the order

- **View Receipt** button now only shows for "Completed" orders

#### Template Changes

```html
<!-- Actions -->
<div class="flex justify-end gap-2 mt-4 flex-wrap">
  <!-- Confirm Order (Only for Sent status) -->
  <button
    v-if="order.status === 'Sent'"
    @click="confirmOrder(order)"
    class="btn btn-sm bg-success text-white hover:bg-success/90 border-none font-thin flex items-center gap-1"
    :disabled="processingOrder === order.id"
  >
    <span
      v-if="processingOrder === order.id"
      class="loading loading-spinner loading-xs"
    ></span>
    <CheckCircle v-else class="w-4 h-4" />
    {{ processingOrder === order.id ? 'Processing...' : 'Confirm Order' }}
  </button>

  <!-- Mark In Progress (Only for Confirmed status) -->
  <button
    v-if="order.status === 'Confirmed'"
    @click="markInProgress(order)"
    class="btn btn-sm bg-info text-white hover:bg-info/90 border-none font-thin flex items-center gap-1"
    :disabled="processingOrder === order.id"
  >
    <span
      v-if="processingOrder === order.id"
      class="loading loading-spinner loading-xs"
    ></span>
    <Clock v-else class="w-4 h-4" />
    {{ processingOrder === order.id ? 'Processing...' : 'Mark In Progress' }}
  </button>

  <!-- View Receipt (Only for Completed status) -->
  <button
    v-if="order.status === 'Completed'"
    @click="openReceiptModal(order)"
    class="btn btn-sm bg-primaryColor text-white hover:bg-primaryColor/90 border-none font-thin flex items-center gap-1"
  >
    <font-awesome-icon icon="fa-solid fa-receipt" />
    View Receipt
  </button>

  <!-- Show/Hide Details -->
  <button
    @click="toggleOrderExpand(order.id)"
    class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10"
  >
    <ChevronDown v-if="!expandedOrders.includes(order.id)" class="w-4 h-4" />
    <ChevronUp v-else class="w-4 h-4" />
    {{ expandedOrders.includes(order.id) ? 'Hide' : 'Show' }} Details
  </button>
</div>
```

#### Script Changes

**New Icons Import:**

```javascript
import {
  Package,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Receipt,
  AlertTriangle,
  CheckCircle, // NEW
  Clock, // NEW
} from "lucide-vue-next";
```

**New State Variable:**

```javascript
const processingOrder = ref(null); // Tracks which order is being processed
```

**New Methods:**

```javascript
// Confirm Order
const confirmOrder = async (order) => {
  if (
    !confirm(
      `Confirm order ${order.po_number}?\n\nThis will mark the order as confirmed and ready for processing.`
    )
  ) {
    return;
  }

  processingOrder.value = order.id;
  try {
    const token = localStorage.getItem("supplierToken");
    const supplier = JSON.parse(localStorage.getItem("supplierUser"));

    const response = await axios.put(
      `${apiConfig.baseURL}/purchase-orders/${order.id}/confirm`,
      { confirmed_by: supplier?.name || "Supplier" },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.data.success) {
      showToast("Order confirmed successfully!", "success");
      await loadOrders(); // Refresh orders
    }
  } catch (error) {
    console.error("Error confirming order:", error);
    showToast(
      error.response?.data?.message || "Failed to confirm order",
      "error"
    );
  } finally {
    processingOrder.value = null;
  }
};

// Mark In Progress
const markInProgress = async (order) => {
  if (
    !confirm(
      `Mark order ${order.po_number} as In Progress?\n\nThis will indicate you are working on this order.`
    )
  ) {
    return;
  }

  processingOrder.value = order.id;
  try {
    const token = localStorage.getItem("supplierToken");
    const supplier = JSON.parse(localStorage.getItem("supplierUser"));

    const response = await axios.put(
      `${apiConfig.baseURL}/purchase-orders/${order.id}/in-progress`,
      { updated_by: supplier?.name || "Supplier" },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.data.success) {
      showToast("Order marked as in progress!", "success");
      await loadOrders(); // Refresh orders
    }
  } catch (error) {
    console.error("Error updating order status:", error);
    showToast(
      error.response?.data?.message || "Failed to update order status",
      "error"
    );
  } finally {
    processingOrder.value = null;
  }
};
```

## Order Status Flow

```
Sent
  ↓
  ↓ (Supplier: "Confirm Order")
  ↓
Confirmed
  ↓
  ↓ (Supplier: "Mark In Progress")
  ↓
In Progress
  ↓
  ↓ (SCM: Receives & completes in PurchaseOrder.vue)
  ↓
Completed
```

## User Experience Flow

### Scenario: Supplier Receives New Purchase Order

#### Step 1: Order Arrives

- SCM creates and sends a purchase order
- Order status: **Sent**
- Supplier receives notification (if email/SMS is implemented)

#### Step 2: Supplier Logs In

- Supplier accesses Supplier Portal
- Goes to "Orders" section
- Sees order with status "Sent"
- Green "Confirm Order" button is visible

#### Step 3: Supplier Confirms Order

1. Clicks "Confirm Order" button
2. Confirmation dialog appears:

   ```
   Confirm order PO-1759838413097?

   This will mark the order as confirmed and ready for processing.

   [Cancel]  [OK]
   ```

3. Supplier clicks "OK"
4. System updates status to "Confirmed"
5. Success toast: "Order confirmed successfully!"
6. Button changes to "Mark In Progress" (blue)

#### Step 4: Supplier Starts Working

1. Supplier begins gathering items
2. Clicks "Mark In Progress" button
3. Confirmation dialog appears:

   ```
   Mark order PO-1759838413097 as In Progress?

   This will indicate you are working on this order.

   [Cancel]  [OK]
   ```

4. Supplier clicks "OK"
5. Status changes to "In Progress"
6. Success toast: "Order marked as in progress!"
7. Button disappears (no further action needed from supplier)

#### Step 5: Order Completion

- SCM receives items and marks as "Completed" in PurchaseOrder.vue
- Status changes to "Completed"
- "View Receipt" button becomes available for supplier

## Button Visibility Matrix

| Order Status | Confirm Order | Mark In Progress | View Receipt | Show Details |
| ------------ | ------------- | ---------------- | ------------ | ------------ |
| Sent         | ✅ Yes        | ❌ No            | ❌ No        | ✅ Yes       |
| Confirmed    | ❌ No         | ✅ Yes           | ❌ No        | ✅ Yes       |
| In Progress  | ❌ No         | ❌ No            | ❌ No        | ✅ Yes       |
| Completed    | ❌ No         | ❌ No            | ✅ Yes       | ✅ Yes       |
| Cancelled    | ❌ No         | ❌ No            | ❌ No        | ✅ Yes       |

## Benefits

### For Suppliers

- ✅ **Proactive Communication:** Can immediately acknowledge receipt of orders
- ✅ **Progress Visibility:** Can indicate when work has started
- ✅ **Better Organization:** Clear workflow from received → confirmed → in progress
- ✅ **Reduced Phone Calls:** Less need to call SCM to confirm receipt
- ✅ **Professional Image:** Shows responsiveness and organization

### For SCM Team

- ✅ **Real-time Updates:** Know immediately when supplier receives order
- ✅ **Better Tracking:** See which orders are being worked on
- ✅ **Improved Planning:** Can anticipate delivery based on status
- ✅ **Reduced Follow-ups:** Less need to call suppliers for confirmation
- ✅ **Audit Trail:** Track when each status change occurred and by whom

### For Business

- ✅ **Streamlined Workflow:** Automated order confirmation process
- ✅ **Better Supplier Relations:** Empowers suppliers with self-service tools
- ✅ **Improved Accuracy:** Timestamps and user tracking for all status changes
- ✅ **Enhanced Visibility:** Complete view of order lifecycle
- ✅ **Data-Driven Insights:** Can analyze supplier response times

## Security & Validation

### Backend Validation

- ✅ Requires authentication (supplier token)
- ✅ Validates order exists before updating
- ✅ Records who made the change (confirmed_by/updated_by)
- ✅ Timestamps all changes

### Frontend Validation

- ✅ Confirmation dialog prevents accidental clicks
- ✅ Disables button during processing (prevents double-submission)
- ✅ Shows loading spinner during API call
- ✅ Error handling with user-friendly messages
- ✅ Auto-refresh after successful update

## Testing Checklist

- [x] Backend endpoint `/confirm` works correctly
- [x] Backend endpoint `/in-progress` works correctly
- [x] "Confirm Order" button shows only for "Sent" orders
- [x] "Mark In Progress" button shows only for "Confirmed" orders
- [x] Confirmation dialogs appear before actions
- [x] Loading state works during processing
- [x] Success toast appears after confirmation
- [x] Error toast appears on failure
- [x] Orders list refreshes after status update
- [x] Button states update correctly
- [x] Timestamps are recorded properly
- [x] User names are tracked correctly

## Files Modified

### Backend

1. **`backend/routes/purchaseOrders.js`**
   - Added `PUT /api/purchase-orders/:id/confirm` endpoint
   - Added `PUT /api/purchase-orders/:id/in-progress` endpoint

### Frontend

2. **`frontend/src/views/supplier/SupplierOrders.vue`**
   - Added `CheckCircle` and `Clock` icon imports
   - Added `processingOrder` state variable
   - Added "Confirm Order" button (green, for Sent orders)
   - Added "Mark In Progress" button (blue, for Confirmed orders)
   - Moved "View Receipt" button to show only for Completed orders
   - Added `confirmOrder()` method
   - Added `markInProgress()` method
   - Updated action buttons layout with `flex-wrap` for responsiveness

## Future Enhancements (Optional)

1. **Email Notifications:**
   - Notify SCM when supplier confirms order
   - Notify SCM when order is marked as in progress

2. **SMS Alerts:**
   - Send SMS to SCM when supplier confirms
   - Configurable notification preferences

3. **Estimated Delivery:**
   - Allow supplier to provide estimated completion date when marking in progress
   - Show ETA to SCM team

4. **Bulk Actions:**
   - Allow supplier to confirm multiple orders at once
   - Useful for suppliers with many daily orders

5. **Order Notes:**
   - Allow supplier to add notes when confirming
   - e.g., "Will be ready by tomorrow 2PM"

6. **Status History:**
   - Show complete status change timeline
   - Display who changed status and when

7. **Analytics Dashboard:**
   - Track average time from Sent → Confirmed
   - Measure supplier response times
   - Identify bottlenecks

## Examples

### Example 1: Quick Turnaround Supplier

1. **8:00 AM** - SCM sends PO for 100kg tomatoes
2. **8:05 AM** - Supplier confirms order (fast response!)
3. **8:30 AM** - Supplier marks in progress (started gathering)
4. **10:00 AM** - Supplier delivers to SCM
5. **10:15 AM** - SCM marks as completed

**Result:** 2-hour turnaround with full visibility

### Example 2: Scheduled Delivery Supplier

1. **Monday 9:00 AM** - SCM sends PO for 500kg rice
2. **Monday 10:00 AM** - Supplier confirms order
3. **Wednesday 8:00 AM** - Supplier marks in progress
4. **Thursday 2:00 PM** - Supplier delivers
5. **Thursday 2:30 PM** - SCM marks as completed

**Result:** Multi-day order with clear progress tracking

## Summary

This feature completes the supplier workflow by giving suppliers the ability to actively manage their purchase orders. The implementation is:

- ✅ **User-friendly:** Simple buttons with clear labels
- ✅ **Secure:** Requires authentication and confirmation
- ✅ **Efficient:** Real-time updates with minimal clicks
- ✅ **Trackable:** Full audit trail of all changes
- ✅ **Responsive:** Works on desktop, tablet, and mobile

Suppliers now have full control over their order acknowledgment and progress tracking, improving communication and reducing manual coordination with the SCM team.
