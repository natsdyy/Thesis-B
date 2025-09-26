/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('employee_schedules', table => {
    // Add department_id column if it doesn't exist
    table.integer('department_id').unsigned().nullable().after('employee_id');
    
    // Add foreign key constraint
    table.foreign('department_id').references('id').inTable('departments').onDelete('SET NULL');
    
    // Add index for better performance
    table.index(['department_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('employee_schedules', table => {
    table.dropForeign(['department_id']);
    table.dropIndex(['department_id']);
    table.dropColumn('department_id');
  });
};
