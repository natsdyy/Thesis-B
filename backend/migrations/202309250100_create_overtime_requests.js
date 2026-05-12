exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable("overtime_requests");
  if (hasTable) return;

  await knex.schema.createTable("overtime_requests", (table) => {
    table.increments("id").primary();
    table
      .integer("employee_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("employees")
      .onDelete("CASCADE");

    table.date("ot_date").notNullable();
    table.time("start_time").notNullable();
    table.time("end_time").notNullable();
    table.decimal("total_hours", 5, 2).notNullable();
    table.text("reason");

    table
      .enu("status", ["pending", "approved", "rejected"], {
        useNative: true,
        enumName: "overtime_status_enum",
      })
      .notNullable()
      .defaultTo("pending");

    table.integer("approved_by").unsigned().nullable();
    table.timestamp("approved_at").nullable();
    table.text("approver_notes").nullable();

    // auditing
    table.integer("created_by").unsigned().nullable();
    table.integer("updated_by").unsigned().nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable(); // soft delete
  });
};

exports.down = async function (knex) {
  const hasTable = await knex.schema.hasTable("overtime_requests");
  if (hasTable) {
    await knex.schema.dropTable("overtime_requests");
  }
  // Drop enum if created natively (Postgres)
  if (knex.client.config.client === "pg") {
    try {
      await knex.raw('DROP TYPE IF EXISTS "overtime_status_enum"');
    } catch (_) {}
  }
};
