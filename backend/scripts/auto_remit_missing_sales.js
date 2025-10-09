const { db } = require("../config/database");
const {
  formatForDatabase,
  getCurrentPhilippineTime,
} = require("../utils/timezoneUtils");
const BranchRemittance = require("../models/BranchRemittance");
const POSOrder = require("../models/POSOrder");

/**
 * Script to automatically create remittances for unremitted sales
 * This will create new remittances for the missing ₱8,550.01
 */

async function autoRemitMissingSales(
  branchId = null,
  dateFrom = null,
  dateTo = null,
  dryRun = true
) {
  try {
    console.log("🤖 Auto-remitting missing sales...\n");

    if (dryRun) {
      console.log("🔍 DRY RUN MODE - No changes will be made");
    } else {
      console.log("⚠️  LIVE MODE - Changes will be made to the database");
    }

    // Default to current month if no dates provided
    if (!dateFrom || !dateTo) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      dateFrom = formatForDatabase(startOfMonth);
      dateTo = formatForDatabase(endOfMonth);
    }

    console.log(`📅 Remittance Period: ${dateFrom} to ${dateTo}`);
    if (branchId) console.log(`🏢 Branch ID: ${branchId}`);
    console.log("─".repeat(50));

    // Get branches to process
    let branchesToProcess = [];

    if (branchId) {
      // Process specific branch
      const branch = await db("branches").where("id", branchId).first();
      if (!branch) {
        throw new Error(`Branch with ID ${branchId} not found`);
      }
      branchesToProcess = [{ id: branchId, name: branch.name }];
    } else {
      // Process all branches with unremitted sales
      const branchesWithUnremitted = await db("pos_sales_orders as pso")
        .leftJoin("branches as b", "pso.branch_id", "b.id")
        .select("pso.branch_id", "b.name as branch_name")
        .where("pso.status", "completed")
        .whereNull("pso.remittance_id")
        .where("pso.created_at", ">=", dateFrom)
        .where("pso.created_at", "<=", dateTo)
        .groupBy("pso.branch_id", "b.name");

      branchesToProcess = branchesWithUnremitted;
    }

    const results = [];

    for (const branch of branchesToProcess) {
      console.log(`\n🏢 Processing ${branch.branch_name} (ID: ${branch.id})`);
      console.log("─".repeat(40));

      // Get unremitted orders for this branch
      const unremittedOrders = await db("pos_sales_orders as pso")
        .select(
          "pso.id",
          "pso.order_number",
          "pso.total_amount",
          "pso.created_at"
        )
        .where("pso.branch_id", branch.id)
        .where("pso.status", "completed")
        .whereNull("pso.remittance_id")
        .where("pso.created_at", ">=", dateFrom)
        .where("pso.created_at", "<=", dateTo)
        .orderBy("pso.created_at", "asc");

      if (unremittedOrders.length === 0) {
        console.log("   ✅ No unremitted orders found");
        continue;
      }

      // Calculate totals
      const totalGross = unremittedOrders.reduce(
        (sum, order) => sum + parseFloat(order.total_amount || 0),
        0
      );
      const totalRefunds = 0; // No refunds/voids stored in POS orders
      const totalVoids = 0; // No refunds/voids stored in POS orders
      const totalNet = totalGross; // Net equals gross for POS orders

      console.log(`   📊 Found ${unremittedOrders.length} unremitted orders`);
      console.log(
        `   💰 Total Gross: ₱${totalGross.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      );
      console.log(
        `   💸 Total Refunds: ₱${totalRefunds.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      );
      console.log(
        `   ❌ Total Voids: ₱${totalVoids.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      );
      console.log(
        `   📈 Net Sales: ₱${totalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      );

      if (dryRun) {
        console.log(
          `   🔍 DRY RUN: Would create remittance for ₱${totalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
        );
        results.push({
          branch: branch,
          orders: unremittedOrders.length,
          amount: totalNet,
          status: "dry_run",
        });
        continue;
      }

      // Create the remittance
      const remittanceData = {
        branch_id: branch.id,
        submitted_by: 1, // System user - you may want to change this
        period_type: "month",
        date_from: dateFrom,
        date_to: dateTo,
        gross_sales: totalGross,
        net_sales: totalNet,
        refunded_amount: totalRefunds,
        voided_amount: totalVoids,
        disposed: 0,
        remitted_amount: totalNet,
        notes: `Auto-generated remittance for ${unremittedOrders.length} unremitted orders`,
      };

      console.log(`   📝 Creating remittance...`);
      const remittance = await BranchRemittance.create(remittanceData);
      console.log(`   ✅ Remittance created with ID: ${remittance.id}`);

      // Link orders to the remittance
      console.log(
        `   🔗 Linking ${unremittedOrders.length} orders to remittance...`
      );
      await POSOrder.markOrdersRemitted({
        branchId: branch.id,
        remittanceId: remittance.id,
        dateFrom: dateFrom,
        dateTo: dateTo,
      });

      console.log(
        `   ✅ Successfully remitted ₱${totalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      );

      results.push({
        branch: branch,
        orders: unremittedOrders.length,
        amount: totalNet,
        remittanceId: remittance.id,
        status: "completed",
      });
    }

    // Summary
    console.log("\n📊 SUMMARY:");
    console.log("═".repeat(50));

    const totalAmount = results.reduce((sum, r) => sum + r.amount, 0);
    const totalOrders = results.reduce((sum, r) => sum + r.orders, 0);

    console.log(
      `💰 Total Amount: ₱${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
    );
    console.log(`📦 Total Orders: ${totalOrders}`);
    console.log(`🏢 Branches Processed: ${results.length}`);

    if (dryRun) {
      console.log("\n🔍 This was a DRY RUN - no changes were made");
      console.log("   Run with --live flag to actually create remittances");
    } else {
      console.log("\n✅ Auto-remittance completed successfully!");
      console.log(
        "   All unremitted sales have been linked to new remittances"
      );
    }

    return results;
  } catch (error) {
    console.error("❌ Error in auto-remittance:", error);
    throw error;
  }
}

// Helper function to approve all pending remittances
async function approveAllPendingRemittances(dryRun = true) {
  try {
    console.log("\n🔍 Checking for pending remittances...");

    const pendingRemittances = await db("branch_remittances")
      .where("status", "pending")
      .select("id", "branch_id", "remitted_amount", "created_at");

    if (pendingRemittances.length === 0) {
      console.log("   ✅ No pending remittances found");
      return [];
    }

    console.log(`   📋 Found ${pendingRemittances.length} pending remittances`);

    const results = [];

    for (const remittance of pendingRemittances) {
      console.log(`\n   📝 Remittance ID: ${remittance.id}`);
      console.log(
        `      Amount: ₱${parseFloat(remittance.remitted_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      );
      console.log(`      Created: ${remittance.created_at}`);

      if (dryRun) {
        console.log(`      🔍 DRY RUN: Would approve this remittance`);
        results.push({ ...remittance, status: "dry_run" });
      } else {
        console.log(`      ✅ Approving remittance...`);
        await BranchRemittance.approve(remittance.id, 1); // System user
        console.log(`      ✅ Approved successfully`);
        results.push({ ...remittance, status: "approved" });
      }
    }

    if (dryRun) {
      console.log("\n🔍 This was a DRY RUN - no remittances were approved");
      console.log("   Run with --approve flag to actually approve remittances");
    } else {
      console.log("\n✅ All pending remittances have been approved!");
    }

    return results;
  } catch (error) {
    console.error("❌ Error approving remittances:", error);
    throw error;
  }
}

// Run the script if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const branchId = args.includes("--branch")
    ? parseInt(args[args.indexOf("--branch") + 1])
    : null;
  const dateFrom = args.includes("--from")
    ? args[args.indexOf("--from") + 1]
    : null;
  const dateTo = args.includes("--to") ? args[args.indexOf("--to") + 1] : null;
  const dryRun = !args.includes("--live");
  const approve = args.includes("--approve");

  console.log("🚀 Starting auto-remittance process...\n");

  Promise.resolve()
    .then(async () => {
      if (approve) {
        await approveAllPendingRemittances(dryRun);
      }
      return autoRemitMissingSales(branchId, dateFrom, dateTo, dryRun);
    })
    .then(() => {
      console.log("\n🎉 Auto-remittance process completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Auto-remittance process failed:", error.message);
      process.exit(1);
    });
}

module.exports = {
  autoRemitMissingSales,
  approveAllPendingRemittances,
};
