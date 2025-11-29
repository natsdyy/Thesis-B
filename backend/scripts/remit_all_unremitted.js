/*
  Batch remit all completed POS orders that are not yet remitted.

  What it does per branch:
  - Finds completed orders with remittance_id IS NULL
  - Determines date_from/date_to as min/max created_at
  - Calculates totals (sum of total_amount)
  - Creates a branch remittance (period_type: 'month') for the range
  - Approves the remittance (approved_by left null)
  - Links orders via POSOrder.markOrdersRemitted

  Usage:
    node backend/scripts/remit_all_unremitted.js
*/

const { db, testConnection } = require("../config/database");
const BranchRemittance = require("../models/BranchRemittance");
const POSOrder = require("../models/POSOrder");

async function fetchUnremittedRangesPerBranch() {
  // For each branch with unremitted completed orders, compute min/max created_at and totals
  const rows = await db("pos_sales_orders")
    .select(
      "branch_id",
      db.raw("MIN(created_at) AS date_from"),
      db.raw("MAX(created_at) AS date_to"),
      db.raw("COUNT(*) AS order_count"),
      db.raw("COALESCE(SUM(total_amount), 0) AS total_amount")
    )
    .where({ status: "completed" })
    .whereNull("remittance_id")
    .groupBy("branch_id")
    .orderBy("branch_id", "asc");
  return rows;
}

async function getAnyEmployeeId() {
  const row = await db("employees").select("id").orderBy("id", "asc").first();
  return row?.id || null;
}

async function createApprovedRemittanceForBranch({
  branch_id,
  date_from,
  date_to,
  total_amount,
}) {
  // Use totals as both gross, net, and remitted; refunds/voided/disposed = 0 for this batch
  const submitterId = (await getAnyEmployeeId()) || 1; // fallback to 1 if table empty
  const payload = {
    branch_id,
    submitted_by: submitterId, // required by schema
    period_type: "month",
    date_from,
    date_to,
    gross_sales: total_amount,
    net_sales: total_amount,
    refunded_amount: 0,
    voided_amount: 0,
    disposed: 0,
    remitted_amount: total_amount,
    notes: "Auto-remitted by script for all unremitted completed orders",
  };

  const rem = await BranchRemittance.create(payload);
  // Approve with no user (approved_by NULL if allowed)
  try {
    const approverId = submitterId; // reuse submitter for approval
    await BranchRemittance.approve(rem.id, approverId);
  } catch (e) {
    console.warn(
      `Warning: could not auto-approve remittance ${rem.id}: ${e?.message || e}`
    );
  }
  return rem;
}

async function linkOrdersToRemittance({
  branch_id,
  remittance_id,
  date_from,
  date_to,
}) {
  await POSOrder.markOrdersRemitted({
    branchId: branch_id,
    remittanceId: remittance_id,
    dateFrom: date_from,
    dateTo: date_to,
  });
}

async function main() {
  try {
    await testConnection();

    const ranges = await fetchUnremittedRangesPerBranch();
    if (!ranges || ranges.length === 0) {
      console.log("No unremitted completed orders found.");
      return;
    }

    console.log(`Found ${ranges.length} branch(es) with unremitted orders`);

    for (const r of ranges) {
      const branchId = Number(r.branch_id);
      const dateFrom = r.date_from;
      const dateTo = r.date_to;
      const totalAmount = Number(r.total_amount) || 0;

      console.log(
        `\nBranch ${branchId}: orders=${r.order_count}, range=${dateFrom}..${dateTo}, totalAmount=${totalAmount}`
      );

      if (!dateFrom || !dateTo || totalAmount <= 0) {
        console.log("  Skipping (no totals or invalid dates)");
        continue;
      }

      const rem = await createApprovedRemittanceForBranch({
        branch_id: branchId,
        date_from: dateFrom,
        date_to: dateTo,
        total_amount: totalAmount,
      });

      console.log(`  Created remittance id=${rem.id}, status=${rem.status}`);

      try {
        await linkOrdersToRemittance({
          branch_id: branchId,
          remittance_id: rem.id,
          date_from: rem.date_from || dateFrom,
          date_to: rem.date_to || dateTo,
        });
        console.log("  Linked matching orders to remittance");
      } catch (e) {
        console.warn("  Linking orders failed:", e?.message || e);
      }
    }
  } catch (err) {
    console.error("Error remitting unremitted orders:", err.message || err);
    process.exitCode = 1;
  } finally {
    try {
      await db.destroy();
    } catch (_) {}
  }
}

main();
