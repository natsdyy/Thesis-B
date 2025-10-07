# Frontend Integration Guide for Supplier Product Features

## Overview

This guide provides recommendations for integrating the new supplier product tracking features into the frontend views. The backend models, stores, and API endpoints are all ready to use.

## Available Store Methods

### Supplier Store

```javascript
import { useSupplierStore } from "@/stores/supplierStore";

const supplierStore = useSupplierStore();

// Get product performance metrics
const performance = await supplierStore.fetchProductPerformance(supplierId);

// Get order history with received vs ordered
const history = await supplierStore.fetchOrderHistory(supplierId, 10);
```

### Purchase Order Store

```javascript
import { usePurchaseOrderStore } from "@/stores/purchaseOrderStore";

const poStore = usePurchaseOrderStore();

// Get comprehensive order statistics
const stats = await poStore.fetchOrderStatistics(purchaseOrderId);

// Get supplier product fulfillment
const fulfillment = await poStore.fetchSupplierProductFulfillment(supplierId);
```

## Recommended Updates

### 1. PurchaseOrder.vue - Receipt Modal Enhancement

**Location:** Receipt Modal (around line 4249-4470)

**Enhancement:** Display supplier product SKU alongside item names

```vue
<!-- In the items table within receiptModal -->
<tr v-for="(item, index) in receiptModal.order.items" :key="item.id">
  <td class="text-xs text-black/50">{{ index + 1 }}</td>
  <td class="text-xs text-black/50">
    {{ item.item_name }}
    <!-- NEW: Display supplier product SKU if available -->
    <span v-if="item.supplier_sku" class="badge badge-xs bg-blue-100 text-blue-800 ml-2">
      SKU: {{ item.supplier_sku }}
    </span>
  </td>
  <td class="text-xs text-black/50">{{ item.quantity || 0 }}</td>
  <!-- ... rest of columns ... -->
</tr>
```

### 2. PurchaseOrder.vue - View Modal Statistics

**Enhancement:** Add a new section to display comprehensive order statistics

```vue
<!-- Add this new section in the view/details modal -->
<div v-if="modal.type === 'view' && modal.order.status === 'Completed'"
     class="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
  <h6 class="text-sm font-semibold text-gray-800 mb-3">
    📊 Order Statistics
  </h6>

  <button
    @click="loadOrderStatistics(modal.order.id)"
    class="btn btn-sm bg-primaryColor text-white font-thin mb-3"
  >
    Load Detailed Statistics
  </button>

  <!-- Statistics display -->
  <div v-if="orderStatistics" class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
    <div class="stat-item">
      <div class="font-medium text-gray-700">Items Fully Received</div>
      <div class="text-lg font-bold text-green-600">
        {{ orderStatistics.totals.items_fully_received }}
      </div>
    </div>
    <div class="stat-item">
      <div class="font-medium text-gray-700">Partially Received</div>
      <div class="text-lg font-bold text-yellow-600">
        {{ orderStatistics.totals.items_partially_received }}
      </div>
    </div>
    <div class="stat-item">
      <div class="font-medium text-gray-700">Not Received</div>
      <div class="text-lg font-bold text-red-600">
        {{ orderStatistics.totals.items_not_received }}
      </div>
    </div>
    <div class="stat-item">
      <div class="font-medium text-gray-700">With Returns</div>
      <div class="text-lg font-bold text-orange-600">
        {{ orderStatistics.totals.items_with_returns }}
      </div>
    </div>
  </div>

  <!-- Item variance details -->
  <div v-if="orderStatistics" class="mt-4">
    <h6 class="text-xs font-semibold text-gray-700 mb-2">Item Variance:</h6>
    <div class="max-h-48 overflow-y-auto space-y-2">
      <div v-for="item in orderStatistics.items" :key="item.id"
           class="flex justify-between items-center p-2 bg-white rounded border">
        <div>
          <div class="text-xs font-medium">{{ item.item_name }}</div>
          <div class="text-xs text-gray-500">
            Ordered: {{ item.ordered_quantity }} {{ item.unit }}
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs">
            Received: {{ item.received_quantity || 0 }} {{ item.unit }}
          </div>
          <div
            class="text-xs font-medium"
            :class="{
              'text-green-600': item.variance >= 0,
              'text-red-600': item.variance < 0
            }"
          >
            Variance: {{ item.variance }} ({{ item.variance_percentage }}%)
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

**Script additions:**

```javascript
const orderStatistics = ref(null);

const loadOrderStatistics = async (orderId) => {
  try {
    orderStatistics.value = await poStore.fetchOrderStatistics(orderId);
  } catch (error) {
    console.error("Error loading order statistics:", error);
    showToast("error", "Failed to load order statistics");
  }
};
```

### 3. SupplierOrders.vue - Enhanced Order Display

**Location:** Order details in the loop (around line 100-150)

**Enhancement:** Add variance indicators for completed orders

```vue
<!-- In the order card for each order -->
<div v-if="order.status === 'Completed'" class="mt-3 p-3 bg-blue-50 rounded-lg">
  <h4 class="text-xs font-semibold text-gray-700 mb-2">
    📦 Delivery Summary
  </h4>
  <div class="grid grid-cols-2 gap-2 text-xs">
    <div>
      <span class="text-gray-600">Total Ordered:</span>
      <span class="ml-1 font-medium">{{ order.total_ordered || 'N/A' }} units</span>
    </div>
    <div>
      <span class="text-gray-600">Total Received:</span>
      <span class="ml-1 font-medium">{{ order.total_received || 'N/A' }} units</span>
    </div>
  </div>

  <!-- Fulfillment rate -->
  <div v-if="order.total_ordered > 0" class="mt-2">
    <div class="flex justify-between items-center mb-1">
      <span class="text-xs text-gray-600">Fulfillment Rate:</span>
      <span class="text-xs font-medium">
        {{ ((order.total_received / order.total_ordered) * 100).toFixed(1) }}%
      </span>
    </div>
    <div class="w-full bg-gray-200 rounded-full h-2">
      <div
        class="h-2 rounded-full transition-all"
        :class="{
          'bg-green-500': (order.total_received / order.total_ordered) >= 0.95,
          'bg-yellow-500': (order.total_received / order.total_ordered) >= 0.80 && (order.total_received / order.total_ordered) < 0.95,
          'bg-red-500': (order.total_received / order.total_ordered) < 0.80
        }"
        :style="{ width: `${Math.min((order.total_received / order.total_ordered) * 100, 100)}%` }"
      ></div>
    </div>
  </div>

  <!-- Return info if applicable -->
  <div v-if="order.return_count > 0" class="mt-2 text-xs text-orange-600">
    ⚠️ {{ order.return_count }} return(s) associated with this order
  </div>
</div>
```

### 4. Suppliers.vue (SCM View) - Product Performance Dashboard

**New Section:** Add a tab or expandable section for product performance

```vue
<!-- Add to supplier details view -->
<div class="mt-4">
  <button
    @click="loadProductPerformance(supplier.id)"
    class="btn btn-sm bg-primaryColor text-white font-thin"
  >
    View Product Performance
  </button>

  <!-- Product performance table -->
  <div v-if="productPerformance && productPerformance.length > 0"
       class="mt-4 overflow-x-auto">
    <table class="table table-zebra table-sm">
      <thead>
        <tr>
          <th>Product</th>
          <th>SKU</th>
          <th>Orders</th>
          <th>Total Ordered</th>
          <th>Total Received</th>
          <th>Fulfillment Rate</th>
          <th>Revenue</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="product in productPerformance" :key="product.product_id">
          <td>{{ product.product_name }}</td>
          <td><span class="badge badge-sm">{{ product.sku }}</span></td>
          <td>{{ product.order_count }}</td>
          <td>{{ product.total_ordered }} {{ product.unit }}</td>
          <td>{{ product.total_received }} {{ product.unit }}</td>
          <td>
            <span
              class="badge badge-sm"
              :class="{
                'badge-success': product.fulfillment_rate >= 95,
                'badge-warning': product.fulfillment_rate >= 80 && product.fulfillment_rate < 95,
                'badge-error': product.fulfillment_rate < 80
              }"
            >
              {{ product.fulfillment_rate }}%
            </span>
          </td>
          <td>₱{{ Number(product.total_revenue).toLocaleString() }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

**Script additions:**

```javascript
const productPerformance = ref([]);

const loadProductPerformance = async (supplierId) => {
  try {
    productPerformance.value =
      await supplierStore.fetchProductPerformance(supplierId);
  } catch (error) {
    console.error("Error loading product performance:", error);
    showToast("error", "Failed to load product performance");
  }
};
```

## Implementation Priority

1. **High Priority** (Immediate Value):
   - Add supplier SKU display in PurchaseOrder.vue receipt modal
   - Add variance indicators in SupplierOrders.vue for completed orders

2. **Medium Priority** (Enhanced Analytics):
   - Add order statistics section in PurchaseOrder.vue view modal
   - Add product performance dashboard in Suppliers.vue

3. **Low Priority** (Nice to Have):
   - Add fulfillment rate trends over time
   - Add export functionality for statistics
   - Add filtering by fulfillment rate ranges

## Data Structure Reference

### Order Statistics Response

```javascript
{
  purchase_order: { /* PO details */ },
  items: [
    {
      id: 1,
      item_name: "Rice",
      ordered_quantity: 100,
      received_quantity: 90,
      total_returned: 5,
      actual_received: 85,
      variance: -10,
      variance_percentage: "-10.00",
      supplier_product_name: "Rice",
      supplier_sku: "3-RICE-KG"
    }
  ],
  totals: {
    total_ordered_amount: 25000,
    total_received_amount: 22500,
    items_fully_received: 1,
    items_partially_received: 1,
    items_not_received: 0,
    items_with_returns: 1
  }
}
```

### Product Performance Response

```javascript
[
  {
    product_id: 8,
    product_name: "Tomato",
    sku: "3-TOMATO-KG",
    order_count: 5,
    total_ordered: 750,
    total_received: 725,
    total_revenue: 90000,
    fulfillment_rate: 96.67,
  },
];
```

## Testing the Integration

1. **Create a test purchase order** with supplier products
2. **Complete the order** with different received quantities
3. **View the receipt** to see supplier SKU displayed
4. **Check statistics** to see variance calculations
5. **Load product performance** to see aggregated metrics

## Notes

- All backend endpoints are ready and tested
- Store methods handle loading states and errors
- The data is already being tracked in the database
- Simply need to display it in the UI where it adds value

## Next Steps

1. Choose which enhancements to implement first based on priority
2. Test each enhancement with real data
3. Gather user feedback on the new statistics
4. Iterate based on actual usage patterns
