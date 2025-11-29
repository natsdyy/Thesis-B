// backend/scripts/set_global_capital.js
require("dotenv").config();

const { db } = require("../config/database");
const FinanceBalance = require("../models/FinanceBalance");

async function main() {
  try {
    const amount = 100_000_000; // 100 million PHP
    const result = await FinanceBalance.setCapital({ amount });
    console.log("✅ Company capital set successfully:", {
      capital: result.capital,
      balance_date: result.balance_date,
    });
  } catch (err) {
    console.error("❌ Failed to set company capital:", err.message || err);
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
