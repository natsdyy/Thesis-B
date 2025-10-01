const { db } = require("../config/database");

async function checkBeveragePricesAcrossBranches() {
  try {
    console.log("💰 Checking Beverage Prices Across All Branches...\n");

    // Get all beverage items across all branches
    const beverageItems = await db("branch_inventory")
      .where("item_type", "scm")
      .where("category", "Beverages")
      .whereNull("deleted_at")
      .select(
        "branch_id",
        "item_name",
        "selling_price",
        "quantity",
        "unit",
        "status"
      )
      .orderBy("branch_id")
      .orderBy("item_name");

    console.log(
      `Found ${beverageItems.length} beverage items across all branches\n`
    );

    if (beverageItems.length === 0) {
      console.log("❌ No beverage items found");
      return;
    }

    // Group by branch for better display
    const byBranch = {};
    beverageItems.forEach((item) => {
      if (!byBranch[item.branch_id]) {
        byBranch[item.branch_id] = [];
      }
      byBranch[item.branch_id].push(item);
    });

    // Display results by branch
    Object.keys(byBranch).forEach((branchId) => {
      console.log(`📍 Branch ID: ${branchId}`);
      byBranch[branchId].forEach((item) => {
        console.log(
          `   🥤 ${item.item_name}: ₱${item.selling_price || "N/A"} (${item.quantity} ${item.unit}, Status: ${item.status})`
        );
      });
      console.log("");
    });

    // Check for price inconsistencies
    console.log("🔍 Checking for Price Inconsistencies...\n");

    // Group by item name to check prices
    const byItemName = {};
    beverageItems.forEach((item) => {
      if (!byItemName[item.item_name]) {
        byItemName[item.item_name] = [];
      }
      byItemName[item.item_name].push(item);
    });

    let hasInconsistencies = false;
    Object.keys(byItemName).forEach((itemName) => {
      const items = byItemName[itemName];
      const prices = items
        .map((item) => item.selling_price)
        .filter((price) => price !== null);
      const uniquePrices = [...new Set(prices)];

      if (uniquePrices.length > 1) {
        hasInconsistencies = true;
        console.log(`⚠️  ${itemName} has different prices:`);
        items.forEach((item) => {
          console.log(
            `   - Branch ${item.branch_id}: ₱${item.selling_price || "N/A"}`
          );
        });
        console.log("");
      } else if (uniquePrices.length === 1) {
        console.log(
          `✅ ${itemName}: ₱${uniquePrices[0]} (consistent across all branches)`
        );
      } else {
        console.log(`❌ ${itemName}: No prices set`);
      }
    });

    if (!hasInconsistencies) {
      console.log("\n🎉 All beverage prices are consistent across branches!");
    } else {
      console.log("\n⚠️  Found price inconsistencies across branches!");
    }

    // Check how many branches have beverages
    const branchesWithBeverages = Object.keys(byBranch).length;
    console.log(`\n📊 Summary:`);
    console.log(`   - Total branches with beverages: ${branchesWithBeverages}`);
    console.log(`   - Total beverage items: ${beverageItems.length}`);
    console.log(
      `   - Items with prices set: ${beverageItems.filter((item) => item.selling_price && item.selling_price > 0).length}`
    );
  } catch (error) {
    console.error("Error checking beverage prices:", error);
  } finally {
    await db.destroy();
  }
}

checkBeveragePricesAcrossBranches();
