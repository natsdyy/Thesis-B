const { db } = require("../config/database");

async function checkGRNPoMapping() {
  try {
    console.log("Checking GRN to PO mapping...\n");

    const grns = await db("goods_receipt_notes as grn")
      .leftJoin("purchase_orders as po", "grn.purchase_order_id", "po.id")
      .whereNull("grn.deleted_at")
      .select(
        "grn.id",
        "grn.grn_number",
        "grn.status",
        "grn.purchase_order_id",
        "po.po_number",
        "po.supplier_id"
      )
      .orderBy("grn.created_at", "desc");

    console.log("GRN to PO Mapping:");
    grns.forEach((grn, index) => {
      console.log(
        `  ${index + 1}. ${grn.grn_number} (Status: "${grn.status}")`
      );
      console.log(
        `     PO ID: ${grn.purchase_order_id} | PO Number: ${grn.po_number}`
      );
      console.log("");
    });
  } catch (error) {
    console.error("Error checking GRN PO mapping:", error);
  } finally {
    await db.destroy();
  }
}

checkGRNPoMapping();
