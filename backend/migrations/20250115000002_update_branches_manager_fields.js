/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('branches', function(table) {
    // Add manager_id field
    table.integer('manager_id').unsigned().nullable().comment('Foreign key to users table for branch manager');
    
    // Add foreign key constraint
    table.foreign('manager_id').references('id').inTable('users').onDelete('SET NULL');
    
    // Drop old manager fields
    table.dropColumn('manager_name');
    table.dropColumn('manager_email');
    table.dropColumn('manager_phone');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('branches', function(table) {
    // Drop foreign key and manager_id
    table.dropForeign('manager_id');
    table.dropColumn('manager_id');
    
    // Restore old manager fields
    table.string('manager_name', 255).nullable().comment('Branch manager name');
    table.string('manager_email', 255).nullable().comment('Branch manager email');
    table.string('manager_phone', 20).nullable().comment('Branch manager phone');
  });
};
