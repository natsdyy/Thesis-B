const { db } = require("../config/database");
const SupplierProduct = require("../models/SupplierProduct");

/**
 * Test script to verify supplier product creation
 * This script tests the supplier product creation functionality
 */

async function testSupplierProductCreation() {
  try {
    console.log("🧪 Testing Supplier Product Creation...");

    // Test data - single product
    const testProduct = {
      supplier_id: 3,
      product_name: "Test Product",
      description: "Test product for verification",
      unit: "kg",
      unit_price: 100.0,
      minimum_order_quantity: 1,
      is_available: true,
      sku: "3-TESTPRODUCT-KG",
      image_url: null,
      item_type_id: null,
    };

    console.log("📝 Test Product Data:");
    console.log(JSON.stringify(testProduct, null, 2));

    // Check if test product already exists
    const existingProducts = await db("supplier_products").where({
      supplier_id: testProduct.supplier_id,
      product_name: testProduct.product_name,
      unit: testProduct.unit,
      deleted_at: null,
    });

    if (existingProducts.length > 0) {
      console.log("⚠️  Test product already exists. Cleaning up...");
      await db("supplier_products")
        .where({
          supplier_id: testProduct.supplier_id,
          product_name: testProduct.product_name,
          unit: testProduct.unit,
        })
        .update({ deleted_at: new Date() });
    }

    // Create test product
    console.log("🏭 Creating test product...");
    const createdProduct = await SupplierProduct.create(testProduct);

    console.log("✅ Test product created successfully!");
    console.log("📊 Created Product:");
    console.log(JSON.stringify(createdProduct, null, 2));

    // Verify the product was created
    const verifyProduct = await SupplierProduct.getById(createdProduct.id);
    if (verifyProduct) {
      console.log("✅ Product verification successful!");
    } else {
      console.log("❌ Product verification failed!");
    }

    // Clean up test product
    console.log("🧹 Cleaning up test product...");
    await db("supplier_products")
      .where({ id: createdProduct.id })
      .update({ deleted_at: new Date() });

    console.log("✅ Test completed successfully!");
    return true;
  } catch (error) {
    console.error("❌ Test failed:", error);
    return false;
  }
}

async function testDatabaseConnection() {
  try {
    console.log("🔌 Testing database connection...");
    const result = await db.raw("SELECT 1 as test");
    console.log("✅ Database connection successful!");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

async function runAllTests() {
  console.log("🚀 Running Supplier Product Tests...");

  // Test database connection
  const dbTest = await testDatabaseConnection();
  if (!dbTest) {
    console.log("❌ Database test failed. Stopping tests.");
    return;
  }

  // Test supplier product creation
  const productTest = await testSupplierProductCreation();
  if (!productTest) {
    console.log("❌ Product creation test failed.");
    return;
  }

  console.log("\n🎉 All tests passed successfully!");
}

// Run tests if called directly
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log("\n✅ Test suite completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Test suite failed:", error);
      process.exit(1);
    });
}

module.exports = {
  testSupplierProductCreation,
  testDatabaseConnection,
  runAllTests,
};
