/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('finance_balances', function(table) {
    table.dropForeign('branch_id');
    table.dropColumn('branch_id');
    table.dropIndex(['branch_id', 'balance_date']);
    table.dropUnique(['branch_id', 'balance_date']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('finance_balances', function(table) {
    table.integer('branch_id').unsigned().notNullable();
    table.foreign('branch_id').references('id').inTable('branches');
    table.index(['branch_id', 'balance_date']);
    table.unique(['branch_id', 'balance_date']);
  });
};
