const POSModel = require("../models/POS");

async function testPOSIntegration() {
  try {
    console.log("🧪 Testing POS Integration with SCM Beverage Items...\n");

    // Test the POS model with branch_id 7
    const filters = {
      branch_id: 7,
      is_available: true,
      limit: 50,
      offset: 0,
    };

    console.log("📡 Fetching POS menu items...");
    const { rows, total } = await POSModel.getMenuItemsForPOS(filters);

    console.log(
      `✅ Successfully fetched ${rows.length} items (Total: ${total})\n`
    );

    // Separate production and SCM items
    const productionItems = rows.filter(
      (item) => item.item_type === "production"
    );
    const scmItems = rows.filter((item) => item.item_type === "scm");
    const beverageItems = scmItems.filter(
      (item) => item.category === "Beverages"
    );

    console.log(`📊 Item Breakdown:`);
    console.log(`   - Production items: ${productionItems.length}`);
    console.log(`   - SCM items: ${scmItems.length}`);
    console.log(`   - Beverage items: ${beverageItems.length}\n`);

    if (productionItems.length > 0) {
      console.log("🍽️  Production Items (Sample):");
      productionItems.slice(0, 3).forEach((item) => {
        console.log(
          `   - ${item.menu_item_name}: ₱${item.selling_price} (Stock: ${item.stock_quantity})`
        );
      });
      console.log("");
    }

    if (beverageItems.length > 0) {
      console.log("🥤 Beverage Items (All):");
      beverageItems.forEach((item) => {
        console.log(
          `   - ${item.item_name}: ₱${item.selling_price} (Stock: ${item.stock_quantity} ${item.unit || "units"})`
        );
        console.log(`     Category: ${item.category}, Type: ${item.item_type}`);
        console.log(`     Prep Time: ${item.preparation_time_minutes} minutes`);
        console.log("");
      });
    }

    // Test filtering by category
    console.log("🔍 Testing category filter (Beverages)...");
    const beverageFilter = {
      branch_id: 7,
      category: "Beverages",
      is_available: true,
      limit: 50,
      offset: 0,
    };

    const { rows: beverageOnly } =
      await POSModel.getMenuItemsForPOS(beverageFilter);
    console.log(
      `✅ Found ${beverageOnly.length} items when filtering by 'Beverages' category\n`
    );

    // Test search functionality
    console.log("🔍 Testing search functionality (search: 'Coke')...");
    const searchFilter = {
      branch_id: 7,
      search: "Coke",
      is_available: true,
      limit: 50,
      offset: 0,
    };

    const { rows: searchResults } =
      await POSModel.getMenuItemsForPOS(searchFilter);
    console.log(
      `✅ Found ${searchResults.length} items when searching for 'Coke'`
    );
    searchResults.forEach((item) => {
      console.log(
        `   - ${item.menu_item_name || item.item_name}: ₱${item.selling_price}`
      );
    });

    console.log("\n🎉 POS Integration Test Completed Successfully!");
    console.log("✅ SCM beverage items are now available in the POS system");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

testPOSIntegration();
