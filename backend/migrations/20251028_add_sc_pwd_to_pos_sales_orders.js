/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('pos_sales_orders', function(table) {
    table.string('sc_pwd', 255).nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('pos_sales_orders', function(table) {
    table.dropColumn('sc_pwd');
  });
};

