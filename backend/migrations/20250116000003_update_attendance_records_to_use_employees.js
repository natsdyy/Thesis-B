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
exports.down = async function (knex) {
  // Add back user_id column
  await knex.schema.alterTable('attendance_records', (table) => {
    table.integer('user_id').unsigned().nullable().after('id');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.index(['user_id', 'created_at']);
  });

  // Migrate data back (reverse migration)
  const attendanceRecords = await knex('attendance_records')
    .select('id', 'employee_id')
    .whereNotNull('employee_id');

  for (const record of attendanceRecords) {
    const user = await knex('users')
      .select('id')
      .where('email', knex.raw('(SELECT email FROM employees WHERE id = ?)', [record.employee_id]))
      .first();

    if (user) {
      await knex('attendance_records')
        .where('id', record.id)
        .update({ user_id: user.id });
    }
  }

  // Drop employee_id
  await knex.schema.alterTable('attendance_records', (table) => {
    table.dropForeign('employee_id');
    table.dropIndex(['employee_id', 'created_at']);
    table.dropColumn('employee_id');
  });
};
=======
exports.down = function (knex) {};
>>>>>>> origin/main
