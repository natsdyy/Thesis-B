/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .alterTable('branch_schedules', table => {
      // Add new columns for multiple day support
      table.string('schedule_type', 20).defaultTo('specific'); // specific, weekdays, weekends, custom
      table.json('selected_days').nullable(); // For multiple day schedules
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .alterTable('branch_schedules', table => {
      // Remove the new columns
      table.dropColumn('schedule_type');
      table.dropColumn('selected_days');
    });
};
