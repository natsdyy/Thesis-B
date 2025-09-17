/**
 * Add branch_inventory_item_id column to branch_return_items (Postgres)
 */

exports.up = async function (knex) {
  const hasColumn = await knex.schema.hasColumn(
    "branch_return_items",
    "branch_inventory_item_id"
  );
  if (!hasColumn) {
    await knex.schema.alterTable("branch_return_items", (table) => {
      table
        .integer("branch_inventory_item_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("branch_inventory");
    });
  }
};

exports.down = async function (knex) {
  const hasColumn = await knex.schema.hasColumn(
    "branch_return_items",
    "branch_inventory_item_id"
  );
  if (hasColumn) {
    await knex.schema.alterTable("branch_return_items", (table) => {
      table.dropColumn("branch_inventory_item_id");
    });
  }
};
