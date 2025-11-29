/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('employees', function(table) {
    table.string('onboarding_status', 50).nullable().defaultTo(null);
    table.comment('onboarding_status: pending, approved, rejected');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('employees', function(table) {
    table.dropColumn('onboarding_status');
  });
};
