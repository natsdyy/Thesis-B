/**
 * Migration: Backfill role_id from legacy job_title and drop job_title column
 *
 * Up:
 *  - For employees with NULL role_id but a job_title, try to find a matching role in user_roles
 *    by case-insensitive role name and department, and set employees.role_id accordingly
 *  - Drop employees.job_title column
 *
 * Down:
 *  - Recreate employees.job_title column (nullable)
 *  - Backfill job_title from the joined user_roles.role where available
 */

exports.up = async function up(knex) {
  // Backfill role_id using job_title when possible
  const candidates = await knex("employees")
    .select("id", "department", "job_title")
    .whereNull("role_id")
    .whereNotNull("job_title");

  for (const emp of candidates) {
    // Find a matching active role in the same department (case-insensitive)
    const match = await knex("user_roles")
      .select("role_id")
      .whereRaw("LOWER(role) = LOWER(?)", [emp.job_title])
      .andWhereRaw("LOWER(department) = LOWER(?)", [emp.department || ""])
      .whereNull("deleted_at")
      .first();

    if (match && match.role_id) {
      await knex("employees")
        .where("id", emp.id)
        .update({ role_id: match.role_id });
    }
  }

  // Drop legacy job_title column if it exists
  const hasColumn = await knex.schema.hasColumn("employees", "job_title");
  if (hasColumn) {
    await knex.schema.alterTable("employees", (table) => {
      table.dropColumn("job_title");
    });
  }
};

exports.down = async function down(knex) {
  // Recreate job_title column
  const missing = !(await knex.schema.hasColumn("employees", "job_title"));
  if (missing) {
    await knex.schema.alterTable("employees", (table) => {
      table.string("job_title").nullable();
    });
  }

  // Backfill job_title from role when available
  const rows = await knex("employees as e")
    .leftJoin("user_roles as r", "e.role_id", "r.role_id")
    .select("e.id", "r.role")
    .whereNull("e.job_title")
    .whereNotNull("e.role_id");

  for (const row of rows) {
    await knex("employees").where("id", row.id).update({ job_title: row.role });
  }
};
