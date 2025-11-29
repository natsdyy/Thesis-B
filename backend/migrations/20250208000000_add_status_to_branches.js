/**
 * Add status column to branches table for Open/Closed state
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.table('branches', function (table) {
    table.string('status', 20).defaultTo('Open').comment('Branch operational status: Open or Closed');
    table.index('status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.table('branches', function (table) {
    table.dropIndex('status');
    table.dropColumn('status');
  });
};

