/**
 * Migration: Add rest_day_pay field to payroll_records
 * This field tracks the rest day premium separately for transparency
 * Rest day pay applies when employees work on their scheduled Day Off (or overridden Day Off)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("payroll_records", function (table) {
    // Add field to track rest day premium separately
    // This is the additional pay for working on rest days (Day Off)
    // It's already included in holiday pay calculations but now tracked separately for transparency
    table
      .decimal("rest_day_pay", 12, 2)
      .defaultTo(0)
      .notNullable()
      .comment(
        "Additional pay for working on rest days (Day Off) - tracked separately for transparency"
      );
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("payroll_records", function (table) {
    table.dropColumn("rest_day_pay");
  });
};
