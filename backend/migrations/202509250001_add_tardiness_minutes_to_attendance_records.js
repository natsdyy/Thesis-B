/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('attendance_records', table => {
    table.integer('tardiness_minutes').defaultTo(0).comment('Minutes late for time in');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('attendance_records', table => {
    table.dropColumn('tardiness_minutes');
  });
};
