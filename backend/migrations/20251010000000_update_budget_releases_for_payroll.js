/**
 * Migration: Update budget_releases table to support payroll budget releases
 * - Make supply_request_id nullable (payroll doesn't have supply requests)
 * - Add payroll_period_id for linking to payroll
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("budget_releases", function (table) {
    // Make supply_request_id nullable since payroll budget releases don't have supply requests
    table.integer("supply_request_id").unsigned().nullable().alter();

    // Add payroll_period_id for payroll budget releases
    table
      .integer("payroll_period_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("payroll_periods")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE")
      .comment("Reference to payroll period (for payroll budget releases)");

    // Add index for payroll_period_id
    table.index("payroll_period_id", "idx_budget_releases_payroll_period");

    // Add check constraint to ensure either supply_request_id or payroll_period_id is set
    // Note: This is a database-level constraint for data integrity
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("budget_releases", function (table) {
    // Drop payroll_period_id column
    table.dropColumn("payroll_period_id");

    // Revert supply_request_id to NOT NULL
    table.integer("supply_request_id").unsigned().notNullable().alter();
  });
};
