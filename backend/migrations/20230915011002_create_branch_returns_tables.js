/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.up = async function (knex) {
  const hasColumn = await knex.schema.hasColumn(
    "branch_return_items",
    "menu_item_id"
  );
  if (!hasColumn) {
    await knex.schema.alterTable("branch_return_items", (table) => {
      table
        .integer("menu_item_id")
        .unsigned()
        .references("id")
        .inTable("menu_items")
        .index(); // optional, helps lookup performance
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasColumn = await knex.schema.hasColumn(
    "branch_return_items",
    "menu_item_id"
  );
  if (hasColumn) {
    await knex.schema.alterTable("branch_return_items", (table) => {
      table.dropColumn("menu_item_id");
    });
  }
};
