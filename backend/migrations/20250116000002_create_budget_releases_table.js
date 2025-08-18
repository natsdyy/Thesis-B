/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('budget_releases', function(table) {
    table.increments('id').primary();
    table.string('release_number').unique().notNullable();
    table.date('release_date').notNullable();
    table.integer('supply_request_id').unsigned().references('id').inTable('supply_requests');
    table.integer('branch_id').unsigned().references('id').inTable('branches');
    table.decimal('amount_released', 10, 2).notNullable();
    table.string('status').defaultTo('Pending');
    table.text('remarks');
    table.integer('approved_by').unsigned().references('id').inTable('users');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('budget_releases');
};
