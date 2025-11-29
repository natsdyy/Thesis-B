const { db } = require("../config/database");

async function checkBeverageInventory() {
  try {
    console.log("🍹 Checking Branch Inventory for Beverage Items...\n");

    // Check for SCM beverage items in branch inventory
    const beverageItems = await db("branch_inventory")
      .where("item_type", "scm")
      .where("category", "Beverages")
      .whereNull("deleted_at")
      .select(
        "id",
        "branch_id",
        "item_name",
        "category",
        "quantity",
        "selling_price",
        "unit",
        "status",
        "expiry_date"
      )
      .orderBy("branch_id")
      .orderBy("item_name");

    console.log(
      `Found ${beverageItems.length} beverage items in branch inventory:\n`
    );

    if (beverageItems.length === 0) {
      console.log("❌ No beverage items found in branch inventory");
      console.log("💡 You may need to distribute beverages to branches first");
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

    Object.keys(byBranch).forEach((branchId) => {
      console.log(`📍 Branch ID: ${branchId}`);
      byBranch[branchId].forEach((item) => {
        console.log(`   🥤 ${item.item_name}`);
        console.log(`      - Quantity: ${item.quantity} ${item.unit}`);
        console.log(`      - Selling Price: ₱${item.selling_price || "N/A"}`);
        console.log(`      - Status: ${item.status}`);
        if (item.expiry_date) {
          console.log(`      - Expiry: ${item.expiry_date}`);
        }
        console.log("");
      });
    });

    // Check if any branches have beverage items with selling prices
    const branchesWithBeverages = await db("branch_inventory")
      .where("item_type", "scm")
      .where("category", "Beverages")
      .whereNotNull("selling_price")
      .where("selling_price", ">", 0)
      .whereNull("deleted_at")
      .select("branch_id")
      .distinct();

    console.log(
      `✅ Branches with beverage items ready for POS: ${branchesWithBeverages.length}`
    );
    branchesWithBeverages.forEach((branch) => {
      console.log(`   - Branch ID: ${branch.branch_id}`);
    });
  } catch (error) {
    console.error("Error checking beverage inventory:", error);
  } finally {
    await db.destroy();
  }
}

checkBeverageInventory();
