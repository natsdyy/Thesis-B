// backend/models/BudgetRelease.js
const { db } = require("../config/database");
const { getCurrentPhilippineTime } = require("../utils/timezoneUtils");
const FinanceBalance = require("./FinanceBalance");
const CashMovement = require("./CashMovement");

class BudgetRelease {
  // Get all budget releases with optional filters
  static async getAll(filters = {}) {
    try {
      let query = db("budget_releases as br")
        .leftJoin("supply_requests as sr", "br.supply_request_id", "sr.id")
        .leftJoin("payroll_periods as pp", function () {
          this.on("br.id", "=", "pp.budget_release_id");
        })
        .select(
          "br.*",
          // Supply request fields (null for payroll releases)
          "sr.request_id",
          "sr.request_description",
          "sr.department",
          "sr.requested_by",
          "sr.priority",
          "sr.request_date",
          // Payroll period fields (null for supply releases)
          "pp.id as payroll_period_id",
          "pp.period_name as payroll_period_name",
          "pp.period_type as payroll_period_type",
          "pp.date_from as payroll_date_from",
          "pp.date_to as payroll_date_to",
          "pp.generated_by as payroll_generated_by"
        );

      // Apply filters
      if (filters.receiptStatus === "confirmed") {
        query = query.where("br.receipt_confirmed", true);
      } else if (filters.receiptStatus === "pending") {
        query = query.where("br.receipt_confirmed", false);
      }

      if (filters.dateFrom && filters.dateTo) {
        query = query.whereBetween("br.released_at", [
          filters.dateFrom,
          filters.dateTo,
        ]);
      }

      if (filters.search) {
        query = query.where(function () {
          this.where("sr.request_description", "ilike", `%${filters.search}%`)
            .orWhere("sr.request_id", "like", `%${filters.search}%`)
            .orWhere("br.release_id", "like", `%${filters.search}%`)
            .orWhere("sr.requested_by", "ilike", `%${filters.search}%`)
            .orWhere("pp.period_name", "ilike", `%${filters.search}%`);
        });
      }

      const releases = await query.orderBy("br.released_at", "desc");
      return releases;
    } catch (error) {
      console.error("Error fetching budget releases:", error);
      throw new Error("Failed to retrieve budget releases from database");
    }
  }

  // Get budget release by ID
  static async getById(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid budget release ID provided");
      }

      const release = await db("budget_releases as br")
        .leftJoin("supply_requests as sr", "br.supply_request_id", "sr.id")
        .leftJoin("payroll_periods as pp", function () {
          this.on("br.id", "=", "pp.budget_release_id");
        })
        .select(
          "br.*",
          // Supply request fields (null for payroll releases)
          "sr.request_id",
          "sr.request_description",
          "sr.department",
          "sr.requested_by",
          "sr.priority",
          "sr.request_date",
          // Payroll period fields (null for supply releases)
          "pp.id as payroll_period_id",
          "pp.period_name as payroll_period_name",
          "pp.period_type as payroll_period_type",
          "pp.date_from as payroll_date_from",
          "pp.date_to as payroll_date_to",
          "pp.generated_by as payroll_generated_by"
        )
        .where("br.id", id)
        .first();

      return release;
    } catch (error) {
      console.error("Error fetching budget release:", error);
      throw new Error("Failed to retrieve budget release from database");
    }
  }

  // Get budget release by release_id
  static async getByReleaseId(releaseId) {
    try {
      if (!releaseId) {
        throw new Error("Invalid release ID provided");
      }

      const release = await db("budget_releases as br")
        .join("supply_requests as sr", "br.supply_request_id", "sr.id")
        .select(
          "br.*",
          "sr.request_id",
          "sr.request_description",
          "sr.department",
          "sr.requested_by",
          "sr.priority",
          "sr.request_date"
        )
        .where("br.release_id", releaseId)
        .first();

      return release;
    } catch (error) {
      console.error("Error fetching budget release by release_id:", error);
      throw new Error("Failed to retrieve budget release from database");
    }
  }

  // Create new budget release
  static async create(releaseData) {
    const trx = await db.transaction();

    try {
      // Generate unique release_id
      const year = getCurrentPhilippineTime().getFullYear();
      const count = await trx("budget_releases").count("* as total").first();
      const releaseId = `BR${year}${String(parseInt(count.total) + 1).padStart(3, "0")}`;

      // Get supply request details for cash movement notes
      const supplyRequest = await trx("supply_requests")
        .where("id", releaseData.supply_request_id)
        .first();

      // Create budget release
      const [budgetRelease] = await trx("budget_releases")
        .insert({
          release_id: releaseId,
          supply_request_id: releaseData.supply_request_id,
          released_amount: releaseData.released_amount,
          released_by: releaseData.released_by,
          released_at: getCurrentPhilippineTime(),
          release_remarks: releaseData.release_remarks || null,
        })
        .returning("*");

      // Update supply request status
      await trx("supply_requests")
        .where("id", releaseData.supply_request_id)
        .update({
          request_status: "Budget Released",
          released_by: releaseData.released_by,
          released_at: getCurrentPhilippineTime(),
          release_id: releaseId,
          updated_at: getCurrentPhilippineTime(),
        });

      // Deduct from finance balance (capital)
      const currentBalance = await trx("finance_balances")
        .whereNull("deleted_at")
        .orderBy("balance_date", "desc")
        .first();

      const releasedAmount = Number(releaseData.released_amount);
      const newCapital = Number(currentBalance?.capital || 0) - releasedAmount;

      // Create new finance balance snapshot with deducted amount
      await trx("finance_balances").insert({
        capital: newCapital,
        profit: Number(currentBalance?.profit || 0),
        sales_remittances: Number(currentBalance?.sales_remittances || 0),
        total_balance:
          newCapital +
          Number(currentBalance?.profit || 0) +
          Number(currentBalance?.sales_remittances || 0),
        balance_date: getCurrentPhilippineTime(),
        created_at: getCurrentPhilippineTime(),
        updated_at: getCurrentPhilippineTime(),
      });

      // Create cash movement record for outflow
      await trx("cash_movements").insert({
        branch_id: supplyRequest?.branch_id || null,
        movement_type: "out",
        amount: releasedAmount,
        source: "budget_release",
        reference_id: budgetRelease.id,
        reference_type: "budget_release",
        notes: `Budget released for ${supplyRequest?.branch_id ? "Branch" : "SCM"}`,
        occurred_at: getCurrentPhilippineTime(),
        created_at: getCurrentPhilippineTime(),
        updated_at: getCurrentPhilippineTime(),
      });

      await trx.commit();
      return budgetRelease;
    } catch (error) {
      await trx.rollback();
      console.error("Error creating budget release:", error);
      throw new Error("Failed to create budget release");
    }
  }

  // Confirm receipt
  static async confirmReceipt(id, confirmedBy) {
    const trx = await db.transaction();

    try {
      // Update budget release
      const [updatedRelease] = await trx("budget_releases")
        .where("id", id)
        .update({
          receipt_confirmed: true,
          receipt_confirmed_by: confirmedBy,
          receipt_confirmed_at: getCurrentPhilippineTime(),
          updated_at: getCurrentPhilippineTime(),
        })
        .returning("*");

      if (!updatedRelease) {
        throw new Error("Budget release not found");
      }

      // Update supply request status to Completed
      await trx("supply_requests")
        .where("id", updatedRelease.supply_request_id)
        .update({
          request_status: "Completed",
          receipt_confirmed: true,
          receipt_confirmed_by: confirmedBy,
          receipt_confirmed_at: getCurrentPhilippineTime(),
          updated_at: getCurrentPhilippineTime(),
        });

      await trx.commit();
      return updatedRelease;
    } catch (error) {
      await trx.rollback();
      console.error("Error confirming receipt:", error);
      throw new Error("Failed to confirm receipt");
    }
  }

  // Get pending receipts (for SCM)
  static async getPendingReceipts(department = null) {
    try {
      let query = db("budget_releases as br")
        .join("supply_requests as sr", "br.supply_request_id", "sr.id")
        .select(
          "br.*",
          "sr.request_id",
          "sr.request_description",
          "sr.department",
          "sr.requested_by",
          "sr.priority",
          "sr.request_date"
        )
        .where("br.receipt_confirmed", false);

      if (department) {
        query = query.where("sr.department", department);
      }

      const pendingReceipts = await query.orderBy("br.released_at", "desc");
      return pendingReceipts;
    } catch (error) {
      console.error("Error fetching pending receipts:", error);
      throw new Error("Failed to retrieve pending receipts");
    }
  }

  // Get budget release statistics
  static async getStats(filters = {}) {
    try {
      let query = db("budget_releases as br").join(
        "supply_requests as sr",
        "br.supply_request_id",
        "sr.id"
      );

      // Apply filters
      if (filters.department) {
        query = query.where("sr.department", filters.department);
      }

      if (filters.dateFrom && filters.dateTo) {
        query = query.whereBetween("br.released_at", [
          filters.dateFrom,
          filters.dateTo,
        ]);
      }

      const stats = await query
        .select(
          db.raw("COUNT(*) as total_releases"),
          db.raw(
            "COUNT(CASE WHEN br.receipt_confirmed = true THEN 1 END) as confirmed_receipts"
          ),
          db.raw(
            "COUNT(CASE WHEN br.receipt_confirmed = false THEN 1 END) as pending_receipts"
          ),
          db.raw(
            "COALESCE(SUM(br.released_amount), 0) as total_released_amount"
          ),
          db.raw(
            "COALESCE(SUM(CASE WHEN br.receipt_confirmed = true THEN br.released_amount END), 0) as total_confirmed_amount"
          )
        )
        .first();

      return stats;
    } catch (error) {
      console.error("Error fetching budget release statistics:", error);
      throw new Error("Failed to retrieve budget release statistics");
    }
  }

  /**
   * Create budget release for payroll
   * @param {Object} payrollData
   * @param {number} payrollData.payroll_period_id
   * @param {number} payrollData.amount - total payroll amount (net + employer contributions)
   * @param {string} payrollData.released_by
   * @param {string} payrollData.remarks
   */
  static async createForPayroll(payrollData) {
    const trx = await db.transaction();

    try {
      // Check if payroll period exists
      const payrollPeriod = await trx("payroll_periods")
        .where("id", payrollData.payroll_period_id)
        .first();

      if (!payrollPeriod) {
        throw new Error("Payroll period not found");
      }

      // Check current finance balance
      const currentBalance = await trx("finance_balances")
        .whereNull("deleted_at")
        .orderBy("balance_date", "desc")
        .first();

      const requiredAmount = Number(payrollData.amount);
      const availableBalance = Number(currentBalance?.capital || 0);

      if (availableBalance < requiredAmount) {
        throw new Error(
          `Insufficient balance. Required: ₱${requiredAmount.toLocaleString()}, Available: ₱${availableBalance.toLocaleString()}`
        );
      }

      // Generate unique release_id
      const year = getCurrentPhilippineTime().getFullYear();
      const count = await trx("budget_releases").count("* as total").first();
      const releaseId = `BR${year}${String(parseInt(count.total) + 1).padStart(3, "0")}`;

      // Create budget release record (with payroll_period_id instead of supply_request_id)
      const [budgetRelease] = await trx("budget_releases")
        .insert({
          release_id: releaseId,
          supply_request_id: null, // Payroll doesn't have supply request
          payroll_period_id: payrollData.payroll_period_id, // Link to payroll period
          released_amount: requiredAmount,
          released_by: payrollData.released_by,
          released_at: getCurrentPhilippineTime(),
          release_remarks:
            payrollData.remarks ||
            `Payroll budget release - ${payrollPeriod.period_name}`,
          receipt_confirmed: true, // Auto-confirmed for payroll
          receipt_confirmed_by: payrollData.released_by,
          receipt_confirmed_at: getCurrentPhilippineTime(),
        })
        .returning("*");

      // Update payroll period with budget release info
      await trx("payroll_periods")
        .where("id", payrollData.payroll_period_id)
        .update({
          budget_release_id: budgetRelease.id,
          budget_released_at: getCurrentPhilippineTime(),
          status: "budget_released",
          updated_at: getCurrentPhilippineTime(),
        });

      // Deduct from finance balance (capital)
      const newCapital = availableBalance - requiredAmount;

      // Create new finance balance snapshot
      await trx("finance_balances").insert({
        capital: newCapital,
        profit: Number(currentBalance?.profit || 0),
        sales_remittances: Number(currentBalance?.sales_remittances || 0),
        total_balance:
          newCapital +
          Number(currentBalance?.profit || 0) +
          Number(currentBalance?.sales_remittances || 0),
        balance_date: getCurrentPhilippineTime(),
        created_at: getCurrentPhilippineTime(),
        updated_at: getCurrentPhilippineTime(),
      });

      // Create cash movement record for outflow
      await trx("cash_movements").insert({
        branch_id: null, // HQ-level expense
        movement_type: "out",
        amount: requiredAmount,
        source: "payroll_budget_release",
        reference_id: payrollPeriod.id,
        reference_type: "payroll_period",
        notes: `Payroll budget released - ${payrollPeriod.period_name}`,
        occurred_at: getCurrentPhilippineTime(),
        created_at: getCurrentPhilippineTime(),
        updated_at: getCurrentPhilippineTime(),
      });

      await trx.commit();
      return budgetRelease;
    } catch (error) {
      await trx.rollback();
      console.error("Error creating payroll budget release:", error);
      throw error;
    }
  }

  /**
   * Check if sufficient balance exists for payroll
   * @param {number} amount
   * @returns {Object} { sufficient: boolean, available: number, required: number }
   */
  static async checkBalanceForPayroll(amount) {
    try {
      const currentBalance = await db("finance_balances")
        .whereNull("deleted_at")
        .orderBy("balance_date", "desc")
        .first();

      const available = Number(currentBalance?.capital || 0);
      const required = Number(amount);

      return {
        sufficient: available >= required,
        available,
        required,
        shortage: available < required ? required - available : 0,
      };
    } catch (error) {
      console.error("Error checking balance for payroll:", error);
      throw new Error("Failed to check balance");
    }
  }
}

module.exports = BudgetRelease;
