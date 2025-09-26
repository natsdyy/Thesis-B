/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('overtime_requests', table => {
    table.increments('id').primary();
    table.integer('employee_id').unsigned().notNullable();
    table.integer('branch_id').unsigned().notNullable();
    table.date('overtime_date').notNullable();
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.text('reason').notNullable();
    table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
    table.integer('approved_by').unsigned().nullable();
    table.timestamp('approved_at').nullable();
    table.text('rejection_reason').nullable();
    table.timestamps(true, true);
    
    // Foreign key constraints
    table.foreign('employee_id').references('id').inTable('employees').onDelete('CASCADE');
    table.foreign('branch_id').references('id').inTable('branches').onDelete('CASCADE');
    table.foreign('approved_by').references('id').inTable('employees').onDelete('SET NULL');
    
    // Indexes
    table.index(['employee_id', 'overtime_date']);
    table.index(['branch_id', 'overtime_date']);
    table.index(['status']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('overtime_requests');
};
