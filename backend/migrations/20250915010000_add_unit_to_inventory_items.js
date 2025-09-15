/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Add column as nullable first for safe backfill
  const hasColumn = await knex.schema.hasColumn(
    "inventory_items",
    "unit_of_measure"
  );
  if (!hasColumn) {
    await knex.schema.alterTable("inventory_items", (table) => {
      table.string("unit_of_measure", 50).nullable();
    });

    // Backfill from item type default
    await knex.raw(`
      UPDATE inventory_items ii
      SET unit_of_measure = iit.unit_of_measure
      FROM inventory_item_types iit
      WHERE ii.item_type_id = iit.id AND ii.unit_of_measure IS NULL
    `);

    // Make column not null going forward
    await knex.schema.alterTable("inventory_items", (table) => {
      table.string("unit_of_measure", 50).notNullable().alter();
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasColumn = await knex.schema.hasColumn(
    "inventory_items",
    "unit_of_measure"
  );
  if (hasColumn) {
    await knex.schema.alterTable("inventory_items", (table) => {
      table.dropColumn("unit_of_measure");
    });
  }
};
