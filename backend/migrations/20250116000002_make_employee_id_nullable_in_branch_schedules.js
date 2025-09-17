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
exports.down = async function(knex) {
  // Revert employee_id to notNullable if column exists
  const hasTable = await knex.schema.hasTable('branch_schedules');
  if (!hasTable) return;
  const hasColumn = await knex.schema.hasColumn('branch_schedules', 'employee_id');
  if (hasColumn) {
    await knex.schema.alterTable('branch_schedules', (table) => {
      table.integer('employee_id').notNullable().alter();
    });
  }
};
=======
exports.down = function (knex) {};
>>>>>>> origin/main
