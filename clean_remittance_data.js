/**
 * Clean Remittance Data Script
 *
 * This script resets all pos_sales_orders to have remittance_id = null
 * and clears remittance-related timestamps.
 *
 * WARNING: This will remove all remittance associations from sales orders.
 * Only run this if you want to start fresh with remittances.
 */

const { db } = require("./backend/config/database");

async function cleanRemittanceData() {
  console.log("🧹 Starting remittance data cleanup...");

  try {
    // Start a transaction to ensure data consistency
    await db.transaction(async (trx) => {
      // First, let's see how many records we're about to update
      const countResult = await trx("pos_sales_orders")
        .whereNotNull("remittance_id")
        .count("* as count");

      const totalCount = countResult[0].count;
      console.log(`📊 Found ${totalCount} sales orders with remittance_id set`);

      if (totalCount === 0) {
        console.log(
          "✅ No records to clean up. All sales orders already have remittance_id = null"
        );
        return;
      }

      // Reset all remittance-related fields in pos_sales_orders
      const updateResult = await trx("pos_sales_orders")
        .whereNotNull("remittance_id")
        .update({
          remittance_id: null,
          remitted_at: null,
          updated_at: db.fn.now(),
        });

      console.log(`✅ Successfully updated ${updateResult} sales orders`);
      console.log("   - Set remittance_id = null");
      console.log("   - Set remitted_at = null");
      console.log("   - Updated updated_at timestamp");

      // Optional: Also clear the branch_remittances table if you want a complete reset
      const remittanceCountResult =
        await trx("branch_remittances").count("* as count");

      const remittanceCount = remittanceCountResult[0].count;
      console.log(
        `📊 Found ${remittanceCount} remittance records in branch_remittances table`
      );

      if (remittanceCount > 0) {
        console.log(
          "⚠️  Note: branch_remittances table still contains remittance records"
        );
        console.log(
          "   If you want to clear those as well, uncomment the section below"
        );

        // Uncomment the following lines if you also want to clear the branch_remittances table
        /*
        const deletedRemittances = await trx('branch_remittances')
          .whereNotNull('id')
          .del();
        console.log(`🗑️  Deleted ${deletedRemittances} remittance records`);
        */
      }
    });

    console.log("🎉 Remittance data cleanup completed successfully!");
    console.log("");
    console.log("📝 Next steps:");
    console.log(
      "   1. You can now create new remittances with proper timezone handling"
    );
    console.log(
      "   2. All sales orders are ready to be associated with new remittances"
    );
    console.log("   3. The new timezone-aware approval system is ready to use");
  } catch (error) {
    console.error("❌ Error during remittance data cleanup:", error);
    throw error;
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanRemittanceData()
    .then(() => {
      console.log("✅ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script failed:", error);
      process.exit(1);
    });
}

module.exports = { cleanRemittanceData };
