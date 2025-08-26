const { db } = require("../config/database");
const PurchaseOrder = require("../models/PurchaseOrder");
const GoodsReceiptNote = require("../models/GoodsReceiptNote");

async function testGRNCreationValidation() {
  try {
    console.log("Testing GRN creation validation with pending returns...");

    // Find a purchase order with failed GRNs
    const posWithFailedGRNs = await db("purchase_orders as po")
      .leftJoin("goods_receipt_notes as grn", "po.id", "grn.purchase_order_id")
      .where("grn.status", "failed")
      .whereNull("po.deleted_at")
      .select(
        "po.id",
        "po.po_number",
        "grn.id as grn_id",
        "grn.status as grn_status"
      )
      .limit(5);

    console.log("Found POs with failed GRNs:", posWithFailedGRNs);

    if (posWithFailedGRNs.length === 0) {
      console.log("No POs with failed GRNs found. Test completed.");
      return;
    }

    const testPOId = posWithFailedGRNs[0].id;
    console.log(
      `Testing PO ${testPOId} (${posWithFailedGRNs[0].po_number})...`
    );

    // Check if we can create a new GRN
    const canCreateCheck = await PurchaseOrder.canCreateNewGRN(testPOId);
    console.log("Can create new GRN:", canCreateCheck);

    // Get pending returns count
    const pendingReturnsCount =
      await PurchaseOrder.getPendingReturnsCount(testPOId);
    console.log("Pending returns count:", pendingReturnsCount);

    // Try to create a GRN (this should fail if there are pending returns)
    if (pendingReturnsCount > 0) {
      console.log("Attempting to create GRN (should fail)...");
      try {
        const grnData = {
          received_by: 1,
          received_date: new Date(),
          notes: "Test GRN creation with pending returns",
          is_partial: false,
        };

        await GoodsReceiptNote.createFromPO(testPOId, grnData);
        console.log(
          "ERROR: GRN creation succeeded when it should have failed!"
        );
      } catch (error) {
        console.log(
          "SUCCESS: GRN creation properly blocked with error:",
          error.message
        );
      }
    } else {
      console.log("No pending returns found, GRN creation should be allowed.");
    }
  } catch (error) {
    console.error("Test failed:", error.message);
    console.error("Stack trace:", error.stack);
  } finally {
    await db.destroy();
  }
}

// Run the test
testGRNCreationValidation();
