/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable('branch_request_items', (table) => {
    table.integer('menu_item_id').unsigned().nullable();
    table.foreign('menu_item_id').references('id').inTable('menu_items').onDelete('SET NULL');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('branch_request_items', (table) => {
    table.dropForeign('menu_item_id');
    table.dropColumn('menu_item_id');
  });
};
