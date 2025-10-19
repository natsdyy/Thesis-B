const { db } = require("../config/database");

class OrgChartPosition {
  static async list() {
    return db("org_chart_positions")
      .whereNull("deleted_at")
      .orderBy([
        { column: "parent_id", order: "asc" },
        { column: "order_index", order: "asc" },
      ]);
  }

  static async create(data) {
    const [row] = await db("org_chart_positions")
      .insert({
        title: data.title,
        person_name: data.person_name || null,
        employee_id: data.employee_id || null,
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

  static async remove(id, deletedBy = null) {
    const [row] = await db("org_chart_positions")
      .where({ id })
      .whereNull("deleted_at")
      .update(
        {
          deleted_at: db.fn.now(),
          updated_by: deletedBy,
          updated_at: db.fn.now(),
        },
        "*"
      );
    return row || null;
  }
}

module.exports = OrgChartPosition;
