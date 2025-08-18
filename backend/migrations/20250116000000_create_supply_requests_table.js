/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('supply_requests', function(table) {
    table.increments('id').primary();
    table.string('request_id').unique().notNullable();
    table.date('request_date').notNullable();
    table.string('request_type').notNullable();
    table.text('request_description').notNullable();
    table.string('request_status').defaultTo('Pending');
    table.integer('user_id').unsigned().references('id').inTable('users');
    table.integer('branch_id').unsigned().references('id').inTable('branches');
    table.decimal('total_amount', 10, 2).defaultTo(0);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('supply_requests');
};
