/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('job_interviews', function(table) {
    table.increments('id').primary();
    table.integer('application_id').notNullable();
    table.date('interview_date').notNullable();
    table.time('interview_time').notNullable();
    table.enum('interview_type', ['in-person', 'video', 'phone']).notNullable();
    table.integer('duration').notNullable(); // in minutes
    table.string('interviewer_name', 255).notNullable();
    table.string('interviewer_email', 255).notNullable();
    table.string('interviewer_phone', 50).nullable();
    table.string('interviewer_position', 255).nullable();
    table.string('location', 500).nullable(); // for in-person interviews
    table.string('meeting_link', 500).nullable(); // for video interviews
    table.text('notes').nullable();
    table.enum('status', ['scheduled', 'completed', 'cancelled', 'rescheduled']).defaultTo('scheduled');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Foreign key constraint
    table.foreign('application_id').references('id').inTable('job_applications').onDelete('CASCADE');
    
    // Indexes for better performance
    table.index(['application_id']);
    table.index(['interview_date']);
    table.index(['status']);
    table.index(['interviewer_email']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('job_interviews');
};

