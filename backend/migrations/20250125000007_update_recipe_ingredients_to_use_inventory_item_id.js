/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.up = async function (knex) {
  // First, ensure the inventory_item_id column exists
  await knex.schema.alterTable("recipe_ingredients", (table) => {
    // Add inventory_item_id if it doesn't exist
    if (!knex.schema.hasColumn("recipe_ingredients", "inventory_item_id")) {
      table.integer("inventory_item_id").references("inventory_items(id");
    }
  });

  // Update existing records to populate inventory_item_id based on inventory_item_type_id
  // This is a data migration to ensure existing recipes work
  await knex.raw(`
    UPDATE recipe_ingredients 
    SET inventory_item_id = (
      SELECT ii.id 
      FROM inventory_items ii 
      JOIN inventory_item_types iit ON ii.item_type_id = iit.id 
      WHERE iit.id = recipe_ingredients.inventory_item_type_id
      LIMIT 1
    )
    WHERE inventory_item_id IS NULL AND inventory_item_type_id IS NOT NULL
  `);

  // Now we can safely drop the old column
  await knex.schema.alterTable("recipe_ingredients", (table) => {
    table.dropColumn("inventory_item_type_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.down = async function (knex) {
  // Recreate the old structure if needed to rollback
  await knex.schema.alterTable("recipe_ingredients", (table) => {
    table
      .integer("inventory_item_type_id")
      .references("inventory_item_types(id");
  });

  // Populate inventory_item_type_id based on inventory_item_id
  await knex.raw(`
    UPDATE recipe_ingredients 
    SET inventory_item_type_id = (
      SELECT ii.item_type_id 
      FROM inventory_items ii 
      WHERE ii.id = recipe_ingredients.inventory_item_id
    )
    WHERE inventory_item_type_id IS NULL AND inventory_item_id IS NOT NULL
  `);

  // Drop the new column
  await knex.schema.alterTable("recipe_ingredients", (table) => {
    table.dropColumn("inventory_item_id");
  });
};
