/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('pos_orders', function(table) {
    table.integer('remittance_id').nullable();
    table.foreign('remittance_id').references('id').inTable('branch_remittances');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('pos_orders', function(table) {
    table.dropForeign('remittance_id');
    table.dropColumn('remittance_id');
  });
};
