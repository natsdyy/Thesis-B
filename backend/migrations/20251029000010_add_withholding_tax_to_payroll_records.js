/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("payroll_records", function (table) {
    table.decimal("withholding_tax", 12, 2).defaultTo(0);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("payroll_records", function (table) {
    table.dropColumn("withholding_tax");
  });
};
