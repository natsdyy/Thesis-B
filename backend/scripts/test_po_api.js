const { db } = require("../config/database");

async function testPOAPI() {
  try {
    console.log("Testing PO API data for PO ID: 32\n");

    // Simulate what the frontend would get from the API
    const po = await db("purchase_orders as po")
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
      .where("po.id", 32)
      .whereNull("po.deleted_at")
      .first();

    if (!po) {
      console.log("❌ PO not found");
      return;
    }

    console.log(`PO Number: ${po.po_number}`);
    console.log(`Status: ${po.status}`);
    console.log(`Supplier: ${po.supplier_name}`);

    // Get GRN info
    const grnInfo = await db("goods_receipt_notes")
      .where("purchase_order_id", po.id)
      .whereNull("deleted_at")
      .select("id", "status", "created_at")
      .orderBy("created_at", "desc");

    console.log(`\nGRNs: ${grnInfo.length}`);
    grnInfo.forEach((grn, index) => {
      console.log(
        `  ${index + 1}. Status: "${grn.status}" (Created: ${new Date(grn.created_at).toLocaleDateString()})`
      );
    });

    // Get pending returns count
    const pendingReturns = await db("item_returns as ir")
      .where("ir.purchase_order_id", po.id)
      .where("ir.status", "!=", "Completed")
      .whereNull("ir.deleted_at")
      .count("* as count")
      .first();

    const pendingReturnsCount = parseInt(pendingReturns.count);
    console.log(`\nPending Returns: ${pendingReturnsCount}`);

    // Test GRN creation eligibility
    const canCreateResult =
      await require("../models/PurchaseOrder").canCreateNewGRN(po.id);
    console.log(
      `\nCan Create GRN: ${canCreateResult.canCreate ? "✅ YES" : "❌ NO"}`
    );
    console.log(`Reason: ${canCreateResult.reason}`);

    // Simulate the frontend data structure
    const frontendData = {
      ...po,
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
  } catch (error) {
    console.error("Error testing PO API:", error);
  } finally {
    await db.destroy();
  }
}

testPOAPI();
