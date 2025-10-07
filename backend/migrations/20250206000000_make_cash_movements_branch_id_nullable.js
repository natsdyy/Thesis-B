/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('cash_movements', function(table) {
    table.dropForeign('branch_id');
    table.integer('branch_id').unsigned().nullable().alter();
    table.foreign('branch_id').references('id').inTable('branches');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('cash_movements', function(table) {
    table.dropForeign('branch_id');
    table.integer('branch_id').unsigned().notNullable().alter();
    table.foreign('branch_id').references('id').inTable('branches');
  });
};
