const { db } = require("../config/database");
const PurchaseOrder = require("../models/PurchaseOrder");

async function testGRNEligibility(purchaseOrderId) {
  try {
    console.log(
      `Testing GRN creation eligibility for PO ID: ${purchaseOrderId}\n`
    );

    // Use the actual backend method
    const result = await PurchaseOrder.canCreateNewGRN(purchaseOrderId);

    console.log(
      `Result: ${result.canCreate ? "✅ CAN CREATE" : "❌ CANNOT CREATE"}`
    );
    console.log(`Reason: ${result.reason}\n`);

    // Also show the GRNs for reference
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
  } catch (error) {
    console.error("Error testing GRN eligibility:", error);
  } finally {
    await db.destroy();
  }
}

// Test with the PO ID from the screenshot (1756625418014)
const poId = process.argv[2] || 32; // Default to PO ID 32 (1756625418014)
testGRNEligibility(poId);
