const { db } = require("../config/database");
const GoodsReceiptNote = require("../models/GoodsReceiptNote");

async function testQualityInspection() {
  try {
    console.log("Testing GRN quality inspection with decimal quantities...");

    // First, let's check if there are any GRNs with decimal received quantities
    const grnItems = await db("grn_items")
      .select("id", "grn_id", "received_quantity", "quality_status")
      .whereNotNull("received_quantity")
      .limit(5);

    console.log("Found GRN items:", grnItems);

    if (grnItems.length === 0) {
      console.log("No GRN items found. Test completed.");
      return;
    }

    // Test the bulk quality inspection with a failed result
    const testGRNId = grnItems[0].grn_id;
    const testInspectorId = 1; // Assuming user ID 1 exists

    console.log(`Testing bulk quality inspection for GRN ${testGRNId}...`);

    // This should now work without the decimal-to-integer conversion error
    const result = await GoodsReceiptNote.performBulkQualityInspection(
      testGRNId,
      testInspectorId,
      "failed",
      "Test quality inspection with decimal quantities"
    );

    console.log("Quality inspection completed successfully!");
    console.log("Result:", result);
  } catch (error) {
    console.error("Test failed:", error.message);
    console.error("Stack trace:", error.stack);
  } finally {
    await db.destroy();
  }
}

// Run the test
testQualityInspection();
