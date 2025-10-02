const { db } = require("../config/database");

async function ensureBeverageSellingPrices() {
  try {
    console.log(
      "🔧 Ensuring All SCM Beverage Items Have Selling Prices Set...\n"
    );

    // Get all SCM beverage items that might be missing selling prices
    const beverageItems = await db("branch_inventory")
      .where("item_type", "scm")
      .where("category", "Beverages")
      .whereNull("deleted_at")
      .select(
        "id",
        "item_name",
        "branch_id",
        "selling_price",
        "unit_cost",
        "quantity",
        "unit",
        "status"
      );

    console.log(`Found ${beverageItems.length} SCM beverage items to check:\n`);

    let updatedCount = 0;
    let alreadySetCount = 0;

    for (const item of beverageItems) {
      console.log(`📦 ${item.item_name} (Branch ${item.branch_id}):`);

      if (item.selling_price && item.selling_price > 0) {
        console.log(`   ✅ Already has selling price: ₱${item.selling_price}`);
        alreadySetCount++;
      } else if (item.unit_cost && item.unit_cost > 0) {
        // Use unit_cost (transfer price) as selling price
        const result = await db("branch_inventory")
          .where("id", item.id)
          .update({
            selling_price: item.unit_cost,
            updated_at: db.fn.now(),
          });

        if (result > 0) {
          console.log(
            `   🔧 Set selling price: ₱${item.unit_cost} (from unit_cost/transfer price)`
          );
          updatedCount++;
        }
      } else {
        console.log(
          `   ⚠️  No unit_cost available - cannot set selling price automatically`
        );
      }
      console.log("");
    }

    console.log(`\n📊 Summary:`);
    console.log(`   - Items already with selling prices: ${alreadySetCount}`);
    console.log(`   - Items updated with selling prices: ${updatedCount}`);
    console.log(`   - Total items checked: ${beverageItems.length}`);

    // Final verification
    console.log(
      "\n🔍 Final Verification - All beverage items with selling prices:"
    );
    const finalCheck = await db("branch_inventory")
      .where("item_type", "scm")
      .where("category", "Beverages")
      .whereNotNull("selling_price")
      .where("selling_price", ">", 0)
      .whereNull("deleted_at")
      .select(
        "item_name",
        "branch_id",
        "selling_price",
        "unit_cost",
        "quantity",
        "unit",
        "status"
      )
      .orderBy("branch_id")
      .orderBy("item_name");

    finalCheck.forEach((item) => {
      if (item.quantity > 0 && item.status === "active") {
        console.log(
          `   🥤 ${item.item_name} (Branch ${item.branch_id}): ₱${item.selling_price} - ${item.quantity} ${item.unit}`
        );
      }
    });

    console.log(
      `\n✅ Total beverage items ready for POS: ${finalCheck.filter((item) => item.quantity > 0 && item.status === "active").length}`
    );

    console.log("\n💡 For future distributions:");
    console.log(
      "   - The system will automatically use the Transfer Price (unit_cost) as the Selling Price"
    );
    console.log(
      "   - This ensures consistency between distribution cost and POS pricing"
    );
  } catch (error) {
    console.error("Error ensuring beverage selling prices:", error);
  } finally {
    await db.destroy();
  }
}

ensureBeverageSellingPrices();
