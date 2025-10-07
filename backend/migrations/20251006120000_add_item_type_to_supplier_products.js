/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('supplier_products', function(table) {
    table.integer('item_type_id').unsigned().nullable();
    table.foreign('item_type_id').references('id').inTable('item_types');
    table.index(['item_type_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('supplier_products', function(table) {
    table.dropForeign('item_type_id');
    table.dropColumn('item_type_id');
  });
};
