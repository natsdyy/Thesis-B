const { db } = require("../config/database");

async function testGRNEligibility(purchaseOrderId) {
  try {
    console.log(
      `Testing GRN creation eligibility for PO ID: ${purchaseOrderId}\n`
    );

    // Get all GRNs for this PO
    const grns = await db("goods_receipt_notes")
      .where("purchase_order_id", purchaseOrderId)
      .whereNull("deleted_at")
      .select("id", "grn_number", "status", "created_at")
      .orderBy("created_at", "desc");

    console.log(`Found ${grns.length} GRNs for this PO:`);
    grns.forEach((grn, index) => {
      console.log(
        `  ${index + 1}. ${grn.grn_number} - Status: "${grn.status}" (Created: ${new Date(grn.created_at).toLocaleDateString()})`
      );
    });

    // Check if there are any failed GRNs
    const failedGRNs = grns.filter((grn) => grn.status === "failed");
    console.log(`\nFailed GRNs: ${failedGRNs.length}`);

    if (failedGRNs.length > 0) {
      // Check if there are pending returns for failed GRNs
      const pendingReturns = await db("item_returns as ir")
        .leftJoin(
          "grn_items as gi",
          "ir.purchase_order_item_id",
          "gi.purchase_order_item_id"
        )
        .leftJoin("goods_receipt_notes as grn", "gi.grn_id", "grn.id")
        .where("grn.purchase_order_id", purchaseOrderId)
        .where("grn.status", "failed")
        .where("ir.status", "!=", "Completed")
        .whereNull("ir.deleted_at")
        .select("ir.id", "ir.status", "ir.return_reason", "ir.created_at");

      console.log(
        `\nPending returns for failed GRNs: ${pendingReturns.length}`
      );
      pendingReturns.forEach((ret, index) => {
        console.log(
          `  ${index + 1}. Return ID: ${ret.id} - Status: ${ret.status} - Reason: ${ret.return_reason}`
        );
      });

      if (pendingReturns.length > 0) {
        console.log(
          `\n❌ CANNOT CREATE GRN: ${pendingReturns.length} return(s) still pending completion`
        );
      } else {
        console.log(
          `\n✅ CAN CREATE GRN: All returns from failed GRNs are completed`
        );
      }
    } else {
      // Check if there are completed or passed GRNs
      const completedGRNs = grns.filter(
        (grn) => grn.status === "completed" || grn.status === "passed"
      );

      if (completedGRNs.length > 0) {
        console.log(
          `\n❌ CANNOT CREATE GRN: Items already received and processed`
        );
      } else {
        // Check if there are active GRNs (draft, pending_inspection)
        const activeGRNs = grns.filter(
          (grn) => grn.status === "draft" || grn.status === "pending_inspection"
        );

        if (activeGRNs.length > 0) {
          console.log(
            `\n❌ CANNOT CREATE GRN: ${activeGRNs.length} existing GRN(s) in progress`
          );
        } else {
          console.log(`\n✅ CAN CREATE GRN: No blocking conditions found`);
        }
      }
    }
  } catch (error) {
    console.error("Error testing GRN eligibility:", error);
  } finally {
    await db.destroy();
  }
}

// Test with the PO ID from the screenshot (1756625418014)
const poId = process.argv[2] || 33; // Default to PO ID 33 (1756625418014)
testGRNEligibility(poId);
