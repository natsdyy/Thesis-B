/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('cash_movements', function(table) {
    table.increments('id').primary();
    table.integer('branch_id').unsigned().notNullable();
    table.decimal('amount', 10, 2).notNullable();
    table.enum('type', ['income', 'expense']).notNullable();
    table.string('description', 255).notNullable();
    table.string('category', 100).nullable();
    table.timestamp('transaction_date').defaultTo(knex.fn.now());
    table.integer('created_by').unsigned().nullable();
    table.timestamps(true, true);
    
    table.foreign('branch_id').references('id').inTable('branches');
    table.foreign('created_by').references('id').inTable('employees');
    
    table.index(['branch_id', 'transaction_date']);
    table.index(['type', 'transaction_date']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('cash_movements');
};
