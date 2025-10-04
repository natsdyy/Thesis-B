const { db } = require("../config/database");
const {
  formatForDatabase,
  formatForDatabaseWithTimezone,
  getCurrentPhilippineTime,
  parseFromDatabase,
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

    // Format timestamps to Philippine timezone for response
    const formattedData = data.map((record) => ({
      ...record,
      created_at: record.created_at
        ? formatForDatabaseWithTimezone(new Date(record.created_at))
        : null,
      updated_at: record.updated_at
        ? formatForDatabaseWithTimezone(new Date(record.updated_at))
        : null,
      approved_at: record.approved_at
        ? formatForDatabaseWithTimezone(new Date(record.approved_at))
        : null,
      date_from: record.date_from
        ? formatForDatabaseWithTimezone(new Date(record.date_from))
        : null,
      date_to: record.date_to
        ? formatForDatabaseWithTimezone(new Date(record.date_to))
        : null,
    }));

    return { data: formattedData, total };
  }

  static async approve(id, approvedBy) {
    const [row] = await db("branch_remittances")
      .where({ id })
      .whereNull("deleted_at")
      .update({
        status: "approved",
        approved_by: approvedBy,
        // Record approval time in Philippine timezone with proper offset
        approved_at: formatForDatabaseWithTimezone(getCurrentPhilippineTime()),
      })
      .returning("*");

    // Format the returned timestamps
    if (row) {
      row.created_at = row.created_at
        ? formatForDatabaseWithTimezone(new Date(row.created_at))
        : null;
      row.updated_at = row.updated_at
        ? formatForDatabaseWithTimezone(new Date(row.updated_at))
        : null;
      row.approved_at = row.approved_at
        ? formatForDatabaseWithTimezone(new Date(row.approved_at))
        : null;
      row.date_from = row.date_from
        ? formatForDatabaseWithTimezone(new Date(row.date_from))
        : null;
      row.date_to = row.date_to
        ? formatForDatabaseWithTimezone(new Date(row.date_to))
        : null;
    }

    return row;
  }

  static async reject(id, approvedBy, notes = null) {
    const [row] = await db("branch_remittances")
      .where({ id })
      .whereNull("deleted_at")
      .update({
        status: "rejected",
        approved_by: approvedBy,
        // Record rejection time in Philippine timezone with proper offset
        approved_at: formatForDatabaseWithTimezone(getCurrentPhilippineTime()),
        notes,
      })
      .returning("*");

    // Format the returned timestamps
    if (row) {
      row.created_at = row.created_at
        ? formatForDatabaseWithTimezone(new Date(row.created_at))
        : null;
      row.updated_at = row.updated_at
        ? formatForDatabaseWithTimezone(new Date(row.updated_at))
        : null;
      row.approved_at = row.approved_at
        ? formatForDatabaseWithTimezone(new Date(row.approved_at))
        : null;
      row.date_from = row.date_from
        ? formatForDatabaseWithTimezone(new Date(row.date_from))
        : null;
      row.date_to = row.date_to
        ? formatForDatabaseWithTimezone(new Date(row.date_to))
        : null;
    }

    return row;
  }
}

module.exports = BranchRemittance;
