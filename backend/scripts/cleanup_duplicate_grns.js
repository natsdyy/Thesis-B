const { db } = require("../config/database");

async function cleanupDuplicateGRNs() {
  try {
    console.log("Cleaning up duplicate GRNs...\n");

    // Get all purchase orders with multiple GRNs
    const grnGroups = await db("goods_receipt_notes")
      .select("purchase_order_id")
      .whereNull("deleted_at")
      .groupBy("purchase_order_id")
      .havingRaw("COUNT(*) > 1");

    if (grnGroups.length === 0) {
      console.log("✅ No duplicate GRNs found to clean up!");
      return;
    }

    console.log(
      `🔧 Found ${grnGroups.length} purchase orders with duplicate GRNs to clean up:\n`
    );

    let totalCleaned = 0;

    for (const group of grnGroups) {
      // Get all GRNs for this PO, ordered by creation date (newest first)
      const grns = await db("goods_receipt_notes")
        .where("purchase_order_id", group.purchase_order_id)
        .whereNull("deleted_at")
        .select("id", "grn_number", "status", "created_at")
        .orderBy("created_at", "desc");

      // Keep the most recent GRN, mark others as deleted
      const grnToKeep = grns[0];
      const grnsToDelete = grns.slice(1);

      console.log(`📋 PO ID: ${group.purchase_order_id}`);
      console.log(
        `   Keeping: ${grnToKeep.grn_number} (${grnToKeep.status}) - Created: ${new Date(grnToKeep.created_at).toLocaleDateString()}`
      );
      console.log(`   Soft-deleting: ${grnsToDelete.length} duplicate GRN(s)`);

      // Mark older GRNs as deleted
      const grnIdsToDelete = grnsToDelete.map((grn) => grn.id);

      await db("goods_receipt_notes")
        .whereIn("id", grnIdsToDelete)
        .update({ deleted_at: new Date() });

      totalCleaned += grnsToDelete.length;
      console.log(
        `   ✅ Soft-deleted ${grnsToDelete.length} duplicate GRN(s)\n`
      );
    }

    console.log(
      `🎉 Cleanup completed! Total GRNs soft-deleted: ${totalCleaned}`
    );
    console.log(
      `📝 Note: Soft-deleted GRNs are marked with deleted_at timestamp but remain in the database for audit purposes.`
    );
  } catch (error) {
    console.error("Error cleaning up duplicate GRNs:", error);
  } finally {
    await db.destroy();
  }
}

cleanupDuplicateGRNs();
