/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasMenuItemId = await knex.schema.hasColumn(
    "branch_request_items",
    "menu_item_id"
  );

  await knex.schema.alterTable("branch_request_items", (table) => {
    if (!hasMenuItemId) {
      table
        .integer("menu_item_id")
        .unsigned()
        .nullable()
        .comment("Reference to menu_items for production requests");
    }
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
<<<<<<< HEAD
exports.down = function (knex) {
  return knex.schema.alterTable('branch_request_items', (table) => {
    table.dropForeign('menu_item_id');
    table.dropColumn('menu_item_id');
=======
exports.down = async function (knex) {
  await knex.schema.alterTable("branch_request_items", (table) => {
    table.dropColumn("menu_item_id");
>>>>>>> origin/main
  });
};
