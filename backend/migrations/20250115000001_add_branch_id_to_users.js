/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.integer('branch_id').unsigned().nullable().comment('User assigned branch');
    table.foreign('branch_id').references('id').inTable('branches').onDelete('SET NULL');
    table.index('branch_id', 'idx_users_branch_id');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.dropForeign('branch_id');
    table.dropIndex('branch_id', 'idx_users_branch_id');
    table.dropColumn('branch_id');
  });
};
