/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable('branch_positions', (table) => {
    // Add role_id column to link to user_roles
    table.integer('role_id')
      .unsigned()
      .nullable()
      .comment('Reference to user_roles.role_id for department positions');
    
    // Add foreign key constraint
    table.foreign('role_id')
      .references('role_id')
      .inTable('user_roles')
      .onDelete('SET NULL');
    
    // Add index for better performance
    table.index('role_id');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('branch_positions', (table) => {
    table.dropForeign(['role_id']);
    table.dropIndex(['role_id']);
    table.dropColumn('role_id');
  });
};

