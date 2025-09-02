const { db } = require("../config/database");

async function fixRecipeIngredientNames() {
  try {
    console.log("Starting to fix recipe ingredient names...");

    // Get all recipe ingredients that don't have ingredient_name set
    const ingredientsToFix = await db("recipe_ingredients as ri")
      .select(
        "ri.id",
        "ri.inventory_item_type_id",
        "iit.name as ingredient_name"
      )
      .join(
        "inventory_item_types as iit",
        "ri.inventory_item_type_id",
        "iit.id"
      )
      .whereNull("ri.ingredient_name");

    console.log(`Found ${ingredientsToFix.length} ingredients to fix`);

    if (ingredientsToFix.length === 0) {
      console.log(
        "No ingredients need fixing. All ingredient names are already set."
      );
      return;
    }

    // Update each ingredient with the correct name
    for (const ingredient of ingredientsToFix) {
      await db("recipe_ingredients").where("id", ingredient.id).update({
        ingredient_name: ingredient.ingredient_name,
      });

      console.log(
        `Updated ingredient ${ingredient.id} with name: ${ingredient.ingredient_name}`
      );
    }

    console.log("Successfully fixed all recipe ingredient names!");

    // Verify the fix
    const remainingNulls = await db("recipe_ingredients")
      .whereNull("ingredient_name")
      .count("* as count");

    console.log(
      `Remaining ingredients with null names: ${remainingNulls[0].count}`
    );
  } catch (error) {
    console.error("Error fixing recipe ingredient names:", error);
  } finally {
    await db.destroy();
  }
}

// Run the fix
fixRecipeIngredientNames();
