/**
 * Preview Remittance Cleanup Script
 *
 * This script shows you what data will be affected before cleaning.
 * Run this first to see what will be changed.
 */

const { db } = require("./backend/config/database");

async function previewRemittanceCleanup() {
  console.log("🔍 Previewing remittance data cleanup...");
  console.log("");

  try {
    // Count sales orders with remittance_id set
    const salesOrdersWithRemittance = await db("pos_sales_orders")
      .whereNotNull("remittance_id")
      .count("* as count");

    const totalSalesOrders = salesOrdersWithRemittance[0].count;
    console.log(`📊 Sales Orders with remittance_id set: ${totalSalesOrders}`);

    if (totalSalesOrders > 0) {
      // Show some sample records
      const sampleOrders = await db("pos_sales_orders")
        .select(
          "id",
          "order_number",
          "remittance_id",
          "remitted_at",
          "status",
          "total_amount"
        )
        .whereNotNull("remittance_id")
        .limit(10);

      console.log("\n📋 Sample orders that will be affected:");
      console.log(
        "ID    | Order Number  | Remittance ID | Status    | Amount    | Remitted At"
      );
      console.log(
        "------|---------------|---------------|-----------|-----------|-------------"
      );

      sampleOrders.forEach((order) => {
        const remittedAt = order.remitted_at
          ? new Date(order.remitted_at).toLocaleDateString("en-US")
          : "N/A";
        console.log(
          `${String(order.id).padEnd(5)} | ${String(order.order_number).padEnd(13)} | ${String(order.remittance_id).padEnd(13)} | ${String(order.status).padEnd(9)} | ₱${String(Number(order.total_amount || 0).toFixed(2)).padStart(8)} | ${remittedAt}`
        );
      });

      if (totalSalesOrders > 10) {
        console.log(`... and ${totalSalesOrders - 10} more orders`);
      }
    }

    // Count remittances in branch_remittances table
    const remittanceCount = await db("branch_remittances").count("* as count");

    const totalRemittances = remittanceCount[0].count;
    console.log(
      `\n📊 Total remittances in branch_remittances table: ${totalRemittances}`
    );

    if (totalRemittances > 0) {
      // Show some sample remittances
      const sampleRemittances = await db("branch_remittances")
        .select(
          "id",
          "branch_id",
          "period_type",
          "status",
          "gross_sales",
          "net_sales",
          "remitted_amount",
          "approved_at"
        )
        .limit(10);

      console.log("\n📋 Sample remittances:");
      console.log(
        "ID  | Branch | Period | Status    | Gross Sales | Net Sales | Remitted | Approved At"
      );
      console.log(
        "----|--------|--------|-----------|-------------|-----------|----------|-------------"
      );

      sampleRemittances.forEach((remittance) => {
        const approvedAt = remittance.approved_at
          ? new Date(remittance.approved_at).toLocaleDateString("en-US")
          : "N/A";
        console.log(
          `${String(remittance.id).padEnd(3)} | ${String(remittance.branch_id).padEnd(6)} | ${String(remittance.period_type).padEnd(6)} | ${String(remittance.status).padEnd(9)} | ₱${String(Number(remittance.gross_sales || 0).toFixed(2)).padStart(10)} | ₱${String(Number(remittance.net_sales || 0).toFixed(2)).padStart(8)} | ₱${String(Number(remittance.remitted_amount || 0).toFixed(2)).padStart(7)} | ${approvedAt}`
        );
      });

      if (totalRemittances > 10) {
        console.log(`... and ${totalRemittances - 10} more remittances`);
      }
    }

    console.log("\n📝 Summary:");
    console.log(
      `   • ${totalSalesOrders} sales orders will have remittance_id set to null`
    );
    console.log(
      `   • ${totalRemittances} remittance records will remain in branch_remittances table`
    );
    console.log(
      "\n⚠️  WARNING: This will disconnect all sales orders from their remittances!"
    );
    console.log(
      "   Make sure you want to start fresh with remittances before proceeding."
    );
    console.log(
      "\n💡 To proceed with cleanup, run: node clean_remittance_data.js"
    );
  } catch (error) {
    console.error("❌ Error during preview:", error);
    throw error;
  }
}

// Run the preview if this script is executed directly
if (require.main === module) {
  previewRemittanceCleanup()
    .then(() => {
      console.log("\n✅ Preview completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Preview failed:", error);
      process.exit(1);
    });
}

module.exports = { previewRemittanceCleanup };
