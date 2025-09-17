/**
 * @param { import('knex').Knex } knex
 */
exports.up = async function up(knex) {
  const hasColumn = await knex.schema.hasColumn(
    "production_inventory",
    "inventory_item_id"
  );
  if (!hasColumn) {
    await knex.schema.alterTable("production_inventory", (table) => {
      table
        .integer("inventory_item_id")
        .nullable()
        .references("id")
        .inTable("inventory_items")
        .onDelete("SET NULL")
        .index();
    });
  }
};

/**
 * @param { import('knex').Knex } knex
 */
exports.down = async function down(knex) {
  const hasColumn = await knex.schema.hasColumn(
    "production_inventory",
    "inventory_item_id"
  );
  if (hasColumn) {
    await knex.schema.alterTable("production_inventory", (table) => {
      table.dropColumn("inventory_item_id");
    });
  }
};
