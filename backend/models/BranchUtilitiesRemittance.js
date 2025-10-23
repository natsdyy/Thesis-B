/**
 * BranchUtilitiesRemittance Model
 * Handles Branch-submitted utility expense remittances with receipts
 */

const { db } = require("../config/database");
const { formatForDatabase } = require("../utils/timezoneUtils");

class BranchUtilitiesRemittance {
  /**
   * Create a new utilities remittance
   * @param {Object} data - Remittance data
   * @returns {Promise<Object>} Created remittance
   */
  static async create(data) {
    const remittanceData = {
      branch_id: data.branch_id,
      expense_type: data.expense_type,
      expense_description: data.expense_description || null,
      amount: data.amount,
      expense_month: data.expense_month,
      receipt_url: data.receipt_url,
      status: "pending",
      notes: data.notes || null,
      submitted_by: data.submitted_by,
      created_at: formatForDatabase(new Date()),
      updated_at: formatForDatabase(new Date()),
    };

    const [insertedRow] = await db("branch_utilities_remittances")
      .insert(remittanceData)
      .returning("id");
    return this.getById(insertedRow.id);
  }

  /**
   * Get remittance by ID
   * @param {number} id - Remittance ID
   * @returns {Promise<Object|null>} Remittance data
   */
  static async getById(id) {
    const remittance = await db("branch_utilities_remittances as bur")
      .select(
        "bur.*",
        "b.name as branch_name",
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as submitted_by_name"),
        db.raw(
          "CONCAT(approver.first_name, ' ', approver.last_name) as approved_by_name"
        ),
        db.raw(
          "CONCAT(rejector.first_name, ' ', rejector.last_name) as rejected_by_name"
        )
      )
      .leftJoin("branches as b", "bur.branch_id", "b.id")
      .leftJoin("employees as e", "bur.submitted_by", "e.id")
      .leftJoin("employees as approver", "bur.approved_by", "approver.id")
      .leftJoin("employees as rejector", "bur.rejected_by", "rejector.id")
      .where("bur.id", id)
      .whereNull("bur.deleted_at")
      .first();

    return remittance;
  }

  /**
   * List remittances with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} List result with pagination
   */
  static async list(filters = {}) {
    const {
      branch_id,
      expense_type,
      expense_month,
      status,
      limit = 20,
      offset = 0,
    } = filters;

    let query = db("branch_utilities_remittances as bur")
      .select(
        "bur.*",
        "b.name as branch_name",
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as submitted_by_name"),
        db.raw(
          "CONCAT(approver.first_name, ' ', approver.last_name) as approved_by_name"
        ),
        db.raw(
          "CONCAT(rejector.first_name, ' ', rejector.last_name) as rejected_by_name"
        )
      )
      .leftJoin("branches as b", "bur.branch_id", "b.id")
      .leftJoin("employees as e", "bur.submitted_by", "e.id")
      .leftJoin("employees as approver", "bur.approved_by", "approver.id")
      .leftJoin("employees as rejector", "bur.rejected_by", "rejector.id")
      .whereNull("bur.deleted_at");

    // Apply filters
    if (branch_id) {
      query = query.where("bur.branch_id", branch_id);
    }
    if (expense_type) {
      query = query.where("bur.expense_type", expense_type);
    }
    if (expense_month) {
      query = query.where("bur.expense_month", expense_month);
    }
    if (status) {
      query = query.where("bur.status", status);
    }

    // Get total count (separate query)
    const countQuery = db("branch_utilities_remittances as bur").whereNull(
      "bur.deleted_at"
    );

    // Apply same filters to count query
    if (branch_id) {
      countQuery.where("bur.branch_id", branch_id);
    }
    if (expense_type) {
      countQuery.where("bur.expense_type", expense_type);
    }
    if (expense_month) {
      countQuery.where("bur.expense_month", expense_month);
    }
    if (status) {
      countQuery.where("bur.status", status);
    }

    const { total } = await countQuery.count("* as total").first();

    // Get paginated results
    const remittances = await query
      .orderBy("bur.created_at", "desc")
      .limit(limit)
      .offset(offset);

    return {
      remittances,
      total: parseInt(total),
      limit,
      offset,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Update remittance (pending only)
   * @param {number} id - Remittance ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated remittance
   */
  static async update(id, data) {
    // Only allow updates to pending remittances
    const existing = await db("branch_utilities_remittances")
      .where("id", id)
      .where("status", "pending")
      .whereNull("deleted_at")
      .first();

    if (!existing) {
      throw new Error("Cannot update non-pending remittance");
    }

    const updateData = {
      ...data,
      updated_at: formatForDatabase(new Date()),
    };

    await db("branch_utilities_remittances").where("id", id).update(updateData);

    return this.getById(id);
  }

  /**
   * Soft delete remittance (pending only)
   * @param {number} id - Remittance ID
   * @returns {Promise<boolean>} Success status
   */
  static async softDelete(id) {
    // Only allow deletion of pending remittances
    const result = await db("branch_utilities_remittances")
      .where("id", id)
      .where("status", "pending")
      .whereNull("deleted_at")
      .update({
        deleted_at: formatForDatabase(new Date()),
        updated_at: formatForDatabase(new Date()),
      });

    return result > 0;
  }

  /**
   * Approve remittance
   * @param {number} id - Remittance ID
   * @param {number} approvedBy - Approver employee ID
   * @returns {Promise<Object>} Approved remittance
   */
  static async approve(id, approvedBy) {
    const now = formatForDatabase(new Date());

    await db("branch_utilities_remittances")
      .where("id", id)
      .where("status", "pending")
      .whereNull("deleted_at")
      .update({
        status: "approved",
        approved_by: approvedBy,
        approved_at: now,
        updated_at: now,
      });

    return this.getById(id);
  }

  /**
   * Reject remittance
   * @param {number} id - Remittance ID
   * @param {number} rejectedBy - Rejector employee ID
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} Rejected remittance
   */
  static async reject(id, rejectedBy, reason) {
    const now = formatForDatabase(new Date());

    await db("branch_utilities_remittances")
      .where("id", id)
      .where("status", "pending")
      .whereNull("deleted_at")
      .update({
        status: "rejected",
        rejected_by: rejectedBy,
        rejected_at: now,
        rejection_reason: reason,
        updated_at: now,
      });

    return this.getById(id);
  }

  /**
   * Get remittances for specific branch/month
   * @param {number} branchId - Branch ID
   * @param {string} month - Month in YYYY-MM format
   * @returns {Promise<Array>} Remittances for the period
   */
  static async getByMonth(branchId, month) {
    return db("branch_utilities_remittances")
      .select("*")
      .where("branch_id", branchId)
      .where("expense_month", month)
      .whereNull("deleted_at")
      .orderBy("created_at", "desc");
  }

  /**
   * Get total amounts by branch for date range
   * @param {number} branchId - Branch ID
   * @param {string} dateFrom - Start date
   * @param {string} dateTo - End date
   * @returns {Promise<Object>} Aggregated totals
   */
  static async getTotalByBranch(branchId, dateFrom, dateTo) {
    const results = await db("branch_utilities_remittances")
      .select(
        "expense_type",
        db.raw("SUM(amount) as total_amount"),
        db.raw("COUNT(*) as remittance_count")
      )
      .where("branch_id", branchId)
      .whereBetween("expense_month", [dateFrom, dateTo])
      .where("status", "approved")
      .whereNull("deleted_at")
      .groupBy("expense_type");

    const totalAmount = results.reduce(
      (sum, row) => sum + parseFloat(row.total_amount || 0),
      0
    );
    const totalCount = results.reduce(
      (sum, row) => sum + parseInt(row.remittance_count || 0),
      0
    );

    return {
      results,
      total_amount: totalAmount,
      total_count: totalCount,
    };
  }
}

module.exports = BranchUtilitiesRemittance;
