/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable("leave_requests");
  if (hasTable) return;

  await knex.schema.createTable("leave_requests", (table) => {
    table.increments("id").primary();
    table
      .integer("employee_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("employees")
      .onDelete("CASCADE");

    table.date("from_date").notNullable();
    table.date("to_date").notNullable();
    table.string("leave_type", 100).notNullable();
    table.text("reason").notNullable();

    table
      .enu(
        "status",
        ["pending", "approved_by_manager", "approved_by_hr", "rejected"],
        {
          useNative: true,
          enumName: "leave_status_enum",
        }
      )
      .notNullable()
      .defaultTo("pending");

    // Branch Manager Approval
    table.integer("approved_by_manager").unsigned().nullable();
    table.timestamp("manager_approved_at").nullable();
    table.text("manager_notes").nullable();

    // HR Department Approval
    table.integer("approved_by_hr").unsigned().nullable();
    table.timestamp("hr_approved_at").nullable();
    table.text("hr_notes").nullable();

    // Rejection
    table.integer("rejected_by").unsigned().nullable();
    table.timestamp("rejected_at").nullable();
    table.text("rejection_reason").nullable();

    // Auditing
    table.integer("created_by").unsigned().nullable();
    table.integer("updated_by").unsigned().nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable(); // soft delete
  });

  // Add indexes for better performance
  await knex.raw(`
    CREATE INDEX idx_leave_requests_employee_id ON leave_requests(employee_id);
    CREATE INDEX idx_leave_requests_status ON leave_requests(status);
    CREATE INDEX idx_leave_requests_dates ON leave_requests(from_date, to_date);
    CREATE INDEX idx_leave_requests_created_at ON leave_requests(created_at);
  `);
};

exports.down = async function (knex) {
  const hasTable = await knex.schema.hasTable("leave_requests");
  if (hasTable) {
    await knex.schema.dropTable("leave_requests");
  }

  // Drop enum if created natively (Postgres)
  if (knex.client.config.client === "pg") {
    try {
      await knex.raw('DROP TYPE IF EXISTS "leave_status_enum"');
    } catch (_) {}
  }
};
