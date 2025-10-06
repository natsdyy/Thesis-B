# Supplier Products Management Feature

## Overview

This feature allows suppliers to manage their own product catalog with pricing information directly from their supplier portal. Suppliers can add, edit, delete, and manage the availability of their products.

---

## Backend Implementation

### 1. Database Migration

**File:** `backend/migrations/20250206000000_create_supplier_products_table.js`

Created `supplier_products` table with the following fields:

- `id` - Primary key
- `supplier_id` - Foreign key to suppliers table
- `product_name` - Product name (required)
- `description` - Product description (optional)s
- `category` - Product category (optional)
- `unit` - Unit of measurement (pcs, kg, L, etc.)
- `unit_price` - Price per unit (required)
- `minimum_order_quantity` - Minimum order quantity (default: 1)
- `is_available` - Availability status (default: true)
- `sku` - Stock Keeping Unit (optional)
- `image_url` - Product image URL (optional)
- `created_at`, `updated_at` - Timestamps
- `deleted_at` - Soft delete timestamp

**Indexes:**

- `supplier_id`
- `category`
- `is_available`
- Composite: `supplier_id + is_available`

### 2. Model

**File:** `backend/models/SupplierProduct.js`

**Methods:**

- `getAllBySupplier(supplierId)` - Get all products for a supplier
- `getAvailableBySupplier(supplierId)` - Get available products only
- `getById(id)` - Get product by ID
- `getByIdWithSupplier(id)` - Get product with supplier info
- `create(productData)` - Create new product
- `update(id, supplierId, productData)` - Update product
- `delete(id, supplierId)` - Soft delete product
- `toggleAvailability(id, supplierId)` - Toggle availability status
- `searchBySupplier(supplierId, searchTerm)` - Search products
- `getByCategory(supplierId, category)` - Get products by category
- `getCategoriesBySupplier(supplierId)` - Get all categories
- `bulkUpdatePrices(supplierId, priceAdjustment)` - Bulk price updates

**Security:**

- All update/delete operations verify supplier_id ownership
- Soft delete implementation

### 3. Routes

**File:** `backend/routes/supplierProducts.js`

**Endpoints:**

- `GET /api/supplier-products` - Get all products for supplier
  - Query params: `supplier_id`, `search`, `category`
- `GET /api/supplier-products/available` - Get available products
- `GET /api/supplier-products/categories` - Get product categories
- `GET /api/supplier-products/:id` - Get product by ID
- `POST /api/supplier-products` - Create new product
- `PUT /api/supplier-products/:id` - Update product
- `PATCH /api/supplier-products/:id/toggle-availability` - Toggle availability
- `DELETE /api/supplier-products/:id` - Delete product (soft delete)

**Validation:**

- Required fields validation
- Price cannot be negative
- Supplier ID ownership verification

### 4. Server Registration

**File:** `backend/server.js`

- Imported `supplierProductsRoutes`
- Registered route: `app.use("/api/supplier-products", supplierProductsRoutes)`

---

## Frontend Implementation

### 1. Pinia Store

**File:** `frontend/src/stores/supplierProductsStore.js`

**State:**

- `products` - Array of all products
- `categories` - Array of unique categories
- `loading` - Loading state
- `error` - Error state

**Getters:**

- `availableProducts` - Computed list of available products
- `productsByCategory(category)` - Filter products by category
- `productCount` - Total product count
- `availableCount` - Available product count

**Actions:**

- `fetchProducts(filters)` - Load products with optional filters (search, category)
- `fetchAvailableProducts()` - Load only available products
- `fetchCategories()` - Load unique categories
- `getProductById(productId)` - Get single product details
- `createProduct(productData)` - Create new product
- `updateProduct(productId, productData)` - Update existing product
- `deleteProduct(productId)` - Soft delete product
- `toggleAvailability(productId)` - Toggle product availability
- `searchProducts(searchTerm)` - Search products
- `filterByCategory(category)` - Filter by category
- `clearError()` - Clear error state
- `resetStore()` - Reset all state

**Benefits:**

- ✅ Centralized state management
- ✅ Automatic state updates after mutations
- ✅ Better error handling
- ✅ Reusable across components
- ✅ Clean component code
- ✅ Easier testing

### 2. Product Management Component

**File:** `frontend/src/views/supplier/SupplierProducts.vue`

**Features:**

- ✅ Product grid/card layout
- ✅ Search functionality
- ✅ Category filter
- ✅ Availability filter (All, Available, Unavailable)
- ✅ Add product modal
- ✅ Edit product modal
- ✅ Delete confirmation modal
- ✅ Toggle availability quick action
- ✅ Empty state handling
- ✅ Loading states
- ✅ Responsive design

**Product Card Information:**

- Product name
- Category badge
- SKU badge
- Description (2 line clamp)
- Unit price with currency
- Unit of measurement
- Minimum order quantity
- Availability status badge
- Action menu (Edit, Toggle Availability, Delete)

**Product Form Fields:**

- Product Name \* (required)
- Description
- Category (with suggestions from existing categories)
- SKU
- Unit Price \* (required, ₱)
- Unit \* (dropdown: pcs, kg, g, L, mL, box, pack, dozen)
- Minimum Order Quantity
- Is Available (toggle)

### 2. Router Configuration

**File:** `frontend/src/router/index.js`

- Imported `SupplierProducts` component
- Added route: `/supplier/products`
- Protected with `requiresSupplierAuth` meta

### 3. Layout Navigation

**File:** `frontend/src/layouts/SupplierLayout.vue`

**Added "My Products" navigation link to:**

- ✅ Desktop user dropdown menu
- ✅ Desktop tab navigation
- ✅ Mobile dropdown menu
- ✅ Mobile navigation menu

**Navigation Order:**

1. Dashboard
2. Orders
3. **Products** (NEW)
4. Profile

---

## Using the Store in Components

### Basic Usage

```javascript
import { useSupplierProductsStore } from "@/stores/supplierProductsStore";

const productsStore = useSupplierProductsStore();

// Load products
await productsStore.fetchProducts();

// Search products
await productsStore.fetchProducts({ search: "tomato" });

// Filter by category
await productsStore.fetchProducts({ category: "Vegetables" });

// Create product
await productsStore.createProduct({
  product_name: "Fresh Tomatoes",
  unit_price: 150.0,
  unit: "kg",
  // ... other fields
});

// Update product
await productsStore.updateProduct(productId, {
  unit_price: 160.0,
});

// Delete product
await productsStore.deleteProduct(productId);

// Toggle availability
await productsStore.toggleAvailability(productId);

// Access state
const products = productsStore.products;
const categories = productsStore.categories;
const loading = productsStore.loading;

// Use getters
const available = productsStore.availableProducts;
const count = productsStore.productCount;
```

---

## Usage Guide

### For Suppliers:

#### Adding a Product

1. Navigate to "My Products" from the menu
2. Click "Add Product" button
3. Fill in product details:
   - Product Name (required)
   - Description (optional)
   - Category (optional, autocomplete)
   - SKU (optional)
   - Unit Price (required)
   - Unit (required, select from dropdown)
   - Minimum Order Quantity (optional, default: 1)
   - Availability toggle (default: available)
4. Click "Add Product"

#### Editing a Product

1. Click the three-dot menu (⋮) on a product card
2. Select "Edit"
3. Update product information
4. Click "Update Product"

#### Managing Availability

1. Click the three-dot menu (⋮) on a product card
2. Select "Mark Unavailable" or "Mark Available"
3. Product status updates immediately

#### Deleting a Product

1. Click the three-dot menu (⋮) on a product card
2. Select "Delete"
3. Confirm deletion in the modal
4. Product is soft deleted

#### Searching & Filtering

- **Search**: Type in search box to find products by name, description, category, or SKU
- **Category Filter**: Select a category to show only products in that category
- **Availability Filter**: Choose "All", "Available Only", or "Unavailable Only"

---

## Database Setup

### Run Migration

```bash
cd backend
npx knex migrate:latest
```

This will create the `supplier_products` table.

---

## API Testing

### Create Product

```bash
curl -X POST http://localhost:3000/api/supplier-products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "supplier_id": 1,
    "product_name": "Fresh Tomatoes",
    "description": "Organic fresh tomatoes",
    "category": "Vegetables",
    "unit": "kg",
    "unit_price": 150.00,
    "minimum_order_quantity": 5,
    "is_available": true,
    "sku": "VEG-TOM-001"
  }'
```

### Get Supplier Products

```bash
curl -X GET "http://localhost:3000/api/supplier-products?supplier_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Product

```bash
curl -X PUT http://localhost:3000/api/supplier-products/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "supplier_id": 1,
    "unit_price": 160.00
  }'
```

### Toggle Availability

```bash
curl -X PATCH http://localhost:3000/api/supplier-products/1/toggle-availability \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "supplier_id": 1
  }'
```

### Delete Product

```bash
curl -X DELETE http://localhost:3000/api/supplier-products/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "supplier_id": 1
  }'
```

---

## Security Features

1. **Supplier Ownership Verification**
   - All update/delete operations verify the supplier_id
   - Suppliers can only manage their own products

2. **Soft Delete**
   - Products are not permanently deleted
   - Uses `deleted_at` timestamp for recovery

3. **Input Validation**
   - Required fields enforced
   - Price validation (no negative values)
   - Minimum order quantity validation

4. **JWT Authentication**
   - All routes require valid supplier authentication
   - Token verification on each request

---

## Future Enhancements

1. **Image Upload**
   - Add image upload functionality
   - Store images in cloud storage
   - Display product images in cards

2. **Bulk Operations**
   - Bulk price updates (percentage or fixed amount)
   - Bulk availability toggle
   - Export product list to CSV/Excel

3. **Product Analytics**
   - Track views per product
   - Order frequency
   - Popular products dashboard

4. **Product Variants**
   - Size variations
   - Color options
   - Different pricing tiers

5. **Inventory Integration**
   - Track stock levels
   - Low stock alerts
   - Auto-disable when out of stock

6. **Price History**
   - Track price changes over time
   - Price trend charts
   - Promotional pricing

---

## Files Created/Modified

### Backend

- ✅ `backend/migrations/20250206000000_create_supplier_products_table.js`
- ✅ `backend/models/SupplierProduct.js`
- ✅ `backend/routes/supplierProducts.js`
- ✅ `backend/server.js` (modified)

### Frontend

- ✅ `frontend/src/stores/supplierProductsStore.js` (NEW)
- ✅ `frontend/src/views/supplier/SupplierProducts.vue`
- ✅ `frontend/src/router/index.js` (modified)
- ✅ `frontend/src/layouts/SupplierLayout.vue` (modified)

### Documentation

- ✅ `SUPPLIER_PRODUCTS_FEATURE.md`

---

## Testing Checklist

### Backend

- [ ] Migration runs successfully
- [ ] Can create product
- [ ] Can retrieve products by supplier
- [ ] Can update product
- [ ] Can delete product (soft delete)
- [ ] Can toggle availability
- [ ] Search functionality works
- [ ] Category filtering works
- [ ] Only supplier can update their own products

### Frontend

- [ ] Products page loads
- [ ] Add product modal opens
- [ ] Can create product
- [ ] Products display in grid
- [ ] Can edit product
- [ ] Can delete product with confirmation
- [ ] Can toggle availability
- [ ] Search works
- [ ] Category filter works
- [ ] Availability filter works
- [ ] Empty state shows when no products
- [ ] Loading states work
- [ ] Navigation links work
- [ ] Mobile responsive

---

## Support

For issues or questions:

1. Check the API endpoint responses
2. Verify supplier authentication
3. Check browser console for errors
4. Verify database migration ran successfully

---

**Feature Status:** ✅ Complete and Ready for Testing
