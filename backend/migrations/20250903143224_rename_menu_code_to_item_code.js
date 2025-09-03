/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Check if the column exists as menu_code and rename it to item_code
  const hasMenuCodeColumn = await knex.schema.hasColumn(
    "menu_items",
    "menu_code"
  );
  const hasItemCodeColumn = await knex.schema.hasColumn(
    "menu_items",
    "item_code"
  );

  if (hasMenuCodeColumn && !hasItemCodeColumn) {
    await knex.schema.alterTable("menu_items", (table) => {
      table.renameColumn("menu_code", "item_code");
    });
  } else if (!hasMenuCodeColumn && !hasItemCodeColumn) {
    await knex.schema.alterTable("menu_items", (table) => {
      table.string("item_code").notNullable().unique();
    });
  }
  // If item_code already exists or both exist, do nothing
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Check if the column exists as item_code and rename it back to menu_code
  const hasItemCodeColumn = await knex.schema.hasColumn(
    "menu_items",
    "item_code"
  );
  const hasMenuCodeColumn = await knex.schema.hasColumn(
    "menu_items",
    "menu_code"
  );

  if (hasItemCodeColumn && !hasMenuCodeColumn) {
    await knex.schema.alterTable("menu_items", (table) => {
      table.renameColumn("item_code", "menu_code");
    });
  } else if (!hasItemCodeColumn && !hasMenuCodeColumn) {
    await knex.schema.alterTable("menu_items", (table) => {
      table.string("menu_code").notNullable().unique();
    });
  }
  // If menu_code already exists or both exist, do nothing
};
