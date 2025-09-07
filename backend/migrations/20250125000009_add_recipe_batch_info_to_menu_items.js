/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Add recipe batch information fields to menu_items table
  await knex.schema.alterTable("menu_items", (table) => {
    // Add fields to store recipe batch information for production planning
    table
      .integer("recipe_batch_size")
      .nullable()
      .comment("Recipe batch size for production planning");
    table
      .string("recipe_batch_unit", 50)
      .nullable()
      .comment("Recipe batch unit for production planning");
  });

  // Update existing menu items to populate recipe batch info from recipes table
  await knex.raw(`
    UPDATE menu_items 
    SET 
      recipe_batch_size = (
        SELECT batch_size 
        FROM recipes 
        WHERE recipes.id = menu_items.recipe_id
      ),
      recipe_batch_unit = (
        SELECT batch_unit 
        FROM recipes 
        WHERE recipes.id = menu_items.recipe_id
      )
    WHERE recipe_id IS NOT NULL
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Remove the added fields
  await knex.schema.alterTable("menu_items", (table) => {
    table.dropColumn("recipe_batch_size");
    table.dropColumn("recipe_batch_unit");
  });
};
