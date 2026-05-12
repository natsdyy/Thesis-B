/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("employee_schedules", function (table) {
    table.increments("id").primary();
    table.integer("employee_id").unsigned().notNullable();
    table.integer("branch_id").unsigned().notNullable();
    table.date("schedule_date").notNullable();
    table.string("shift_name", 100).notNullable(); // Morning Shift, Afternoon Shift, Night Shift
    table.time("start_time").notNullable();
    table.time("end_time").notNullable();
    table.text("notes").nullable();
    table.boolean("is_active").defaultTo(true);
    table.timestamps(true, true);

    // Foreign key constraints
    table
      .foreign("employee_id")
      .references("id")
      .inTable("employees")
      .onDelete("CASCADE");
    table
      .foreign("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("CASCADE");

    // Indexes for better performance
    table.index(["employee_id", "schedule_date"]);
    table.index(["branch_id", "schedule_date"]);
    table.index(["schedule_date"]);

    // Unique constraint to prevent duplicate schedules for same employee on same date
    table.unique(["employee_id", "schedule_date"], "unique_employee_date");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("employee_schedules");
};
