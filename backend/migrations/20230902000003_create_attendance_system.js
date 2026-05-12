/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('attendance_qr_codes', table => {
      table.increments('id').primary();
      table.string('qr_code', 255).unique().notNullable();
      table.string('location_name', 255).notNullable();
      table.text('description').nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('attendance_records', table => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.integer('qr_code_id').unsigned().notNullable();
      table.timestamp('time_in').nullable();
      table.timestamp('time_out').nullable();
      table.string('status', 50).defaultTo('present'); // present, late, absent
      table.decimal('hours_worked', 5, 2).nullable();
      table.text('notes').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      // Foreign keys
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('qr_code_id').references('id').inTable('attendance_qr_codes').onDelete('CASCADE');
      
      // Indexes
      table.index(['user_id', 'created_at']);
      table.index(['qr_code_id', 'created_at']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('attendance_records')
    .dropTableIfExists('attendance_qr_codes');
};
