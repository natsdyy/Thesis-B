/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable('branch_request_items', (table) => {
    table.string('mapping_field_1', 255).nullable();
    table.string('mapping_field_2', 255).nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('branch_request_items', (table) => {
    table.dropColumn('mapping_field_1');
    table.dropColumn('mapping_field_2');
  });
};
