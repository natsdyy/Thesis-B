const { db } = require("../config/database");

class OrgChartPosition {
  static async list() {
    return db("org_chart_positions as ocp")
      .leftJoin("board_members as bm", "ocp.board_member_id", "bm.id")
      .whereNull("ocp.deleted_at")
      .select(
        "ocp.*",
        db.raw("bm.photo_url as board_photo_url"),
        db.raw("bm.first_name as board_first_name"),
        db.raw("bm.last_name as board_last_name")
      )
      .orderBy([
        { column: "ocp.parent_id", order: "asc" },
        { column: "ocp.order_index", order: "asc" },
      ]);
  }

  static async create(data) {
    const [row] = await db("org_chart_positions")
      .insert({
        title: data.title,
        person_name: data.person_name || null,
        employee_id: data.employee_id || null,
        board_member_id: data.board_member_id || null,
        parent_id: data.parent_id || null,
        department: data.department || "Administration",
        order_index: data.order_index ?? 0,
        notes: data.notes || null,
        created_by: data.created_by || null,
      })
      .returning("*");
    return row;
  }

  static async update(id, data) {
    const [row] = await db("org_chart_positions")
      .where({ id })
      .whereNull("deleted_at")
      .update(
        {
          title: data.title,
          person_name: data.person_name,
          employee_id: data.employee_id,
          board_member_id: data.board_member_id,
          parent_id: data.parent_id,
          department: data.department,
          order_index: data.order_index,
          notes: data.notes,
          updated_by: data.updated_by || null,
          updated_at: db.fn.now(),
        },
        "*"
      );
    return row || null;
  }

  static async remove(id, deletedBy = null, reason = null) {
    const [row] = await db("org_chart_positions")
      .where({ id })
      .whereNull("deleted_at")
      .update(
        {
          deleted_at: db.fn.now(),
          updated_by: deletedBy,
          updated_at: db.fn.now(),
          // store deletion reason in notes if provided
          notes: reason || db.raw("notes"),
        },
        "*"
      );
    return row || null;
  }
}

module.exports = OrgChartPosition;
