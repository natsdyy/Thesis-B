const { db } = require("../config/database");
const {
  formatForDatabase,
  getCurrentPhilippineTime,
} = require("../utils/timezoneUtils");

class PayrollPeriod {
  /**
   * Create a new payroll period
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  static async create(data) {
    const [period] = await db("payroll_periods")
      .insert({
        period_name: data.period_name,
        period_type: data.period_type,
        date_from: data.date_from,
        date_to: data.date_to,
        generated_by: data.generated_by,
        status: data.status || "draft",
        total_gross_amount: data.total_gross_amount || 0,
        total_deductions: data.total_deductions || 0,
        total_net_amount: data.total_net_amount || 0,
        created_at: formatForDatabase(getCurrentPhilippineTime()),
        updated_at: formatForDatabase(getCurrentPhilippineTime()),
      })
      .returning("*");

    return period;
  }

  /**
   * Get payroll period by ID with all records
   * @param {number} id
   * @returns {Promise<Object>}
   */
  static async getById(id) {
    const period = await db("payroll_periods")
      .where("id", id)
      .whereNull("deleted_at")
      .first();

    if (!period) {
      throw new Error("Payroll period not found");
    }

    // Get all payroll records for this period
    const records = await db("payroll_records as pr")
      .leftJoin("employees as e", "pr.employee_id", "e.id")
      .leftJoin("branches as b", "pr.branch_id", "b.id")
      .where("pr.payroll_period_id", id)
      .whereNull("pr.deleted_at")
      .select(
        "pr.*",
        "e.first_name",
        "e.last_name",
        "e.email",
        "b.name as branch_name"
      );

    // Get approver names
    if (period.finance_approved_by) {
      const approver = await db("employees")
        .where("id", period.finance_approved_by)
        .first();
      if (approver) {
        period.finance_approved_by_name = `${approver.first_name} ${approver.last_name}`;
      }
    }

    if (period.paid_by) {
      const payer = await db("employees").where("id", period.paid_by).first();
      if (payer) {
        period.paid_by_name = `${payer.first_name} ${payer.last_name}`;
      }
    }

    const generator = await db("employees")
      .where("id", period.generated_by)
      .first();
    if (generator) {
      period.generated_by_name = `${generator.first_name} ${generator.last_name}`;
    }

    return {
      ...period,
      records,
    };
  }

  /**
   * List payroll periods with filters
   * @param {Object} filters
   * @returns {Promise<Object>}
   */
  static async list(filters = {}) {
    const {
      status = null,
      date_from = null,
      date_to = null,
      department = null,
      branch_id = null,
      limit = 20,
      offset = 0,
    } = filters;

    let query = db("payroll_periods as pp")
      .leftJoin("employees as e", "pp.generated_by", "e.id")
      .whereNull("pp.deleted_at")
      .select(
        "pp.*",
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as generated_by_name"),
        db.raw(
          "(SELECT COUNT(*) FROM payroll_records WHERE payroll_period_id = pp.id AND deleted_at IS NULL) as employee_count"
        )
      );

    if (status) {
      query = query.where("pp.status", status);
    }

    if (date_from) {
      query = query.where("pp.date_from", ">=", date_from);
    }

    if (date_to) {
      query = query.where("pp.date_to", "<=", date_to);
    }

    // If filtering by department or branch, we need to check the records
    if (department || branch_id) {
      query = query.whereExists(function () {
        this.select("*")
          .from("payroll_records as pr")
          .whereRaw("pr.payroll_period_id = pp.id")
          .modify((qb) => {
            if (department) {
              qb.where("pr.department", department);
            }
            if (branch_id) {
              qb.where("pr.branch_id", branch_id);
            }
          });
      });
    }

    // Get total count - separate query without the CONCAT
    const countQuery = db("payroll_periods as pp")
      .whereNull("pp.deleted_at")
      .modify((qb) => {
        if (status) qb.where("pp.status", status);
        if (date_from) qb.where("pp.date_from", ">=", date_from);
        if (date_to) qb.where("pp.date_to", "<=", date_to);
        if (department || branch_id) {
          qb.whereExists(function () {
            this.select("*")
              .from("payroll_records as pr")
              .whereRaw("pr.payroll_period_id = pp.id")
              .modify((subQb) => {
                if (department) subQb.where("pr.department", department);
                if (branch_id) subQb.where("pr.branch_id", branch_id);
              });
          });
        }
      });

    const [{ count }] = await countQuery.count("pp.id as count");
    const total = parseInt(count, 10);

    const data = await query
      .orderBy("pp.created_at", "desc")
      .limit(limit)
      .offset(offset);

    return {
      data,
      total,
      limit,
      offset,
    };
  }

  /**
   * Update payroll period status
   * @param {number} id
   * @param {string} status
   * @param {number} userId
   * @returns {Promise<Object>}
   */
  static async updateStatus(id, status, userId) {
    const updates = {
      status,
      updated_at: formatForDatabase(getCurrentPhilippineTime()),
    };

    // Track who did what
    if (status === "approved") {
      updates.finance_approved_by = userId;
      updates.finance_approved_at = formatForDatabase(
        getCurrentPhilippineTime()
      );
    } else if (status === "paid") {
      updates.paid_by = userId;
      updates.paid_at = formatForDatabase(getCurrentPhilippineTime());
    }

    const [period] = await db("payroll_periods")
      .where("id", id)
      .update(updates)
      .returning("*");

    return period;
  }

  /**
   * Update payroll period
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  static async update(id, data) {
    const [period] = await db("payroll_periods")
      .where("id", id)
      .update({
        ...data,
        updated_at: formatForDatabase(getCurrentPhilippineTime()),
      })
      .returning("*");

    return period;
  }

  /**
   * Delete (soft delete) a payroll period
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  static async delete(id) {
    await db("payroll_periods")
      .where("id", id)
      .update({
        deleted_at: formatForDatabase(getCurrentPhilippineTime()),
      });

    return true;
  }

  /**
   * Check if period overlaps with existing periods
   * @param {Date} date_from
   * @param {Date} date_to
   * @param {string} department
   * @param {number} branch_id
   * @returns {Promise<boolean>}
   */
  static async checkOverlap(
    date_from,
    date_to,
    department = null,
    branch_id = null
  ) {
    // Check if there's an overlap in the same scope
    const overlap = await db("payroll_periods as pp")
      .whereNull("pp.deleted_at")
      .where(function () {
        this.whereBetween("pp.date_from", [date_from, date_to])
          .orWhereBetween("pp.date_to", [date_from, date_to])
          .orWhere(function () {
            this.where("pp.date_from", "<=", date_from).where(
              "pp.date_to",
              ">=",
              date_to
            );
          });
      })
      .modify((qb) => {
        if (department || branch_id) {
          qb.whereExists(function () {
            this.select("*")
              .from("payroll_records as pr")
              .whereRaw("pr.payroll_period_id = pp.id")
              .modify((subQb) => {
                if (department) {
                  subQb.where("pr.department", department);
                }
                if (branch_id) {
                  subQb.where("pr.branch_id", branch_id);
                }
              });
          });
        }
      })
      .first();

    return !!overlap;
  }
}

module.exports = PayrollPeriod;
