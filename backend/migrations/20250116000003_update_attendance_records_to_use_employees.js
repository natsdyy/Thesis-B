/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Check if employee_id column exists
  const hasEmployeeId = await knex.schema.hasColumn('attendance_records', 'employee_id');
  
  if (!hasEmployeeId) {
    // Add employee_id column to attendance_records
    await knex.schema.alterTable('attendance_records', (table) => {
      table.integer('employee_id').unsigned().nullable();
      table.foreign('employee_id').references('id').inTable('employees').onDelete('CASCADE');
      table.index('employee_id');
    });
  }

  // Check if user_id column exists
  const hasUserId = await knex.schema.hasColumn('attendance_records', 'user_id');
  
  if (hasUserId) {
    // Migrate existing data: try to match user_id to employee_id
    const attendanceRecords = await knex('attendance_records')
      .select('id', 'user_id')
      .whereNotNull('user_id')
      .whereNull('employee_id');

    for (const record of attendanceRecords) {
      // Try to find matching employee by email or other identifier
      const employee = await knex('employees')
        .select('id')
        .where('email', knex.raw('(SELECT email FROM users WHERE id = ?)', [record.user_id]))
        .first();

      if (employee) {
        await knex('attendance_records')
          .where('id', record.id)
          .update({ employee_id: employee.id });
      }
    }

    // Drop the old user_id foreign key and column
    await knex.schema.alterTable('attendance_records', (table) => {
      table.dropForeign('user_id');
      table.dropIndex(['user_id', 'created_at']);
      table.dropColumn('user_id');
    });
  }

  // Ensure employee_id is not nullable
  await knex.schema.alterTable('attendance_records', (table) => {
    table.integer('employee_id').unsigned().notNullable().alter();
  });

  // Update the index
  await knex.schema.alterTable('attendance_records', (table) => {
    table.index(['employee_id', 'created_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
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
