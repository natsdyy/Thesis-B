const { db } = require("../config/database");

async function testIndividualInspection() {
  try {
    console.log("Testing Individual Item Inspection Functionality\n");

    // Get a GRN with pending inspection
    const grn = await db("goods_receipt_notes as grn")
      .leftJoin("grn_items as gi", "grn.id", "gi.grn_id")
      .where("grn.status", "pending_inspection")
      .where("gi.quality_status", "pending")
      .select(
        "grn.id as grn_id",
        "grn.grn_number",
        "grn.status as grn_status",
        "gi.id as item_id",
        "gi.quality_status as item_quality_status"
      )
      .first();

    if (!grn) {
      console.log("❌ No GRN found with pending inspection items");
      return;
    }

    console.log(`Found GRN: ${grn.grn_number} (ID: ${grn.grn_id})`);
    console.log(`GRN Status: ${grn.grn_status}`);
    console.log(
      `Item ID: ${grn.item_id}, Quality Status: ${grn.item_quality_status}\n`
    );

    // Test individual inspection
    console.log("Testing individual item inspection...");

    // Simulate marking one item as passed
    await db("grn_items").where("id", grn.item_id).update({
      quality_status: "passed",
      quality_notes: "Item passed individual inspection test",
      inspected_by: 1, // Assuming user ID 1 exists
      inspected_at: new Date(),
      updated_at: new Date(),
    });

    console.log("✅ Marked item as passed");

    // Check if GRN status should change
    const updatedItems = await db("grn_items")
      .where("grn_id", grn.grn_id)
      .select("quality_status");

    console.log("\nUpdated item statuses:");
    updatedItems.forEach((item, index) => {
      console.log(`  Item ${index + 1}: ${item.quality_status}`);
    });

    const allInspected = updatedItems.every(
      (item) => item.quality_status !== "pending"
    );
    const hasFailed = updatedItems.some(
      (item) => item.quality_status === "failed"
    );
    const hasPassed = updatedItems.some(
      (item) => item.quality_status === "passed"
    );

    console.log(`\nAll items inspected: ${allInspected}`);
    console.log(`Has failed items: ${hasFailed}`);
    console.log(`Has passed items: ${hasPassed}`);

    if (allInspected) {
      let newGRNStatus = "passed";
      if (hasFailed) {
        newGRNStatus = "failed";
      } else if (hasPassed && hasFailed) {
        newGRNStatus = "mixed"; // This would be handled by the frontend
      }

      console.log(`\nGRN status should be: ${newGRNStatus}`);

      // Update GRN status
      await db("goods_receipt_notes").where("id", grn.grn_id).update({
        status: newGRNStatus,
        updated_at: new Date(),
      });

      console.log("✅ Updated GRN status");
    }

    console.log("\n🎉 Individual inspection test completed successfully!");
  } catch (error) {
    console.error("Error testing individual inspection:", error);
  } finally {
    await db.destroy();
  }
}

testIndividualInspection();
