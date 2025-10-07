# Supplier Product & Purchase Order Integration

## Overview

This document describes the implementation of supplier product integration in the Purchase Order system, including support for tracking ordered vs received quantities and comprehensive supplier statistics.

## Changes Made

### 1. Database Migration

**File:** `backend/migrations/20251007120000_add_supplier_product_to_purchase_order_items.js`

Added the following columns to `purchase_order_items` table:

- `supplier_product_id` - Reference to supplier_products table
- `item_sku` - SKU from supplier product
- Index on `supplier_product_id`

This allows purchase order items to be linked directly to supplier products from the supplier catalog.

### 2. PurchaseOrder Model Updates

**File:** `backend/models/PurchaseOrder.js`

#### Enhanced Data Retrieval

- Updated `getAll()` method to join with `supplier_products` table
- Updated `getItems()` method to include supplier product information
- Updated `create()` method to accept `supplier_product_id` and `item_sku` when creating PO items

#### New Methods

##### `getOrderStatistics(purchaseOrderId)`

Returns comprehensive statistics for a purchase order including:

- Ordered vs received quantities for each item
- Return statistics (pending and completed)
- Actual received quantities (received - returns)
- Variance calculations (ordered vs received)
- Supplier product information if linked

**Returns:**

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
      pending_returns: 0,
      completed_returns: 1,
      supplier_product_name: "Rice",
      supplier_sku: "3-RICE-KG"
    }
  ],
  totals: {
    total_ordered_amount: 25000,
    total_received_amount: 22500,
    total_items: 2,
    items_fully_received: 1,
    items_partially_received: 1,
    items_not_received: 0,
    items_with_returns: 1,
    items_with_pending_returns: 0
  }
}
```

##### `getSupplierProductFulfillment(supplierId, productId = null)`

Returns fulfillment statistics for supplier products across all completed orders.

**Parameters:**

- `supplierId` - Supplier ID
- `productId` - Optional specific product ID

**Returns:**

```javascript
[
  {
    supplier_product_id: 8,
    product_name: "Tomato",
    sku: "3-TOMATO-KG",
    total_ordered: 150,
    total_received: 150,
    order_count: 1,
    fulfillment_rate: "100.00",
  },
];
```

### 3. Supplier Model Updates

**File:** `backend/models/Supplier.js`

#### Enhanced `getSupplierStats(supplierId)`

Extended supplier statistics to include:

- Total ordered vs received items
- Fulfillment rate percentage
- Return statistics (total returns, returned quantities, completed returns)
- Product statistics (total products, available products)

**Returns:**

```javascript
{
  total_orders: 16,
  avg_rating: "4.0",
  last_order_date: "2025-09-30T16:00:00.000Z",
  total_ordered_items: 2555,
  total_received_items: 2090,
  fulfillment_rate: 81.8,
  total_returns: 10,
  total_returned_quantity: 406,
  completed_returns: 10,
  total_products: 11,
  available_products: 11
}
```

#### New Methods

##### `getProductPerformance(supplierId)`

Returns performance metrics for all products from a supplier.

**Returns:**

```javascript
[
  {
    product_id: 8,
    product_name: "Tomato",
    sku: "3-TOMATO-KG",
    unit: "kg",
    unit_price: "120.00",
    is_available: true,
    order_count: 1,
    total_ordered: 150,
    total_received: 150,
    total_revenue: 18000,
    fulfillment_rate: 100.0,
  },
];
```

##### `getOrderHistory(supplierId, limit = 10)`

Returns recent order history with received vs ordered breakdown.

**Parameters:**

- `supplierId` - Supplier ID
- `limit` - Number of recent orders to return (default: 10)

**Returns:**

```javascript
[
  {
    id: 123,
    po_number: "PO-1759252822430",
    status: "Completed",
    total_amount: "250000.00",
    order_date: "2025-10-01T00:00:00.000Z",
    expected_delivery: "2025-10-05T00:00:00.000Z",
    completed_at: "2025-10-04T12:00:00.000Z",
    item_count: 2,
    total_ordered: 2000,
    total_received: 2000,
    order_value: 250000,
    return_count: 0,
  },
];
```

## Use Cases

### 1. Creating a Purchase Order with Supplier Products

When creating a PO from a supply request that includes supplier products:

```javascript
const items = [
  {
    item_name: "Tomato",
    quantity: 150,
    unit: "kg",
    unit_price: 120,
    total_price: 18000,
    supplier_product_id: 8, // Link to supplier product
    item_sku: "3-TOMATO-KG",
  },
];

await PurchaseOrder.create(poData, items);
```

### 2. Tracking Ordered vs Received Quantities

When receiving items, the system now tracks:

- **Ordered Quantity:** Original quantity in the PO
- **Received Quantity:** Actual quantity received
- **Variance:** Difference between ordered and received
- **Returns:** Items returned to supplier
- **Actual Received:** Received - Returns

### 3. Supplier Performance Analysis

View comprehensive supplier performance:

```javascript
const stats = await Supplier.getSupplierStats(supplierId);
// Shows: orders, fulfillment rate, returns, products
```

### 4. Product-Level Fulfillment Tracking

Track how well each product is fulfilled:

```javascript
const performance = await Supplier.getProductPerformance(supplierId);
// Shows which products have best/worst fulfillment rates
```

## Benefits

1. **Better Inventory Management:** Track discrepancies between ordered and received quantities
2. **Supplier Performance Metrics:** Data-driven supplier evaluation
3. **Product Catalog Integration:** Link PO items directly to supplier product catalog
4. **Return Tracking:** Comprehensive tracking of returns and their impact on actual received quantities
5. **Variance Analysis:** Identify patterns in over/under delivery
6. **Fulfillment Rate:** Measure supplier reliability at both order and product levels

## Testing

The implementation was tested with:

- Supplier ID 3 with 11 products
- 16 completed orders
- 2,555 total ordered items
- 2,090 total received items
- 81.8% fulfillment rate
- 10 completed returns

All methods executed successfully and returned accurate statistics.

## API Integration

Frontend components can now:

1. Display supplier product information in PO items
2. Show ordered vs received quantities in PO details
3. Display supplier performance metrics
4. Track product-level fulfillment rates
5. Analyze variance and returns for better forecasting

## Database Schema

```sql
-- purchase_order_items table additions
ALTER TABLE purchase_order_items
ADD COLUMN supplier_product_id INTEGER REFERENCES supplier_products(id),
ADD COLUMN item_sku VARCHAR(100);

CREATE INDEX idx_poi_supplier_product_id ON purchase_order_items(supplier_product_id);
```

## Frontend Store Updates

### Supplier Store (`frontend/src/stores/supplierStore.js`)

Added new methods to support supplier product analytics:

#### `fetchProductPerformance(supplierId)`

Fetches performance metrics for all products from a supplier.

**Usage:**

```javascript
const supplierStore = useSupplierStore();
const performance = await supplierStore.fetchProductPerformance(supplierId);
```

#### `fetchOrderHistory(supplierId, limit = 10)`

Fetches recent order history with received vs ordered breakdown.

**Usage:**

```javascript
const supplierStore = useSupplierStore();
const history = await supplierStore.fetchOrderHistory(supplierId, 10);
```

### Purchase Order Store (`frontend/src/stores/purchaseOrderStore.js`)

Added new methods to support order statistics and fulfillment tracking:

#### `fetchOrderStatistics(purchaseOrderId)`

Fetches comprehensive statistics for a specific purchase order.

**Usage:**

```javascript
const poStore = usePurchaseOrderStore();
const stats = await poStore.fetchOrderStatistics(purchaseOrderId);
```

#### `fetchSupplierProductFulfillment(supplierId, productId = null)`

Fetches fulfillment rates for supplier products.

**Usage:**

```javascript
const poStore = usePurchaseOrderStore();
const fulfillment = await poStore.fetchSupplierProductFulfillment(supplierId);
```

## Backend API Endpoints

### Supplier Routes

#### `GET /api/suppliers/:id/product-performance`

Returns performance metrics for all products from a supplier.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "product_id": 8,
      "product_name": "Tomato",
      "sku": "3-TOMATO-KG",
      "order_count": 1,
      "total_ordered": 150,
      "total_received": 150,
      "fulfillment_rate": 100.0
    }
  ]
}
```

#### `GET /api/suppliers/:id/order-history?limit=10`

Returns recent order history with received vs ordered breakdown.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "po_number": "PO-1759252822430",
      "status": "Completed",
      "total_ordered": 2000,
      "total_received": 2000,
      "return_count": 0
    }
  ]
}
```

### Purchase Order Routes

#### `GET /api/purchase-orders/:id/statistics`

Returns comprehensive statistics for a purchase order.

**Response:**

```json
{
  "success": true,
  "data": {
    "purchase_order": {},
    "items": [
      {
        "id": 1,
        "item_name": "Rice",
        "ordered_quantity": 100,
        "received_quantity": 90,
        "variance": -10,
        "variance_percentage": "-10.00"
      }
    ],
    "totals": {
      "items_fully_received": 1,
      "items_partially_received": 1
    }
  }
}
```

#### `GET /api/purchase-orders/supplier/:supplierId/product-fulfillment?productId=8`

Returns fulfillment statistics for supplier products.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "supplier_product_id": 8,
      "product_name": "Tomato",
      "fulfillment_rate": "100.00"
    }
  ]
}
```

## Migration

Run the migration:

```bash
cd backend
npx knex migrate:latest
```

The migration is backward compatible and will not affect existing data.
