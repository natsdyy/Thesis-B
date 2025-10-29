/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('job_interviews', function(table) {
    table.dropColumn('interviewer_name');
    table.dropColumn('interviewer_email');
    table.dropColumn('interviewer_phone');
    table.dropColumn('interviewer_position');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('job_interviews', function(table) {
    table.string('interviewer_name', 255).notNullable();
    table.string('interviewer_email', 255).notNullable();
    table.string('interviewer_phone', 50).nullable();
    table.string('interviewer_position', 255).nullable();
  });
};

