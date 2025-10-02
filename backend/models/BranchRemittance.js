const { db } = require("../config/database");
const {
  formatForDatabase,
  getCurrentPhilippineTime,
} = require("../utils/timezoneUtils");

class BranchRemittance {
  static async create(data) {
    const [row] = await db("branch_remittances")
      .insert({
        branch_id: data.branch_id,
        submitted_by: data.submitted_by,
        period_type: data.period_type,
        // Ensure stored ranges are in Philippine timezone
        date_from: data.date_from
          ? formatForDatabase(new Date(data.date_from))
          : null,
        date_to: data.date_to
          ? formatForDatabase(new Date(data.date_to))
          : null,
        gross_sales: data.gross_sales || 0,
        net_sales: data.net_sales || 0,
        refunded_amount: data.refunded_amount || 0,
        voided_amount: data.voided_amount || 0,
        disposed: data.disposed || 0,
        remitted_amount: data.remitted_amount || 0,
        notes: data.notes || null,
        status: "pending",
      })
      .returning("*");
    return row;
  }

  static async list(filters = {}) {
    const {
      branch_id = null,
      status = null,
      date_from = null,
      date_to = null,
      limit = 20,
      offset = 0,
    } = filters;

    let q = db("branch_remittances as br")
      .leftJoin("branches as b", "br.branch_id", "b.id")
      .leftJoin("employees as e", "br.submitted_by", "e.id")
      .select(
        "br.*",
        "b.name as branch_name",
        "e.first_name as submitted_first_name",
        "e.last_name as submitted_last_name"
      )
      .whereNull("br.deleted_at");

    if (branch_id) q.where("br.branch_id", branch_id);
    if (status) q.where("br.status", status);
    if (date_from) q.where("br.date_from", ">=", date_from);
    if (date_to) q.where("br.date_to", "<=", date_to);

    const countRow = await q
      .clone()
      .clearSelect()
      .count({ total: "br.id" })
      .first();
    const total = parseInt(countRow?.total || 0, 10);

    const data = await q
      .orderBy("br.created_at", "desc")
      .limit(limit)
      .offset(offset);
    return { data, total };
  }

  static async approve(id, approvedBy) {
    const [row] = await db("branch_remittances")
      .where({ id })
      .whereNull("deleted_at")
      .update({
        status: "approved",
        approved_by: approvedBy,
        // Record approval time in Philippine timezone
        approved_at: formatForDatabase(getCurrentPhilippineTime()),
      })
      .returning("*");
    return row;
  }

  static async reject(id, approvedBy, notes = null) {
    const [row] = await db("branch_remittances")
      .where({ id })
      .whereNull("deleted_at")
      .update({
        status: "rejected",
        approved_by: approvedBy,
        approved_at: formatForDatabase(getCurrentPhilippineTime()),
        notes,
      })
      .returning("*");
    return row;
  }
}

module.exports = BranchRemittance;
