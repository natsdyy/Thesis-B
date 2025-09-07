/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasColumn = await knex.schema.hasColumn("menu_items", "image_url");
  if (!hasColumn) {
    await knex.schema.alterTable("menu_items", (table) => {
      table.string("image_url").nullable();
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasColumn = await knex.schema.hasColumn("menu_items", "image_url");
  if (hasColumn) {
    await knex.schema.alterTable("menu_items", (table) => {
      table.dropColumn("image_url");
    });
  }
};
