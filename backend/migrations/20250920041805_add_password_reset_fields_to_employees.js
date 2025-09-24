/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('employees', function(table) {
    table.string('reset_token', 255).nullable();
    table.timestamp('reset_token_expiry').nullable();
    table.index('reset_token');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('employees', function(table) {
    table.dropIndex('reset_token');
    table.dropColumn('reset_token');
    table.dropColumn('reset_token_expiry');
  });
};