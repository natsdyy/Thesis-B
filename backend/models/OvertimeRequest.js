const { db: knex } = require("../config/database");

class OvertimeRequest {
  static async create(
    { employee_id, ot_date, start_time, end_time, total_hours, reason },
    createdBy
  ) {
    const [row] = await knex("overtime_requests")
      .insert({
        employee_id,
        ot_date,
        start_time,
        end_time,
        total_hours,
        reason: reason || null,
        status: "pending",
        created_by: createdBy || null,
        updated_by: createdBy || null,
      })
      .returning("*");
    return row;
  }

  static async getMine(employeeId, { page = 1, limit = 20 } = {}) {
    const query = knex("overtime_requests as ot")
      .select(
        "ot.id",
        "ot.employee_id",
        knex.raw("to_char(ot.ot_date, 'YYYY-MM-DD') as ot_date"),
        "ot.start_time",
        "ot.end_time",
        "ot.total_hours",
        "ot.reason",
        "ot.status",
        "ot.approved_by",
        "ot.approved_at",
        "ot.approver_notes",
        "ot.created_by",
        "ot.updated_by",
        "ot.created_at",
        "ot.updated_at",
        "ot.deleted_at"
      )
      .where({ employee_id: employeeId })
      .whereNull("ot.deleted_at")
      .orderBy("ot.created_at", "desc");

    const rows = await query.limit(limit).offset((page - 1) * limit);
    return rows;
  }

  static async getAll({
    status,
    branch_id,
    department_only,
    department,
    page = 1,
    limit = 50,
  } = {}) {
    // Join employees to optionally filter by branch and include approver name
    let query = knex("overtime_requests as ot")
      .select(
        "ot.id",
        "ot.employee_id",
        knex.raw("to_char(ot.ot_date, 'YYYY-MM-DD') as ot_date"),
        "ot.start_time",
        "ot.end_time",
        "ot.total_hours",
        "ot.reason",
        "ot.status",
        "ot.approved_by",
        "ot.approved_at",
        "ot.approver_notes",
        "ot.created_by",
        "ot.updated_by",
        "ot.created_at",
        "ot.updated_at",
        "ot.deleted_at",
        "e.first_name",
        "e.last_name",
        "e.employee_id as employee_code",
        "e.role_id",
        "e.branch_id",
        knex.raw("ur.department as department"),
        knex.raw("COALESCE(appr.first_name, '') as approver_first_name"),
        knex.raw("COALESCE(appr.last_name, '') as approver_last_name")
      )
      .leftJoin("employees as e", "ot.employee_id", "e.id")
      .leftJoin("user_roles as ur", "e.role_id", "ur.role_id")
      .leftJoin("employees as appr", "ot.approved_by", "appr.id")
      .whereNull("ot.deleted_at")
      .orderBy("ot.created_at", "desc");

    if (status) {
      query = query.where("ot.status", status);
    }
    if (branch_id) {
      query = query.where("e.branch_id", branch_id);
    }
    if (department_only === "true") {
      // Only show department employees (those without branch_id)
      query = query.whereNull("e.branch_id");
    }
    if (department) {
      query = query.andWhere("ur.department", department);
    }

    const rows = await query.limit(limit).offset((page - 1) * limit);
    return rows;
  }

  static async approve(id, approverId, notes = null) {
    const [row] = await knex("overtime_requests")
      .where({ id })
      .whereNull("deleted_at")
      .update({
        status: "approved",
        approved_by: approverId,
        approved_at: knex.fn.now(),
        approver_notes: notes || null,
        updated_by: approverId,
        updated_at: knex.fn.now(),
      })
      .returning("*");
    return row;
  }

  static async reject(id, approverId, notes = null) {
    const [row] = await knex("overtime_requests")
      .where({ id })
      .whereNull("deleted_at")
      .update({
        status: "rejected",
        approved_by: approverId,
        approved_at: knex.fn.now(),
        approver_notes: notes || null,
        updated_by: approverId,
        updated_at: knex.fn.now(),
      })
      .returning("*");
    return row;
  }

  static async softDelete(id, userId) {
    const [row] = await knex("overtime_requests")
      .where({ id })
      .whereNull("deleted_at")
      .update({
        deleted_at: knex.fn.now(),
        updated_by: userId,
        updated_at: knex.fn.now(),
      })
      .returning("*");
    return row;
  }
}

module.exports = OvertimeRequest;
