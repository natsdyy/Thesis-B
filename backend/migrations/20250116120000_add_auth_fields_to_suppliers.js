/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('suppliers', function(table) {
    table.string('username', 100).nullable();
    table.string('password_hash', 255).nullable();
    table.string('email', 255).nullable();
    table.boolean('is_verified').defaultTo(false);
    table.timestamp('last_login').nullable();
    table.string('reset_token', 255).nullable();
    table.timestamp('reset_token_expires').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('suppliers', function(table) {
    table.dropColumn('username');
    table.dropColumn('password_hash');
    table.dropColumn('email');
    table.dropColumn('is_verified');
    table.dropColumn('last_login');
    table.dropColumn('reset_token');
    table.dropColumn('reset_token_expires');
  });
};
