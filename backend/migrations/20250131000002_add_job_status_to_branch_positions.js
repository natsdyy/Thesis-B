/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('branch_positions', function(table) {
    table.enum('job_status', ['open', 'closed', 'filled', 'on-hold']).defaultTo('open');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('branch_positions', function(table) {
    table.dropColumn('job_status');
  });
};

