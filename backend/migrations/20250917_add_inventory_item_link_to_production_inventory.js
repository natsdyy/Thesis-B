/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('production_inventory', function(table) {
    // Add inventory_item_id column if it doesn't exist
    table.integer('inventory_item_id').unsigned();
    table.foreign('inventory_item_id').references('id').inTable('inventory_items');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('production_inventory', function(table) {
    table.dropForeign('inventory_item_id');
    table.dropColumn('inventory_item_id');
  });
};
