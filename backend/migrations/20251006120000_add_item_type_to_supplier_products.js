/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  const hasColumn = await knex.schema.hasColumn(
    "supplier_products",
    "item_type_id"
  );

  if (!hasColumn) {
    await knex.schema.alterTable("supplier_products", (table) => {
      table
        .integer("item_type_id")
        .unsigned()
        .nullable()
        .references("id")
        .inTable("inventory_item_types")
        .onDelete("SET NULL");
      table.index("item_type_id");
    });
  }
};

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  const hasColumn = await knex.schema.hasColumn(
    "supplier_products",
    "item_type_id"
  );

  if (hasColumn) {
    await knex.schema.alterTable("supplier_products", (table) => {
      table.dropColumn("item_type_id");
    });
  }
};
