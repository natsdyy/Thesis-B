/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("purchase_order_items", function (table) {
    table.timestamp("deleted_at").nullable().comment("Soft delete timestamp");
    table.index("deleted_at");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("purchase_order_items", function (table) {
    table.dropColumn("deleted_at");
  });
};
