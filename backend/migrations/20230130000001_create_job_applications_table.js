/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('job_applications', function(table) {
    table.increments('id').primary();
    table.string('full_name', 255).notNullable();
    table.string('email', 255).notNullable();
    table.string('phone', 50).notNullable();
    table.date('date_of_birth').notNullable();
    table.text('address').notNullable();
    table.string('position_title', 255).notNullable();
    table.string('department', 100).notNullable();
    table.integer('experience_years').notNullable();
    table.decimal('expected_salary', 10, 2).nullable();
    table.text('skills').notNullable();
    table.text('motivation').notNullable();
    table.string('availability', 100).notNullable();
    table.text('additional_notes').nullable();
    table.string('resume_path', 500).nullable();
    table.string('additional_documents_path', 500).nullable();
    table.integer('position_id').nullable();
    table.timestamp('application_date').notNullable();
    table.enum('status', ['new', 'reviewing', 'shortlisted', 'rejected', 'hired']).defaultTo('new');
    table.timestamps(true, true);
    
    // Indexes for better performance
    table.index(['status']);
    table.index(['department']);
    table.index(['position_id']);
    table.index(['application_date']);
    table.index(['email']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('job_applications');
};

