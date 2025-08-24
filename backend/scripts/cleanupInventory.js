// backend/scripts/cleanupInventory.js
const { db } = require("../config/database");

async function cleanupInventoryItems() {
  const trx = await db.transaction();

  try {
    console.log("🗑️  Starting inventory items cleanup...");

    // Check if tables exist
    const inventoryItemsExists = await trx.schema.hasTable("inventory_items");
    const inventoryTransactionsExists = await trx.schema.hasTable(
      "inventory_transactions"
    );

    if (!inventoryItemsExists) {
      console.log("⏭️  Table inventory_items doesn't exist");
      await trx.commit();
      return;
    }

    // Delete in the correct order to respect foreign key constraints
    const tablesToClean = [
      "inventory_transactions", // Delete child records first
      "inventory_items", // Then delete parent records
    ];

    let totalDeleted = 0;

    for (const table of tablesToClean) {
      try {
        const tableExists = await trx.schema.hasTable(table);

        if (!tableExists) {
          console.log(`⏭️  Table ${table} doesn't exist, skipping...`);
          continue;
        }

        // Get count before deletion
        const countBefore = await trx(table).count("* as count").first();
        const recordCount = parseInt(countBefore.count);

        if (recordCount === 0) {
          console.log(`✅ No records found in ${table}`);
          continue;
        }

        console.log(`📊 Found ${recordCount} records in ${table}`);

        // Delete all records from table
        const deletedCount = await trx(table).del();
        console.log(`✅ Deleted ${deletedCount} records from ${table}`);
        totalDeleted += deletedCount;
      } catch (error) {
        console.error(`❌ Error cleaning table ${table}:`, error.message);
        throw error; // Stop execution if there's an error
      }
    }

    await trx.commit();

    console.log("\n🎉 Inventory cleanup completed!");
    console.log(`📊 Total records deleted: ${totalDeleted}`);
  } catch (error) {
    await trx.rollback();
    console.error("❌ Error during inventory cleanup:", error);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  cleanupInventoryItems()
    .then(() => {
      console.log("✅ Inventory cleanup completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Inventory cleanup failed:", error);
      process.exit(1);
    });
}

module.exports = { cleanupInventoryItems };
