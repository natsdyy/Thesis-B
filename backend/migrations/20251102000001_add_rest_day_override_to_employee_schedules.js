/**
 * Migration: Add is_rest_day_override field to employee_schedules
 * This field tracks when a Day Off shift was overridden with a working shift
 * to ensure rest day pay rates still apply in payroll calculations
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("employee_schedules", function (table) {
    // Add field to track if this schedule was originally a Day Off that was overridden
    // When true, rest day pay rates should still apply even though shift_name is not "Day Off"
    table.boolean("is_rest_day_override").defaultTo(false).notNullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("employee_schedules", function (table) {
    table.dropColumn("is_rest_day_override");
  });
};
