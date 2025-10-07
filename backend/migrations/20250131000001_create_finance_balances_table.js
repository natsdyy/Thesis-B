/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('finance_balances', function(table) {
    table.increments('id').primary();
    table.integer('branch_id').unsigned().notNullable();
    table.decimal('opening_balance', 10, 2).defaultTo(0);
    table.decimal('current_balance', 10, 2).defaultTo(0);
    table.date('balance_date').notNullable();
    table.text('notes').nullable();
    table.timestamps(true, true);
    
    table.foreign('branch_id').references('id').inTable('branches');
    
    table.index(['branch_id', 'balance_date']);
    table.unique(['branch_id', 'balance_date']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('finance_balances');
};
