const { db } = require("../config/database");
const {
  formatForDatabase,
  getCurrentPhilippineTime,
} = require("../utils/timezoneUtils");

/**
 * FinanceBalance model
 * Tracks capital, profit, and sales remittances for branches
 */
class FinanceBalance {
  /**
   * Create or update a finance balance record
   * @param {Object} data
   * @param {number} data.branch_id
   * @param {number} data.capital
   * @param {number} data.profit
   * @param {number} data.sales_remittances
   * @param {string|Date} [data.balance_date] if omitted, uses PH now
   */
  static async createOrUpdate(data) {
    const payload = {
      capital: Number(data.capital || 0),
      profit: Number(data.profit || 0),
      sales_remittances: Number(data.sales_remittances || 0),
      total_balance:
        Number(data.capital || 0) +
        Number(data.profit || 0) +
        Number(data.sales_remittances || 0),
      balance_date: formatForDatabase(
        data.balance_date
          ? new Date(data.balance_date)
          : getCurrentPhilippineTime()
      ),
    };

    // Check if record exists for this date
    const existing = await db("finance_balances")
      .where({
        balance_date: payload.balance_date,
      })
      .whereNull("deleted_at")
      .first();

    if (existing) {
      // Update existing record
      const [row] = await db("finance_balances")
        .where({ id: existing.id })
        .update({
          ...payload,
          updated_at: formatForDatabase(getCurrentPhilippineTime()),
        })
        .returning("*");
      return row;
    } else {
      // Create new record
      const [row] = await db("finance_balances").insert(payload).returning("*");
      return row;
    }
  }

  /**
   * Get latest balance for the company
   */
  static async getLatestBalance() {
    const row = await db("finance_balances")
      .whereNull("deleted_at")
      .orderBy("balance_date", "desc")
      .first();

    return row;
  }

  /**
   * Get latest company balance
   */
  static async getBalancesForBranches() {
    const row = await db("finance_balances")
      .whereNull("deleted_at")
      .orderBy("balance_date", "desc")
      .first();

    return row ? [row] : [];
  }

  /**
   * Calculate totals for the company
   */
  static async getTotalBalances() {
    const row = await db("finance_balances")
      .whereNull("deleted_at")
      .orderBy("balance_date", "desc")
      .first();

    return {
      capital: Number(row?.capital || 0),
      profit: Number(row?.profit || 0),
      sales_remittances: Number(row?.sales_remittances || 0),
      total_balance: Number(row?.total_balance || 0),
    };
  }

  /**
   * Update balance from approved remittance
   * @param {Object} remittance approved remittance record
   */
  static async updateFromRemittance(remittance) {
    if (!remittance) return null;

    // Get current balance for the company
    const current = await FinanceBalance.getLatestBalance();

    const newSalesRemittances =
      Number(current?.sales_remittances || 0) +
      Number(remittance.remitted_amount || 0);
    const newProfit =
      Number(current?.profit || 0) + Number(remittance.net_sales || 0);

    return await FinanceBalance.createOrUpdate({
      capital: Number(current?.capital || 0),
      profit: newProfit,
      sales_remittances: newSalesRemittances,
    });
  }

  /**
   * Increment capital for the company and persist a new balance snapshot
   * @param {Object} params
   * @param {number} params.amount - positive number to add to capital
   * @param {string|Date} [params.balance_date]
   */
  static async addCapital({ amount, balance_date = null }) {
    if (!Number.isFinite(Number(amount))) {
      throw new Error("numeric amount is required");
    }

    const current = await FinanceBalance.getLatestBalance();

    const newCapital = Number(current?.capital || 0) + Number(amount || 0);
    const payload = {
      capital: newCapital,
      profit: Number(current?.profit || 0),
      sales_remittances: Number(current?.sales_remittances || 0),
      balance_date: balance_date || getCurrentPhilippineTime(),
    };

    return await FinanceBalance.createOrUpdate(payload);
  }

  /**
   * Set capital to an absolute amount for the company and persist a new snapshot
   * @param {Object} params
   * @param {number} params.amount - absolute capital value
   * @param {string|Date} [params.balance_date]
   */
  static async setCapital({ amount, balance_date = null }) {
    if (!Number.isFinite(Number(amount))) {
      throw new Error("numeric amount is required");
    }

    const current = await FinanceBalance.getLatestBalance();

    const payload = {
      capital: Number(amount || 0),
      profit: Number(current?.profit || 0),
      sales_remittances: Number(current?.sales_remittances || 0),
      balance_date: balance_date || getCurrentPhilippineTime(),
    };

    return await FinanceBalance.createOrUpdate(payload);
  }
}

module.exports = FinanceBalance;
