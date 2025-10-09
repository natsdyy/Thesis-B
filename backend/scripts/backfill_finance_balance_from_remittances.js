// backend/scripts/backfill_finance_balance_from_remittances.js
require("dotenv").config();

const { db } = require("../config/database");
const FinanceBalance = require("../models/FinanceBalance");
const {
  formatForDatabase,
  getCurrentPhilippineTime,
} = require("../utils/timezoneUtils");

/**
 * Backfill company-level finance balances from historical branch remittances.
 *
 * Logic:
 * - Start from the latest existing finance balance snapshot (if any)
 * - Fetch historical remittances (approved by default) ordered by date_to asc
 * - For each remittance, increment profit by net_sales and
 *   sales_remittances by remitted_amount, then persist a snapshot
 *   dated on the remittance's date_to (or approved_at as fallback)
 *
 * Options via env/CLI:
 *   DRY_RUN=true           -> compute and log without writing
 *   INCLUDE_PENDING=true   -> include non-approved remittances
 */

async function fetchRemittances({ includePending = false } = {}) {
  let query = db("branch_remittances").whereNull("deleted_at");

  if (!includePending) {
    query = query.where("status", "approved");
  }

  return await query
    .orderBy([
      { column: "date_to", order: "asc" },
      { column: "id", order: "asc" },
    ])
    .select(
      "id",
      "branch_id",
      "status",
      "date_from",
      "date_to",
      "gross_sales",
      "net_sales",
      "remitted_amount",
      "approved_at"
    );
}

function getSnapshotDate(remittance) {
  // Prefer the closing date of the remittance period; fallback to approved_at; else now
  const raw =
    remittance?.date_to ||
    remittance?.approved_at ||
    getCurrentPhilippineTime();
  return formatForDatabase(new Date(raw));
}

async function backfill({ dryRun = false, includePending = false } = {}) {
  const startBalance = await FinanceBalance.getLatestBalance();

  let runningCapital = Number(startBalance?.capital || 0);
  let runningProfit = Number(startBalance?.profit || 0);
  let runningSalesRemittances = Number(startBalance?.sales_remittances || 0);

  const remittances = await fetchRemittances({ includePending });

  let appliedCount = 0;
  for (const r of remittances) {
    const nextProfit = runningProfit + Number(r.net_sales || 0);
    const nextSalesRemit =
      runningSalesRemittances + Number(r.remitted_amount || 0);

    const payload = {
      capital: runningCapital,
      profit: nextProfit,
      sales_remittances: nextSalesRemit,
      balance_date: getSnapshotDate(r),
    };

    if (dryRun) {
      // eslint-disable-next-line no-console
      console.log(
        `DRY_RUN snapshot for remittance #${r.id} on ${payload.balance_date}:`,
        {
          add_profit: Number(r.net_sales || 0),
          add_sales_remittances: Number(r.remitted_amount || 0),
          next_profit: payload.profit,
          next_sales_remittances: payload.sales_remittances,
        }
      );
    } else {
      await FinanceBalance.createOrUpdate(payload);
    }

    runningProfit = nextProfit;
    runningSalesRemittances = nextSalesRemit;
    appliedCount += 1;
  }

  return {
    appliedCount,
    final: { runningCapital, runningProfit, runningSalesRemittances },
  };
}

async function main() {
  const dryRun =
    String(process.env.DRY_RUN || "false").toLowerCase() === "true";
  const includePending =
    String(process.env.INCLUDE_PENDING || "false").toLowerCase() === "true";

  try {
    const result = await backfill({ dryRun, includePending });
    // eslint-disable-next-line no-console
    console.log(
      `${dryRun ? "[DRY_RUN] " : ""}Backfill complete. Applied: ${result.appliedCount}`
    );
    // eslint-disable-next-line no-console
    console.log("Final running totals:", result.final);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Backfill failed:", err.message || err);
    process.exitCode = 1;
  } finally {
    try {
      await db.destroy();
    } catch (e) {
      // ignore
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { backfill };
