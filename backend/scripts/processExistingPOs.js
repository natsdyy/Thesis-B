// backend/scripts/processExistingPOs.js
const { db } = require("../config/database");
const PurchaseOrder = require("../models/PurchaseOrder");

async function processExistingCompletedPOs() {
  const trx = await db.transaction();

  try {
    console.log("🔄 Processing existing completed Purchase Orders...");

    // Get all completed POs that haven't been processed for inventory yet
    const completedPOs = await trx("purchase_orders")
      .where("status", "Completed")
      .whereNull("deleted_at")
      .select("*");

    console.log(`Found ${completedPOs.length} completed POs to process`);

    if (completedPOs.length === 0) {
      console.log("✅ No completed POs found to process");
      await trx.commit();
      return;
    }

    let processedCount = 0;
    let skippedCount = 0;

    for (const po of completedPOs) {
      try {
        // Check if this PO has already been processed (has inventory items)
        const existingInventory = await trx("inventory_items")
          .where("purchase_order_id", po.id)
          .first();

        if (existingInventory) {
          console.log(`⏭️  PO ${po.po_number} already processed, skipping...`);
          skippedCount++;
          continue;
        }

        console.log(`�� Processing PO ${po.po_number}...`);

        // Use the existing integration method
        await PurchaseOrder.addToInventoryOnCompletion(trx, po);

        processedCount++;
        console.log(`✅ Successfully processed PO ${po.po_number}`);
      } catch (error) {
        console.error(`❌ Error processing PO ${po.po_number}:`, error.message);
        // Continue with other POs even if one fails
      }
    }

    await trx.commit();

    console.log("\n🎉 Processing Complete!");
    console.log(`📊 Summary:`);
    console.log(`   - Total completed POs: ${completedPOs.length}`);
    console.log(`   - Successfully processed: ${processedCount}`);
    console.log(`   - Already processed (skipped): ${skippedCount}`);
    console.log(
      `   - Failed: ${completedPOs.length - processedCount - skippedCount}`
    );
  } catch (error) {
    await trx.rollback();
    console.error("❌ Error processing POs:", error);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  processExistingCompletedPOs()
    .then(() => {
      console.log("✅ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script failed:", error);
      process.exit(1);
    });
}

module.exports = { processExistingCompletedPOs };
