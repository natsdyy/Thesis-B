const { db } = require("../config/database");
const {
  formatForDatabase,
  getCurrentPhilippineTime,
} = require("../utils/timezoneUtils");

/**
 * CashMovement model
 * Records cash flow movements (inflows/outflows) for branches and finance.
 * Intended primary sources:
 *  - Branch remittances (inflow)
 *  - Manual finance entries (in/out)
 *  - Other integrations (loans, expenses, etc.)
 */
class CashMovement {
  /**
   * Create a cash movement record
   * @param {Object} data
   * @param {number} data.branch_id
   * @param {('in'|'out')} data.movement_type
   * @param {number} data.amount
   * @param {string} [data.source] e.g. 'remittance' | 'manual' | 'loan' | 'expense'
   * @param {string|number} [data.reference_id] optional related id
   * @param {string} [data.reference_type] e.g. 'branch_remittance'
   * @param {string} [data.notes]
   * @param {string|Date} [data.occurred_at] if omitted, uses PH now
   */
  static async create(data) {
    const payload = {
      branch_id: data.branch_id,
      movement_type: data.movement_type, // 'in' | 'out'
      amount: Number(data.amount || 0),
      source: data.source || null,
      reference_id: data.reference_id || null,
      reference_type: data.reference_type || null,
      notes: data.notes || null,
      occurred_at: formatForDatabase(
        data.occurred_at
          ? new Date(data.occurred_at)
          : getCurrentPhilippineTime()
      ),
    };

    const [row] = await db("cash_movements").insert(payload).returning("*");
    return row;
  }

  /**
   * List cash movements with filters
   * @param {Object} filters
   * @param {number} [filters.branch_id]
   * @param {('in'|'out')} [filters.movement_type]
   * @param {string|Date} [filters.date_from]
   * @param {string|Date} [filters.date_to]
   * @param {number} [filters.limit=20]
   * @param {number} [filters.offset=0]
   * @param {boolean} [filters.include_non_branch=false] - Include movements without branch_id (HQ/SCM)
   */
  static async list(filters = {}) {
    const {
      branch_id = null,
      movement_type = null,
      date_from = null,
      date_to = null,
      limit = 20,
      offset = 0,
      include_non_branch = false,
    } = filters;

    let q = db("cash_movements as cm")
      .leftJoin("branches as b", "cm.branch_id", "b.id")
      .select("cm.*", "b.name as branch_name")
      .whereNull("cm.deleted_at");

    // Handle branch_id filtering with support for non-branch movements
    if (branch_id) {
      q.where("cm.branch_id", branch_id);
    } else if (!include_non_branch) {
      // If no branch_id specified and not including non-branch, show all with branches
      q.whereNotNull("cm.branch_id");
    }
    // If include_non_branch is true and no branch_id, show all movements (branch and non-branch)

    if (movement_type) q.where("cm.movement_type", movement_type);
    if (date_from) q.where("cm.occurred_at", ">=", date_from);
    if (date_to) q.where("cm.occurred_at", "<=", date_to);

    const countRow = await q
      .clone()
      .clearSelect()
      .count({ total: "cm.id" })
      .first();
    const total = parseInt(countRow?.total || 0, 10);

    const data = await q
      .orderBy("cm.occurred_at", "desc")
      .limit(limit)
      .offset(offset);
    return { data, total };
  }

  /**
   * Summarize totals by branch within a range
   */
  static async summarizeByBranch({ date_from = null, date_to = null } = {}) {
    let q = db("cash_movements as cm")
      .leftJoin("branches as b", "cm.branch_id", "b.id")
      .whereNull("cm.deleted_at");

    if (date_from) q.where("cm.occurred_at", ">=", date_from);
    if (date_to) q.where("cm.occurred_at", "<=", date_to);

    const rows = await q
      .select("cm.branch_id", "b.name as branch_name")
      .sum({
        inflow: db.raw(
          "case when cm.movement_type = 'in' then cm.amount else 0 end"
        ),
      })
      .sum({
        outflow: db.raw(
          "case when cm.movement_type = 'out' then cm.amount else 0 end"
        ),
      })
      .groupBy("cm.branch_id", "b.name")
      .orderBy("b.name", "asc");
    return rows.map((r) => ({
      branch_id: r.branch_id,
      branch_name: r.branch_name,
      inflow: Number(r.inflow || 0),
      outflow: Number(r.outflow || 0),
      net: Number(r.inflow || 0) - Number(r.outflow || 0),
    }));
  }

  /**
   * Helper: record an inflow from an approved branch remittance
   * @param {Object} remittance a row from branch_remittances
   */
  static async recordInflowFromRemittance(remittance) {
    if (!remittance) return null;
    return await CashMovement.create({
      branch_id: remittance.branch_id,
      movement_type: "in",
      amount: Number(remittance.remitted_amount || 0),
      source: "remittance",
      reference_id: remittance.id,
      reference_type: "branch_remittance",
      notes: `Remittance for ${remittance.period_type || "period"}`,
      occurred_at:
        remittance.approved_at ||
        remittance.created_at ||
        getCurrentPhilippineTime(),
    });
  }

  /**
   * Get disposal losses by branch within a date range
   * @param {Object} params
   * @param {string|Date} [params.date_from]
   * @param {string|Date} [params.date_to]
   */
  static async getDisposalLossesByBranch({
    date_from = null,
    date_to = null,
  } = {}) {
    let q = db("cash_movements as cm")
      .leftJoin("branches as b", "cm.branch_id", "b.id")
      .whereNull("cm.deleted_at")
      .where("cm.source", "disposal_loss")
      .where("cm.movement_type", "out");

    if (date_from) q.where("cm.occurred_at", ">=", date_from);
    if (date_to) q.where("cm.occurred_at", "<=", date_to);

    const rows = await q
      .select("cm.branch_id", "b.name as branch_name")
      .sum({ total_disposal_loss: "cm.amount" })
      .groupBy("cm.branch_id", "b.name")
      .orderBy("b.name", "asc");

    return rows.map((r) => ({
      branch_id: r.branch_id,
      branch_name: r.branch_name || "HQ/SCM",
      disposal_loss: Number(r.total_disposal_loss || 0),
    }));
  }
}

module.exports = CashMovement;
