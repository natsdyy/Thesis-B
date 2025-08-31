const { db } = require("../config/database");

async function checkReturnsForPO(purchaseOrderId) {
  try {
    console.log(`Checking returns for PO ID: ${purchaseOrderId}\n`);

    const returns = await db("item_returns as ir")
      .leftJoin(
        "purchase_order_items as poi",
        "ir.purchase_order_item_id",
        "poi.id"
      )
      .where("ir.purchase_order_id", purchaseOrderId)
      .whereNull("ir.deleted_at")
      .select(
        "ir.id",
        "ir.return_quantity",
        "ir.return_reason",
        "ir.status",
        "ir.notes",
        "ir.logged_by",
        "ir.created_at",
        "poi.item_name"
      )
      .orderBy("ir.created_at", "desc");

    console.log(`Found ${returns.length} returns for this PO:`);
    returns.forEach((ret, index) => {
      console.log(`  ${index + 1}. Return ID: ${ret.id}`);
      console.log(`     Item: ${ret.item_name}`);
      console.log(`     Quantity: ${ret.return_quantity}`);
      console.log(`     Status: "${ret.status}"`);
      console.log(`     Reason: ${ret.return_reason}`);
      console.log(`     Notes: ${ret.notes}`);
      console.log(
        `     Created: ${new Date(ret.created_at).toLocaleDateString()}`
      );
      console.log("");
    });

    const pendingReturns = returns.filter((r) => r.status !== "Completed");
    console.log(`Pending returns: ${pendingReturns.length}`);

    if (pendingReturns.length > 0) {
      console.log(
        "❌ Cannot create new GRN: Pending returns must be completed first"
      );
    } else {
      console.log("✅ Can create new GRN: All returns are completed");
    }
  } catch (error) {
    console.error("Error checking returns:", error);
  } finally {
    await db.destroy();
  }
}

// Check returns for PO 1756625418014 (ID: 32)
const poId = process.argv[2] || 32;
checkReturnsForPO(poId);
