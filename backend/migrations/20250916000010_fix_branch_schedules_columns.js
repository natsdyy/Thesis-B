/**
 * Ensure required columns exist on branch_schedules.
 * This migration is idempotent and only adds columns that are missing.
 *
 * Columns handled:
 * - employee_id (nullable integer)
 */

/**
 * @param { import('knex').Knex } knex
 */
exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable('branch_schedules');
  if (!hasTable) return; // nothing to do; another migration should create the table

  const ensureColumn = async (columnName, addColumnCb) => {
    const exists = await knex.schema.hasColumn('branch_schedules', columnName);
    if (!exists) {
      await knex.schema.alterTable('branch_schedules', addColumnCb);
    }
  };

  // Add employee_id if missing
  await ensureColumn('employee_id', (table) => {
    table.integer('employee_id').nullable();
  });
};

/**
 * @param { import('knex').Knex } knex
 */
exports.down = async function down(knex) {
  // Down migration is a no-op to avoid dropping columns that may be used.
  return Promise.resolve();
};





