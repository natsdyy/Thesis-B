/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable('supply_requests', (table) => {
    table.integer('branch_id').unsigned().nullable();
    table.foreign('branch_id').references('id').inTable('branches').onDelete('SET NULL');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('supply_requests', (table) => {
    table.dropForeign('branch_id');
    table.dropColumn('branch_id');
  });
};
