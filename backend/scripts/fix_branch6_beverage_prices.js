const { db } = require("../config/database");

async function fixBranch6BeveragePrices() {
  try {
    console.log("🔧 Fixing Selling Prices for Branch 6 Beverage Items...\n");

    // Get Branch 6 beverage items without selling prices
    const branch6Beverages = await db("branch_inventory")
      .where("item_type", "scm")
      .where("category", "Beverages")
      .where("branch_id", 6)
      .whereNull("selling_price")
      .whereNull("deleted_at")
      .select("id", "item_name", "unit_cost", "quantity", "unit", "status");

    console.log(
      `Found ${branch6Beverages.length} Branch 6 beverage items without selling prices:\n`
    );

    if (branch6Beverages.length === 0) {
      console.log(
        "✅ All Branch 6 beverage items already have selling prices!"
      );
      return;
    }

    // Set selling prices based on unit_cost (which should be the transfer price)
    let updatedCount = 0;

    for (const item of branch6Beverages) {
      // Use unit_cost as selling price since that should be the transfer price
      const sellingPrice = item.unit_cost;

      if (sellingPrice && sellingPrice > 0) {
        const result = await db("branch_inventory")
          .where("id", item.id)
          .update({
            selling_price: sellingPrice,
            updated_at: db.fn.now(),
          });

        if (result > 0) {
          console.log(
            `✅ Updated ${item.item_name}: ₱${sellingPrice} (from unit_cost)`
          );
          updatedCount++;
        }
      } else {
        console.log(
          `⚠️  ${item.item_name}: No unit_cost available (${item.unit_cost})`
        );
      }
    }

    console.log(
      `\n🎉 Successfully updated ${updatedCount} Branch 6 beverage items!`
    );

    // Verify the fix
    console.log("\n📋 Verification - Branch 6 beverage items:");
    const allBranch6Beverages = await db("branch_inventory")
      .where("item_type", "scm")
      .where("category", "Beverages")
      .where("branch_id", 6)
      .whereNull("deleted_at")
      .select(
        "item_name",
        "selling_price",
        "unit_cost",
        "quantity",
        "unit",
        "status"
      )
      .orderBy("item_name");

    allBranch6Beverages.forEach((item) => {
      if (item.quantity > 0 && item.status === "active") {
        console.log(
          `   🥤 ${item.item_name}: ₱${item.selling_price || "NOT SET"} (${item.quantity} ${item.unit} available)`
        );
      }
    });
  } catch (error) {
    console.error("Error fixing Branch 6 beverage prices:", error);
  } finally {
    await db.destroy();
  }
}

fixBranch6BeveragePrices();
