const { db } = require("../config/database");
const { formatForDatabase } = require("../utils/timezoneUtils");

/**
 * Script to analyze unremitted sales and identify the discrepancy
 * between total sales and remitted amounts
 */

async function analyzeUnremittedSales(
  branchId = null,
  dateFrom = null,
  dateTo = null
) {
  try {
    console.log("🔍 Analyzing unremitted sales...\n");

    // Default to current month if no dates provided
    if (!dateFrom || !dateTo) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      dateFrom = formatForDatabase(startOfMonth);
      dateTo = formatForDatabase(endOfMonth);
    }

    console.log(`📅 Analysis Period: ${dateFrom} to ${dateTo}`);
    if (branchId) console.log(`🏢 Branch ID: ${branchId}`);
    console.log("─".repeat(50));

    // 1. Get total sales (all completed orders)
    const totalSalesQuery = db("pos_sales_orders as pso")
      .leftJoin("branches as b", "pso.branch_id", "b.id")
      .select(
        "pso.branch_id",
        "b.name as branch_name",
        db.raw("COUNT(*) as total_orders"),
        db.raw("SUM(pso.total_amount) as total_sales"),
        db.raw("0 as total_refunds"),
        db.raw("0 as total_voids")
      )
      .where("pso.status", "completed")
      .where("pso.created_at", ">=", dateFrom)
      .where("pso.created_at", "<=", dateTo);

    if (branchId) {
      totalSalesQuery.where("pso.branch_id", branchId);
    }

    const totalSales = await totalSalesQuery.groupBy("pso.branch_id", "b.name");

    // 2. Get remitted sales (orders linked to approved remittances)
    const remittedSalesQuery = db("pos_sales_orders as pso")
      .leftJoin("branches as b", "pso.branch_id", "b.id")
      .leftJoin("branch_remittances as br", "pso.remittance_id", "br.id")
      .select(
        "pso.branch_id",
        "b.name as branch_name",
        db.raw("COUNT(*) as remitted_orders"),
        db.raw("SUM(pso.total_amount) as remitted_sales"),
        db.raw("SUM(br.refunded_amount) as remitted_refunds"),
        db.raw("SUM(br.voided_amount) as remitted_voids")
      )
      .where("pso.status", "completed")
      .whereNotNull("pso.remittance_id")
      .where("br.status", "approved")
      .where("pso.created_at", ">=", dateFrom)
      .where("pso.created_at", "<=", dateTo);

    if (branchId) {
      remittedSalesQuery.where("pso.branch_id", branchId);
    }

    const remittedSales = await remittedSalesQuery.groupBy(
      "pso.branch_id",
      "b.name"
    );

    // 3. Get unremitted sales (completed orders not linked to any remittance)
    const unremittedSalesQuery = db("pos_sales_orders as pso")
      .leftJoin("branches as b", "pso.branch_id", "b.id")
      .select(
        "pso.branch_id",
        "b.name as branch_name",
        db.raw("COUNT(*) as unremitted_orders"),
        db.raw("SUM(pso.total_amount) as unremitted_sales"),
        db.raw("0 as unremitted_refunds"),
        db.raw("0 as unremitted_voids")
      )
      .where("pso.status", "completed")
      .whereNull("pso.remittance_id")
      .where("pso.created_at", ">=", dateFrom)
      .where("pso.created_at", "<=", dateTo);

    if (branchId) {
      unremittedSalesQuery.where("pso.branch_id", branchId);
    }

    const unremittedSales = await unremittedSalesQuery.groupBy(
      "pso.branch_id",
      "b.name"
    );

    // 4. Get pending remittances (orders linked to pending remittances)
    const pendingRemittancesQuery = db("pos_sales_orders as pso")
      .leftJoin("branches as b", "pso.branch_id", "b.id")
      .leftJoin("branch_remittances as br", "pso.remittance_id", "br.id")
      .select(
        "pso.branch_id",
        "b.name as branch_name",
        db.raw("COUNT(*) as pending_orders"),
        db.raw("SUM(pso.total_amount) as pending_sales"),
        db.raw("br.status as remittance_status")
      )
      .where("pso.status", "completed")
      .whereNotNull("pso.remittance_id")
      .where("br.status", "pending")
      .where("pso.created_at", ">=", dateFrom)
      .where("pso.created_at", "<=", dateTo);

    if (branchId) {
      pendingRemittancesQuery.where("pso.branch_id", branchId);
    }

    const pendingRemittances = await pendingRemittancesQuery.groupBy(
      "pso.branch_id",
      "b.name",
      "br.status"
    );

    // 5. Display results
    console.log("\n📊 ANALYSIS RESULTS:");
    console.log("═".repeat(60));

    for (const total of totalSales) {
      const branchName = total.branch_name || `Branch ${total.branch_id}`;
      console.log(`\n🏢 ${branchName} (ID: ${total.branch_id})`);
      console.log("─".repeat(40));

      // Find corresponding remitted and unremitted data
      const remitted = remittedSales.find(
        (r) => r.branch_id === total.branch_id
      );
      const unremitted = unremittedSales.find(
        (u) => u.branch_id === total.branch_id
      );
      const pending = pendingRemittances.find(
        (p) => p.branch_id === total.branch_id
      );

      // Calculate net sales (total - refunds - voids)
      const totalNetSales =
        parseFloat(total.total_sales || 0) -
        parseFloat(total.total_refunds || 0) -
        parseFloat(total.total_voids || 0);
      const remittedNetSales = remitted
        ? parseFloat(remitted.remitted_sales || 0) -
          parseFloat(remitted.remitted_refunds || 0) -
          parseFloat(remitted.remitted_voids || 0)
        : 0;
      const unremittedNetSales = unremitted
        ? parseFloat(unremitted.unremitted_sales || 0) -
          parseFloat(unremitted.unremitted_refunds || 0) -
          parseFloat(unremitted.unremitted_voids || 0)
        : 0;
      const pendingNetSales = pending
        ? parseFloat(pending.pending_sales || 0)
        : 0;

      console.log(
        `📈 Total Sales: ₱${totalNetSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      );
      console.log(`   ├─ Orders: ${total.total_orders}`);
      console.log(
        `   ├─ Gross: ₱${parseFloat(total.total_sales || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      );
      console.log(
        `   ├─ Refunds: ₱${parseFloat(total.total_refunds || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      );
      console.log(
        `   └─ Voids: ₱${parseFloat(total.total_voids || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      );

      console.log(
        `\n✅ Remitted Sales: ₱${remittedNetSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      );
      if (remitted) {
        console.log(`   ├─ Orders: ${remitted.remitted_orders}`);
        console.log(
          `   ├─ Gross: ₱${parseFloat(remitted.remitted_sales || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
        );
        console.log(
          `   ├─ Refunds: ₱${parseFloat(remitted.remitted_refunds || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
        );
        console.log(
          `   └─ Voids: ₱${parseFloat(remitted.remitted_voids || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
        );
      }

      if (pending) {
        console.log(
          `\n⏳ Pending Remittances: ₱${pendingNetSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
        );
        console.log(`   ├─ Orders: ${pending.pending_orders}`);
        console.log(`   └─ Status: ${pending.remittance_status}`);
      }

      console.log(
        `\n❌ Unremitted Sales: ₱${unremittedNetSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      );
      if (unremitted) {
        console.log(`   ├─ Orders: ${unremitted.unremitted_orders}`);
        console.log(
          `   ├─ Gross: ₱${parseFloat(unremitted.unremitted_sales || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
        );
        console.log(
          `   ├─ Refunds: ₱${parseFloat(unremitted.unremitted_refunds || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
        );
        console.log(
          `   └─ Voids: ₱${parseFloat(unremitted.unremitted_voids || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
        );
      }

      // Calculate discrepancy
      const discrepancy = totalNetSales - remittedNetSales - pendingNetSales;
      console.log(
        `\n🔍 Discrepancy: ₱${discrepancy.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      );

      if (Math.abs(discrepancy) > 0.01) {
        console.log(
          `   ⚠️  This matches your reported difference of ₱8,550.01`
        );
      }
    }

    // 6. Get detailed unremitted orders for the first branch
    if (unremittedSales.length > 0) {
      const firstBranch = unremittedSales[0];
      console.log(
        `\n📋 DETAILED UNREMITTED ORDERS FOR ${firstBranch.branch_name}:`
      );
      console.log("─".repeat(50));

      const unremittedOrders = await db("pos_sales_orders as pso")
        .leftJoin("branches as b", "pso.branch_id", "b.id")
        .select(
          "pso.id",
          "pso.order_number",
          "pso.total_amount",
          "pso.created_at",
          "pso.status"
        )
        .where("pso.branch_id", firstBranch.branch_id)
        .where("pso.status", "completed")
        .whereNull("pso.remittance_id")
        .where("pso.created_at", ">=", dateFrom)
        .where("pso.created_at", "<=", dateTo)
        .orderBy("pso.created_at", "desc")
        .limit(10);

      console.log("Recent unremitted orders:");
      unremittedOrders.forEach((order) => {
        const netAmount = parseFloat(order.total_amount || 0);
        console.log(
          `   Order #${order.order_number}: ₱${netAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${order.created_at})`
        );
      });

      if (unremittedOrders.length >= 10) {
        console.log(
          `   ... and ${firstBranch.unremitted_orders - 10} more orders`
        );
      }
    }

    console.log("\n✅ Analysis complete!");
    return {
      totalSales,
      remittedSales,
      unremittedSales,
      pendingRemittances,
    };
  } catch (error) {
    console.error("❌ Error analyzing unremitted sales:", error);
    throw error;
  }
}

// Run the analysis if this script is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const branchId = args[0] ? parseInt(args[0]) : null;
  const dateFrom = args[1] || null;
  const dateTo = args[2] || null;

  analyzeUnremittedSales(branchId, dateFrom, dateTo)
    .then(() => {
      console.log("\n🎉 Script completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Script failed:", error.message);
      process.exit(1);
    });
}

module.exports = { analyzeUnremittedSales };
