const { db } = require("../config/database");

async function checkInventoryItemTypes() {
  try {
    console.log("Checking inventory item types...\n");

    // Get all inventory item types
    const itemTypes = await db("inventory_item_types")
      .select("id", "name", "description", "category_id")
      .orderBy("category_id", "asc");

    console.log("All inventory item types:");
    console.log("ID | Name | Description | Category ID");
    console.log("---|------|-------------|------------");

    for (const item of itemTypes) {
      console.log(
        `${item.id.toString().padStart(2)} | ${item.name.padEnd(20)} | ${item.description.padEnd(30)} | ${item.category_id}`
      );
    }

    console.log("\nChecking categories...");
    const categories = await db("inventory_categories")
      .select("id", "name")
      .orderBy("id", "asc");

    console.log("Categories:");
    for (const cat of categories) {
      console.log(`ID ${cat.id}: ${cat.name}`);
    }

    console.log("\nChecking recipe ingredients...");
    const recipeIngredients = await db("recipe_ingredients as ri")
      .select(
        "ri.id",
        "ri.inventory_item_type_id",
        "ri.ingredient_name",
        "iit.name as item_type_name"
      )
      .join(
        "inventory_item_types as iit",
        "ri.inventory_item_type_id",
        "iit.id"
      );

    console.log("Recipe ingredients:");
    for (const ing of recipeIngredients) {
      console.log(
        `Recipe Ingredient ${ing.id}: inventory_item_type_id=${ing.inventory_item_type_id}, ingredient_name="${ing.ingredient_name}", item_type_name="${ing.item_type_name}"`
      );
    }
  } catch (error) {
    console.error("Error checking inventory item types:", error);
  } finally {
    await db.destroy();
  }
}

// Run the check
checkInventoryItemTypes();
