const { db } = require("../config/database");

async function checkPOEndpoint() {
  try {
    console.log("Testing the actual PO endpoint that frontend calls\n");

    // Simulate the exact query that the frontend would make
    const purchaseOrders = await db("purchase_orders as po")
      .leftJoin("suppliers as s", "po.supplier_id", "s.id")
      .leftJoin("supply_requests as sr", "po.supply_request_id", "sr.id")
      .select(
        "po.*",
        "s.name as supplier_name",
        "s.contact_person as supplier_contact",
        "s.email as supplier_email",
        "s.phone as supplier_phone",
        "sr.request_id as supply_request_number"
      )
      .whereNull("po.deleted_at")
      .orderBy("po.created_at", "desc");

    // Find PO 32 (1756625418014)
    const targetPO = purchaseOrders.find((po) => po.id === 32);

    if (!targetPO) {
      console.log("❌ PO 32 not found in the results");
      return;
    }

    console.log(`Found PO: ${targetPO.po_number} (ID: ${targetPO.id})`);
    console.log(`Status: ${targetPO.status}`);
    console.log(`Supplier: ${targetPO.supplier_name}`);

    // Get GRN info for this PO
    const grnInfo = await db("goods_receipt_notes")
      .where("purchase_order_id", targetPO.id)
      .whereNull("deleted_at")
      .select("status")
      .orderBy("created_at", "desc");

    console.log(`\nGRNs: ${grnInfo.length}`);
    grnInfo.forEach((grn, index) => {
      console.log(`  ${index + 1}. Status: "${grn.status}"`);
    });

    // Get pending returns count
    const pendingReturns = await db("item_returns as ir")
      .where("ir.purchase_order_id", targetPO.id)
      .where("ir.status", "!=", "Completed")
      .whereNull("ir.deleted_at")
      .count("* as count")
      .first();

    const pendingReturnsCount = parseInt(pendingReturns.count);
    console.log(`\nPending Returns: ${pendingReturnsCount}`);

    // Simulate the frontend data structure
    const frontendData = {
      ...targetPO,
      grn_count: grnInfo.length,
      grn_statuses: grnInfo.map((grn) => grn.status),
      latest_grn_status: grnInfo.length > 0 ? grnInfo[0].status : null,
      pending_returns_count: pendingReturnsCount,
      has_pending_returns: pendingReturnsCount > 0,
    };

    console.log(`\nFrontend Data Structure:`);
    console.log(`  grn_count: ${frontendData.grn_count}`);
    console.log(`  grn_statuses: [${frontendData.grn_statuses.join(", ")}]`);
    console.log(`  latest_grn_status: "${frontendData.latest_grn_status}"`);
    console.log(
      `  pending_returns_count: ${frontendData.pending_returns_count}`
    );
    console.log(`  has_pending_returns: ${frontendData.has_pending_returns}`);

    if (frontendData.has_pending_returns) {
      console.log(
        `\n❌ Frontend would show: "Create GRN (${frontendData.pending_returns_count} Returns Pending)"`
      );
    } else {
      console.log(`\n✅ Frontend should show: "Create GRN" (enabled)`);
    }

    // Test the can-create-grn endpoint
    const canCreateResult =
      await require("../models/PurchaseOrder").canCreateNewGRN(targetPO.id);
    console.log(`\nCan Create GRN API Result:`);
    console.log(`  canCreate: ${canCreateResult.canCreate}`);
    console.log(`  reason: ${canCreateResult.reason}`);
  } catch (error) {
    console.error("Error checking PO endpoint:", error);
  } finally {
    await db.destroy();
  }
}

checkPOEndpoint();
