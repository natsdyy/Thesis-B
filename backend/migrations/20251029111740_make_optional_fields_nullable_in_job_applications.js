/**
 * Migration to make optional fields nullable in job_applications table
 * These fields were removed from the frontend form, so they should be optional in the database
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('job_applications', function(table) {
    // Make motivation nullable (removed from form)
    table.text('motivation').nullable().alter();
    // Make availability nullable (removed from form)
    table.string('availability', 100).nullable().alter();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('job_applications', function(table) {
    // Revert: make motivation not nullable
    table.text('motivation').notNullable().alter();
    // Revert: make availability not nullable
    table.string('availability', 100).notNullable().alter();
  });
};
