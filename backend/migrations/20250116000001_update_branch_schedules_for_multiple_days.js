/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
<<<<<<< HEAD
exports.down = function(knex) {
  return knex.schema
    .alterTable('branch_schedules', table => {
      // Remove the new columns
      table.dropColumn('schedule_type');
      table.dropColumn('selected_days');
    });
};
=======
exports.down = function (knex) {};
>>>>>>> origin/main
