const { db } = require("../config/database");

async function checkDuplicateGRNs() {
  try {
    console.log("Checking for duplicate GRNs...\n");

    // Get all GRNs grouped by purchase_order_id
    const grnGroups = await db("goods_receipt_notes")
      .select("purchase_order_id")
      .whereNull("deleted_at")
      .groupBy("purchase_order_id")
      .havingRaw("COUNT(*) > 1");

    if (grnGroups.length === 0) {
      console.log("✅ No duplicate GRNs found!");
      return;
    }

    console.log(
      `❌ Found ${grnGroups.length} purchase orders with duplicate GRNs:\n`
    );

    for (const group of grnGroups) {
      const grns = await db("goods_receipt_notes as grn")
        .leftJoin("purchase_orders as po", "grn.purchase_order_id", "po.id")
        .leftJoin("suppliers as s", "po.supplier_id", "s.id")
        .where("grn.purchase_order_id", group.purchase_order_id)
        .whereNull("grn.deleted_at")
        .select(
          "grn.id",
          "grn.grn_number",
          "grn.status",
          "grn.created_at",
          "po.po_number",
          "s.name as supplier_name"
        )
        .orderBy("grn.created_at", "desc");

      console.log(
        `📋 PO: ${grns[0].po_number} (Supplier: ${grns[0].supplier_name})`
      );
      console.log(`   Purchase Order ID: ${group.purchase_order_id}`);
      console.log(`   Total GRNs: ${grns.length}\n`);

      grns.forEach((grn, index) => {
        const status =
          grn.status === "draft"
            ? "🟡 Draft"
            : grn.status === "pending_inspection"
              ? "🟠 Pending Inspection"
              : grn.status === "passed"
                ? "🟢 Passed"
                : grn.status === "failed"
                  ? "🔴 Failed"
                  : grn.status === "completed"
                    ? "✅ Completed"
                    : grn.status;

        console.log(
          `   ${index + 1}. ${grn.grn_number} - ${status} (Created: ${new Date(grn.created_at).toLocaleDateString()})`
        );
      });

      console.log("");
    }

    console.log(
      "💡 Recommendation: Run the cleanup script to automatically mark older GRNs as soft-deleted."
    );
    console.log("   Command: node backend/scripts/cleanup_duplicate_grns.js\n");
  } catch (error) {
    console.error("Error checking duplicate GRNs:", error);
  } finally {
    await db.destroy();
  }
}

checkDuplicateGRNs();
