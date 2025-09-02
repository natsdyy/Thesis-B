/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable("recipe_ingredients", (table) => {
    table
      .string("ingredient_name", 100)
      .nullable()
      .after("inventory_item_type_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable("recipe_ingredients", (table) => {
    table.dropColumn("ingredient_name");
  });
};
