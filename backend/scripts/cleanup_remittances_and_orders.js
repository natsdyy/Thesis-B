const { db } = require("../config/database");

async function cleanupRemittancesAndOrders() {
  try {
    console.log("🧹 Starting cleanup of remittances and orders...");

    // Step 1: Reset all pos_sales_orders remittance_id to null
    console.log(
      "\n📦 Step 1: Resetting all pos_sales_orders remittance_id to null..."
    );
    const resetOrders = await db("pos_sales_orders")
      .whereNotNull("remittance_id")
      .update({
        remittance_id: null,
        remitted_at: null,
      });

    console.log(`✅ Reset ${resetOrders} orders (removed remittance links)`);

    // Step 2: Show current remittances before cleanup
    console.log("\n📋 Step 2: Current remittances in database:");
    const currentRemittances = await db("branch_remittances")
      .whereNull("deleted_at")
      .select(
        "id",
        "branch_id",
        "remitted_amount",
        "gross_sales",
        "net_sales",
        "status",
        "approved_at"
      )
      .orderBy("id", "desc");

    console.log(`Found ${currentRemittances.length} remittances:`);
    currentRemittances.forEach((r) => {
      console.log(
        `  ID ${r.id}: Branch ${r.branch_id}, Amount: ₱${r.remitted_amount}, Status: ${r.status}`
      );
    });

    // Step 3: Ask for confirmation before deleting remittances
    console.log(
      "\n⚠️  WARNING: This will delete ALL remittances from the database!"
    );
    console.log("This action cannot be undone.");
    console.log("\nIf you want to proceed, uncomment the deletion code below.");

    // Uncomment the following lines to actually delete the remittances
    /*
    console.log('\n🗑️  Step 3: Deleting all remittances...');
    const deletedRemittances = await db('branch_remittances')
      .whereNull('deleted_at')
      .del();
    
    console.log(`✅ Deleted ${deletedRemittances} remittances`);
    */

    // Step 4: Verify cleanup
    console.log("\n🔍 Step 4: Verifying cleanup...");

    const remainingOrders = await db("pos_sales_orders")
      .whereNotNull("remittance_id")
      .count("* as count")
      .first();

    const remainingRemittances = await db("branch_remittances")
      .whereNull("deleted_at")
      .count("* as count")
      .first();

    console.log(`📊 Cleanup Results:`);
    console.log(`  Orders with remittance_id: ${remainingOrders.count}`);
    console.log(`  Active remittances: ${remainingRemittances.count}`);

    if (remainingOrders.count == 0) {
      console.log("✅ All orders have been unlinked from remittances");
    } else {
      console.log("⚠️  Some orders still have remittance_id - check the data");
    }

    console.log("\n🎉 Cleanup completed!");
    console.log("\n📝 Next steps:");
    console.log("1. Create new remittances with proper amounts");
    console.log("2. Link orders to remittances based on actual sales data");
    console.log("3. Verify the dashboard shows consistent data");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  } finally {
    await db.destroy();
  }
}

// Run the cleanup
cleanupRemittancesAndOrders();
