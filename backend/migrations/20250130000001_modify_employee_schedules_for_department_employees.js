/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("employee_schedules", function (table) {
    // Make branch_id nullable to support department employees
    table.integer("branch_id").unsigned().nullable().alter();

    // Remove the foreign key constraint for branch_id since it can be null
    table.dropForeign("branch_id");

    // Add the foreign key constraint back but allow null values
    table
      .foreign("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("CASCADE");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("employee_schedules", function (table) {
    // Remove the foreign key constraint
    table.dropForeign("branch_id");

    // Make branch_id not nullable again
    table.integer("branch_id").unsigned().notNullable().alter();

    // Add the foreign key constraint back
    table
      .foreign("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("CASCADE");
  });
};
