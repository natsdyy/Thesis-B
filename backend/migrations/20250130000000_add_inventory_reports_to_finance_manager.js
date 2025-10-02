/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('user_roles', function(table) {
    // Add inventory reports permission to finance manager role
    table.json('permissions').defaultTo('[]');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('user_roles', function(table) {
    table.dropColumn('permissions');
  });
};
