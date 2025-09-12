const { db } = require("../config/database");

// Import the ProductionInventory model
const ProductionInventory = require("../models/ProductionInventory");

/**
 * Script to update all existing production inventory items with dynamic reorder points
 * This will fix the issue where reorder points are hardcoded to 20 or 0
 */
async function updateAllReorderPoints() {
  try {
    console.log("🔄 Starting reorder point update process...");

    // Get all active production inventory items
    const inventoryItems = await db("production_inventory as pi")
      .select(
        "pi.id",
        "mi.menu_item_name",
        "pi.available_quantity",
        "pi.reorder_point"
      )
      .leftJoin("menu_items as mi", "pi.menu_item_id", "mi.id")
      .where("pi.is_active", true)
      .whereNull("pi.deleted_at");

    console.log(
      `📊 Found ${inventoryItems.length} active production inventory items`
    );

    let updatedCount = 0;
    let skippedCount = 0;

    for (const item of inventoryItems) {
      try {
        const currentStock = item.available_quantity || 0;
        const oldReorderPoint = item.reorder_point || 0;

        // Calculate new dynamic reorder point (15% of current stock, min 5, max 50)
        const newReorderPoint =
          ProductionInventory.calculateDynamicReorderPoint(currentStock);

        // Only update if the reorder point actually changes
        if (newReorderPoint !== oldReorderPoint) {
          await db("production_inventory").where("id", item.id).update({
            reorder_point: newReorderPoint,
            updated_at: db.fn.now(),
          });

          console.log(
            `✅ Updated ${item.menu_item_name}: Stock=${currentStock}, Reorder Point: ${oldReorderPoint} → ${newReorderPoint}`
          );
          updatedCount++;
        } else {
          console.log(
            `⏭️  Skipped ${item.menu_item_name}: Reorder point already optimal (${newReorderPoint})`
          );
          skippedCount++;
        }
      } catch (error) {
        console.error(
          `❌ Error updating ${item.menu_item_name}:`,
          error.message
        );
      }
    }

    console.log("\n📈 Update Summary:");
    console.log(`✅ Updated: ${updatedCount} items`);
    console.log(`⏭️  Skipped: ${skippedCount} items`);
    console.log(`📊 Total processed: ${inventoryItems.length} items`);

    // Show some examples of the new reorder points
    console.log("\n🔍 Examples of new dynamic reorder points:");
    const examples = await db("production_inventory as pi")
      .select("mi.menu_item_name", "pi.available_quantity", "pi.reorder_point")
      .leftJoin("menu_items as mi", "pi.menu_item_id", "mi.id")
      .where("pi.is_active", true)
      .whereNull("pi.deleted_at")
      .limit(5);

    examples.forEach((item) => {
      const percentage =
        item.available_quantity > 0
          ? Math.round((item.reorder_point / item.available_quantity) * 100)
          : 0;
      console.log(
        `   ${item.menu_item_name}: ${item.available_quantity} stock → ${item.reorder_point} reorder point (${percentage}%)`
      );
    });

    console.log("\n🎉 Reorder point update completed successfully!");
    console.log(
      "💡 New reorder points are calculated as 15% of current stock (min 5, max 50)"
    );
    console.log(
      "🔄 Reorder points will automatically update when stock levels change"
    );
  } catch (error) {
    console.error("❌ Error in reorder point update process:", error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Run the script if called directly
if (require.main === module) {
  updateAllReorderPoints();
}

module.exports = { updateAllReorderPoints };
