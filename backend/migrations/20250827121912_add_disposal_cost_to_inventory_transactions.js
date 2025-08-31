/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("inventory_transactions", function (table) {
    table.decimal("disposal_cost", 12, 2).nullable().after("adjustment_type");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("inventory_transactions", function (table) {
    table.dropColumn("disposal_cost");
  });
};
