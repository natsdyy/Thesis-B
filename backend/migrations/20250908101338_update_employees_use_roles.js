/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Add role_id column to employees table
  await knex.schema.alterTable("employees", (table) => {
    table
      .integer("role_id")
      .unsigned()
      .nullable()
      .references("role_id")
      .inTable("user_roles")
      .onDelete("SET NULL")
      .after("department");

    // Add index for performance
    table.index("role_id");
  });

  // Migrate existing job_title data to role_id
  // Get all employees with their current job_title and department
  const employees = await knex("employees")
    .select("id", "job_title", "department")
    .whereNotNull("job_title");

  for (const employee of employees) {
    // Find matching role based on job_title and department
    const role = await knex("user_roles")
      .select("role_id")
      .where("role", employee.job_title)
      .where("department", employee.department)
      .first();

    if (role) {
      // Update employee with role_id
      await knex("employees")
        .where("id", employee.id)
        .update({ role_id: role.role_id });
    }
  }

  // Remove job_title column (we'll keep it for now for safety, can remove later)
  // await knex.schema.alterTable("employees", (table) => {
  //   table.dropColumn("job_title");
  // });

  console.log("✅ Successfully updated employees to use role_id");
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Restore job_title data from roles if needed
  const employees = await knex("employees")
    .leftJoin("user_roles", "employees.role_id", "user_roles.role_id")
    .select("employees.id", "user_roles.role")
    .whereNotNull("employees.role_id");

  for (const employee of employees) {
    if (employee.role) {
      await knex("employees")
        .where("id", employee.id)
        .update({ job_title: employee.role });
    }
  }

  // Remove role_id column
  await knex.schema.alterTable("employees", (table) => {
    table.dropForeign(["role_id"]);
    table.dropIndex(["role_id"]);
    table.dropColumn("role_id");
  });

  console.log("🗑️ Reverted employees table to use job_title");
};
