const { db } = require("../config/database");
const SupplierProduct = require("../models/SupplierProduct");

/**
 * Script to create SupplierProducts from Purchase Order items
 * This script extracts unique products from purchase order items and creates supplier products
 */

// Purchase order items data (extracted from your purchase orders)
const purchaseOrderItems = [
  // From PO-1759252822430
  { item_name: "Egg", unit: "cases", unit_price: "200.00", supplier_id: 3 },
  { item_name: "Rice", unit: "kg", unit_price: "50.00", supplier_id: 3 },

  // From PO-1757811201238
  {
    item_name: "Cooking Oil",
    unit: "liters",
    unit_price: "120.00",
    supplier_id: 3,
  },

  // From PO-1757126925561
  { item_name: "Pork Ribs", unit: "kg", unit_price: "200.00", supplier_id: 3 },

  // From PO-1756625418015
  {
    item_name: "Vigan Longganisa",
    unit: "kg",
    unit_price: "150.00",
    supplier_id: 3,
  },
  { item_name: "Tomato", unit: "kg", unit_price: "120.00", supplier_id: 3 },
  { item_name: "Pipino", unit: "kg", unit_price: "30.00", supplier_id: 3 },
  {
    item_name: "Black Pepper",
    unit: "kg",
    unit_price: "35.00",
    supplier_id: 3,
  },

  // From PO-1756184658186
  { item_name: "Pork Belly", unit: "kg", unit_price: "200.00", supplier_id: 3 },

  // From PO-1756133955218
  {
    item_name: "Chicken Wing",
    unit: "kg",
    unit_price: "220.00",
    supplier_id: 3,
  },

  // From PO-202503
  {
    item_name: "Chicken Leg",
    unit: "kg",
    unit_price: "220.00",
    supplier_id: 3,
  },
  { item_name: "Pork Ribs", unit: "kg", unit_price: "300.00", supplier_id: 3 },
];

/**
 * Extract unique products from purchase order items
 * @param {Array} items - Array of purchase order items
 * @returns {Array} Array of unique products
 */
function extractUniqueProducts(items) {
  const productMap = new Map();

  items.forEach((item) => {
    const key = `${item.item_name.toLowerCase()}_${item.unit.toLowerCase()}`;

    if (productMap.has(key)) {
      const existing = productMap.get(key);
      // Keep the latest/highest price
      if (parseFloat(item.unit_price) > existing.unit_price) {
        existing.unit_price = parseFloat(item.unit_price);
      }
    } else {
      productMap.set(key, {
        item_name: item.item_name,
        unit: item.unit,
        unit_price: parseFloat(item.unit_price),
        supplier_id: item.supplier_id,
        description: `${item.item_name} - Available for purchase`,
        sku: `${item.supplier_id}-${item.item_name.replace(/\s+/g, "").toUpperCase()}-${item.unit.toUpperCase()}`,
        minimum_order_quantity: 1,
        is_available: true,
      });
    }
  });

  return Array.from(productMap.values());
}

/**
 * Generate SKU for a product
 * @param {Object} product - Product object
 * @returns {String} Generated SKU
 */
function generateSKU(product) {
  const supplierId = product.supplier_id;
  const itemName = product.item_name.replace(/\s+/g, "").toUpperCase();
  const unit = product.unit.toUpperCase();
  return `${supplierId}-${itemName}-${unit}`;
}

/**
 * Create supplier products from extracted data
 * @param {Array} products - Array of unique products
 * @returns {Promise<Array>} Array of created supplier products
 */
async function createSupplierProducts(products) {
  const createdProducts = [];
  const skippedProducts = [];

  for (const product of products) {
    try {
      // Check if product already exists
      const existingProducts = await db("supplier_products").where({
        supplier_id: product.supplier_id,
        product_name: product.item_name,
        unit: product.unit,
        deleted_at: null,
      });

      if (existingProducts.length > 0) {
        console.log(
          `⚠️  Product "${product.item_name}" (${product.unit}) already exists for supplier ${product.supplier_id}. Skipping...`
        );
        skippedProducts.push({
          item_name: product.item_name,
          unit: product.unit,
          reason: "Already exists",
        });
        continue;
      }

      const productData = {
        supplier_id: product.supplier_id,
        product_name: product.item_name,
        description: product.description,
        unit: product.unit,
        unit_price: product.unit_price,
        minimum_order_quantity: product.minimum_order_quantity,
        is_available: product.is_available,
        sku: generateSKU(product),
        image_url: null,
        item_type_id: null, // Can be mapped to inventory_item_types later
      };

      const createdProduct = await SupplierProduct.create(productData);
      createdProducts.push(createdProduct);

      console.log(
        `✅ Created: ${product.item_name} (${product.unit}) - ₱${product.unit_price}`
      );
    } catch (error) {
      console.error(
        `❌ Error creating product "${product.item_name}":`,
        error.message
      );
    }
  }

  return { createdProducts, skippedProducts };
}

/**
 * Main function to create supplier products from purchase order items
 */
async function createSupplierProductsFromItems() {
  try {
    console.log("🚀 Creating supplier products from purchase order items...");
    console.log(
      `📊 Processing ${purchaseOrderItems.length} purchase order items...`
    );

    // Extract unique products
    const uniqueProducts = extractUniqueProducts(purchaseOrderItems);
    console.log(`🔍 Found ${uniqueProducts.length} unique products`);

    // Display extracted products
    console.log("\n📋 Products to be created:");
    uniqueProducts.forEach((product, index) => {
      console.log(
        `${index + 1}. ${product.item_name} (${product.unit}) - ₱${product.unit_price}`
      );
    });

    // Create supplier products
    console.log("\n🏭 Creating supplier products...");
    const result = await createSupplierProducts(uniqueProducts);

    console.log(
      `\n✅ Successfully created ${result.createdProducts.length} supplier products`
    );

    if (result.skippedProducts.length > 0) {
      console.log(
        `⚠️  Skipped ${result.skippedProducts.length} products (already exist)`
      );
    }

    // Display summary
    console.log("\n📊 Summary:");
    console.log(`- Total unique products found: ${uniqueProducts.length}`);
    console.log(`- Products created: ${result.createdProducts.length}`);
    console.log(`- Products skipped: ${result.skippedProducts.length}`);

    // Display created products
    if (result.createdProducts.length > 0) {
      console.log("\n🎉 Created Products:");
      result.createdProducts.forEach((product, index) => {
        console.log(
          `${index + 1}. ${product.product_name} (${product.unit}) - ₱${product.unit_price} - SKU: ${product.sku}`
        );
      });
    }

    return {
      success: true,
      total_found: uniqueProducts.length,
      created: result.createdProducts.length,
      skipped: result.skippedProducts.length,
      products: result.createdProducts,
    };
  } catch (error) {
    console.error("❌ Error creating supplier products:", error);
    throw error;
  }
}

// Export functions for use in other scripts
module.exports = {
  extractUniqueProducts,
  createSupplierProductsFromItems,
  createSupplierProducts,
};

// Run script if called directly
if (require.main === module) {
  console.log("🎯 Supplier Product Creator");
  console.log("📋 Creating supplier products from purchase order items...");

  createSupplierProductsFromItems()
    .then((result) => {
      console.log("\n🎉 Script completed successfully!");
      console.log(
        `📊 Results: ${result.created} products created, ${result.skipped} skipped`
      );
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Script failed:", error);
      process.exit(1);
    });
}
