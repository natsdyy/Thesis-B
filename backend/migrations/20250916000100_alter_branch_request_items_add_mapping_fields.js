/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasInventoryItemId = await knex.schema.hasColumn(
    "branch_request_items",
    "inventory_item_id"
  );
  const hasUnitPrice = await knex.schema.hasColumn(
    "branch_request_items",
    "unit_price"
  );
  const hasCategory = await knex.schema.hasColumn(
    "branch_request_items",
    "category"
  );

  await knex.schema.alterTable("branch_request_items", (table) => {
    if (!hasInventoryItemId) {
      table
        .integer("inventory_item_id")
        .unsigned()
        .nullable()
        .comment("Reference to branch inventory item if mapped");
    }
    if (!hasUnitPrice) {
      table
        .decimal("unit_price", 12, 2)
        .nullable()
        .comment("Unit price at time of request");
    }
    if (!hasCategory) {
      table
        .string("category", 150)
        .nullable()
        .comment("Category at request time");
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
    table.dropColumn('mapping_field_1');
    table.dropColumn('mapping_field_2');
=======
exports.down = async function (knex) {
  await knex.schema.alterTable("branch_request_items", (table) => {
    table.dropColumn("inventory_item_id");
    table.dropColumn("unit_price");
    table.dropColumn("category");
>>>>>>> origin/main
  });
};
