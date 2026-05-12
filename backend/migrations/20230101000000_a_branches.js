/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('branches', function(table) {
    table.increments('id').primary();
    table.string('name', 255).notNullable().comment('Branch name');
    table.string('code', 50).notNullable().unique().comment('Unique branch code');
    table.text('address').notNullable().comment('Branch address');
    table.string('phone', 20).nullable().comment('Branch contact phone');
    table.string('email', 255).nullable().comment('Branch contact email');
    table.string('manager_name', 255).nullable().comment('Branch manager name');
    table.string('manager_email', 255).nullable().comment('Branch manager email');
    table.string('manager_phone', 20).nullable().comment('Branch manager phone');
    table.string('city', 100).nullable().comment('Branch city');
    table.string('state', 100).nullable().comment('Branch state/province');
    table.string('postal_code', 20).nullable().comment('Branch postal code');
    table.string('country', 100).nullable().comment('Branch country');
    table.boolean('is_active').defaultTo(true).comment('Branch active status');
    table.json('opening_hours').nullable().comment('Branch operating hours');
    table.text('description').nullable().comment('Branch description');
    table.timestamps(true, true);

    // Indexes
    table.index('code', 'idx_branches_code');
    table.index('is_active', 'idx_branches_is_active');
    table.index('city', 'idx_branches_city');
    table.index('state', 'idx_branches_state');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('branches');
};
