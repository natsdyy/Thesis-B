/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.up = async function (knex) {
  // First, check if inventory_item_id column exists
  const hasColumn = await knex.schema.hasColumn("recipe_ingredients", "inventory_item_id");
  
  if (!hasColumn) {
    await knex.schema.alterTable("recipe_ingredients", (table) => {
      table.integer("inventory_item_id").unsigned().nullable();
      table.foreign("inventory_item_id").references("id").inTable("inventory_items");
    });
  }

  // Update existing records to populate inventory_item_id based on inventory_item_type_id
  // This is a data migration to ensure existing recipes work
  // We first check if the old column still exists to avoid errors on repeated runs
  const hasOldColumn = await knex.schema.hasColumn("recipe_ingredients", "inventory_item_type_id");
  
  if (hasOldColumn) {
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
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.down = async function (knex) {
  const hasOldColumn = await knex.schema.hasColumn("recipe_ingredients", "inventory_item_type_id");
  
  if (!hasOldColumn) {
    // Recreate the old structure if needed to rollback
    await knex.schema.alterTable("recipe_ingredients", (table) => {
      table.integer("inventory_item_type_id").unsigned().nullable();
      table.foreign("inventory_item_type_id").references("id").inTable("inventory_item_types");
    });

    const hasNewColumn = await knex.schema.hasColumn("recipe_ingredients", "inventory_item_id");
    if (hasNewColumn) {
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
    }
  }
};
