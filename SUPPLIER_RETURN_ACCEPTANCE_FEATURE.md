# Supplier Return Acceptance Feature

## Overview

Implemented a comprehensive return management feature in the Supplier Portal (`SupplierOrders.vue`) that allows suppliers to:

- View returned items for their completed orders
- See ordered vs received quantities with fulfillment rates
- Accept/process returns directly from the supplier portal
- Track return status and history

## Features Implemented

### 1. Enhanced Order Display

#### Ordered vs Received Quantities

- **Ordered Qty Column**: Shows the original quantity ordered
- **Received Qty Column**: Shows actual quantity received (for completed orders)
- **Color-coded Indicators**:
  - 🟢 Green: Fully received (received ≥ ordered)
  - 🟡 Yellow: Partially received (0 < received < ordered)
  - 🔴 Red: Not received (received = 0)

#### Supplier Product SKU Display

- Shows SKU badge next to item names when available
- Format: `SKU: 3-TOMATO-KG`
- Helps suppliers identify their products quickly

### 2. Delivery Summary Section

Displays for completed orders:

- **Total Ordered**: Sum of all ordered quantities
- **Total Received**: Sum of all received quantities
- **Fulfillment Rate**: Percentage with visual progress bar
  - 🟢 Green bar: ≥95% fulfillment
  - 🟡 Yellow bar: 80-94% fulfillment
  - 🔴 Red bar: <80% fulfillment
- **Pending Returns Count**: Shows if there are returns pending

### 3. Returns Management Section

#### Automatic Loading

- Returns are automatically loaded when:
  - Order is expanded (if completed)
  - Orders list is refreshed
- Shows loading spinner while fetching

#### Return Item Display

Shows for each return:

- **Item Name** and **Return Quantity**
- **Return Reason**: (Back Order, Defective, Wrong Item, etc.)
- **Status Badge**:
  - 🟡 Yellow: Pending
  - 🔵 Blue: Processed
  - 🟢 Green: Completed
- **Notes**: Additional details from SCM team
- **Logged By**: Who created the return and when

#### Supplier Actions

**For Pending Returns:**

- ✅ **Accept Return** button
  - Shows confirmation dialog with return details
  - Processes the return via API
  - Updates status to "Processed"
  - Shows success/error toast notification
  - Refreshes data automatically

- ℹ️ **View Details** button
  - Shows full return information in alert dialog

**For Processed/Completed Returns:**

- Shows status with checkmark
- Displays processing date

### 4. User Experience Enhancements

#### Toast Notifications

- Success: Green toast for accepted returns
- Error: Red toast for failed operations
- Auto-dismisses after 3 seconds

#### Refresh Capability

- Refresh button for individual order returns
- Reload button for all orders

#### Visual Feedback

- Loading spinners during operations
- Disabled buttons during processing
- Color-coded status indicators

## Technical Implementation

### New State Variables

```javascript
const orderReturns = ref({}); // Returns by order ID
const loadingReturns = ref({}); // Loading state per order
const processingReturn = ref(null); // Currently processing return ID
const toast = ref({ show: false, message: "", type: "success" });
```

### New Methods

#### `loadOrderReturns(orderId)`

Fetches returns for a specific purchase order.

```javascript
const loadOrderReturns = async (orderId) => {
  loadingReturns.value[orderId] = true;
  try {
    const response = await axios.get(
      `${apiConfig.baseURL}/item-returns?purchase_order_id=${orderId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    orderReturns.value[orderId] = response.data.data || [];
  } finally {
    loadingReturns.value[orderId] = false;
  }
};
```

#### `calculateFulfillmentRate(items)`

Calculates the fulfillment rate from order items.

```javascript
const calculateFulfillmentRate = (items) => {
  const totalOrdered = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );
  const totalReceived = items.reduce(
    (sum, item) => sum + Number(item.received_quantity || 0),
    0
  );

  return totalOrdered > 0
    ? ((totalReceived / totalOrdered) * 100).toFixed(1)
    : 0;
};
```

#### `acceptReturn(returnItem)`

Processes a return by calling the API endpoint.

```javascript
const acceptReturn = async (returnItem) => {
  // Show confirmation dialog
  if (!confirm(`Accept return for ${returnItem.item_name}?`)) return;

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
  } catch (error) {
    showToast("Failed to accept return", "error");
  } finally {
    processingReturn.value = null;
  }
};
```

### Watchers

#### Expanded Orders Watcher

Automatically loads returns when an order is expanded:

```javascript
watch(expandedOrders, (newExpanded, oldExpanded) => {
  const newlyExpanded = newExpanded.filter((id) => !oldExpanded.includes(id));

  newlyExpanded.forEach((orderId) => {
    const order = orders.value.find((o) => o.id === orderId);
    if (order && order.status === "Completed" && !orderReturns.value[orderId]) {
      loadOrderReturns(orderId);
    }
  });
});
```

## API Endpoints Used

### GET /api/item-returns?purchase_order_id={orderId}

Fetches all returns for a specific purchase order.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "purchase_order_id": 123,
      "item_name": "Tomato",
      "return_quantity": 10,
      "unit": "kg",
      "return_reason": "Defective",
      "notes": "Items damaged in transit",
      "status": "Pending",
      "logged_by": "John Doe",
      "created_at": "2025-10-07T12:00:00Z"
    }
  ]
}
```

### PUT /api/item-returns/:id/process

Processes (accepts) a return.

**Request:** Empty body
**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "Processed",
    "processed_at": "2025-10-07T14:30:00Z",
    "processed_by": "Supplier Name"
  }
}
```

## UI/UX Flow

### 1. Supplier Logs In

- Navigates to "Orders" section
- Sees list of all purchase orders

### 2. Viewing Order Details

- Clicks "Show Details" button to expand order
- Sees items table with ordered/received quantities
- Sees delivery summary with fulfillment rate

### 3. Viewing Returns

- Returns section appears automatically for completed orders
- Shows all returns with their status
- Loading spinner while fetching

### 4. Processing a Return

1. Supplier clicks "Accept Return"
2. Confirmation dialog shows return details
3. Supplier confirms acceptance
4. API call processes the return
5. Success toast appears
6. Return status updates to "Processed"
7. Data refreshes automatically

## Benefits

### For Suppliers

- ✅ Clear visibility of order fulfillment
- ✅ Easy return management
- ✅ Quick acceptance workflow
- ✅ Complete return history
- ✅ Real-time status updates

### For Business

- ✅ Streamlined return process
- ✅ Better supplier communication
- ✅ Accurate fulfillment tracking
- ✅ Improved supplier accountability
- ✅ Audit trail for all returns

## Example Scenarios

### Scenario 1: Perfect Delivery

- Order: 100 kg Tomatoes
- Received: 100 kg
- Fulfillment Rate: 100% (Green)
- Returns: None
- Supplier sees: ✓ Order fulfilled perfectly

### Scenario 2: Partial Delivery with Return

- Order: 100 kg Tomatoes
- Received: 90 kg
- Fulfillment Rate: 90% (Yellow)
- Returns: 10 kg (Defective)
- Supplier sees: Return pending acceptance
- Supplier action: Accepts return, acknowledges defect

### Scenario 3: Quality Issue

- Order: 50 kg Rice
- Received: 50 kg
- Fulfillment Rate: 100%
- Returns: 20 kg (Poor Quality)
- Supplier sees: Quality issue reported
- Supplier action: Accepts return, can investigate quality control

## Future Enhancements (Optional)

1. **Return Comments**: Allow suppliers to add notes when accepting
2. **Partial Accept**: Accept only some items from a return
3. **Return Analytics**: Dashboard showing return trends
4. **Automatic Notifications**: Email/SMS when returns are logged
5. **Return Photos**: View images of defective items
6. **Dispute Process**: Allow suppliers to dispute invalid returns
7. **Return Shipping Labels**: Generate return shipping documentation

## Testing Checklist

- ✅ Returns load for completed orders
- ✅ Fulfillment rate calculates correctly
- ✅ Accept button processes returns
- ✅ Toast notifications appear
- ✅ Data refreshes after acceptance
- ✅ Loading states work properly
- ✅ SKU badges display when available
- ✅ Color coding matches fulfillment rates
- ✅ Confirmation dialog prevents accidents
- ✅ Error handling works correctly

## Notes

- Returns only show for completed orders
- Suppliers can only process "Pending" returns
- Once processed, returns cannot be un-processed
- All actions are logged with timestamps
- The feature uses existing backend API endpoints
- No database migrations were needed
- Compatible with existing return workflow
