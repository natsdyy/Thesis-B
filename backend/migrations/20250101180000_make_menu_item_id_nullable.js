/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("pos_order_items", function (table) {
    // Make menu_item_id nullable to support SCM items that don't have menu_item_id
    table.integer("menu_item_id").unsigned().nullable().alter();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("pos_order_items", function (knex) {
    // Revert menu_item_id to not nullable (this will fail if there are null values)
    table.integer("menu_item_id").unsigned().notNullable().alter();
  });
};
