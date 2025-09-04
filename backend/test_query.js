const knex = require("knex")({
  client: "postgresql",
  connection: {
    connectionString:
      "postgresql://postgres:oDzogKPrTrKDfIWTPpzATZihLCGtRRHo@yamanote.proxy.rlwy.net:35067/railway",
    ssl: { rejectUnauthorized: false },
  },
});

async function testRecipeIngredientsQuery() {
  try {
    console.log(
      "Testing the exact query from InventoryService with your table structure...\n"
    );

    // First, let's verify we can query the table directly
    console.log("1. Testing basic table access:");
    const basicQuery = await knex("recipe_ingredients")
      .select("id", "recipe_id", "inventory_item_id", "quantity_required")
      .limit(3);

    console.log("✅ Basic query successful!");
    console.log("Sample data:", basicQuery);

    console.log("\n2. Testing the exact InventoryService query structure:");

    // Now test the exact query structure from InventoryService
    const fullQuery = knex("recipe_ingredients as ri")
      .leftJoin("inventory_items as ii", "ri.inventory_item_id", "ii.id")
      .leftJoin("inventory_item_types as iit", "ii.item_type_id", "iit.id")
      .leftJoin("inventory_categories as ic", "iit.category_id", "ic.id")
      .select(
        "ri.id",
        "ri.recipe_id",
        "ri.inventory_item_id",
        "ri.quantity_required",
        "ri.unit",
        "ii.quantity as available_stock",
        "ii.item_name as inventory_item_name",
        "iit.unit_of_measure as inventory_unit",
        "ii.expiry_date",
        "ii.status as inventory_status",
        "iit.name as item_type_name",
        "iit.unit_of_measure as item_type_unit",
        "ic.name as category_name"
      )
      .where("ri.recipe_id", 2) // Test with a specific recipe_id
      .orderBy("ri.sequence_order");

    console.log("Generated SQL:", fullQuery.toSQL().sql);
    console.log("Bindings:", fullQuery.toSQL().bindings);

    const result = await fullQuery;
    console.log("✅ Full query successful!");
    console.log(`Found ${result.length} ingredients for recipe_id 2`);

    if (result.length > 0) {
      console.log("Sample result:", result[0]);
    }
  } catch (error) {
    console.error("❌ Query failed:", error.message);
    console.error("Error details:", error);
  } finally {
    await knex.destroy();
  }
}

testRecipeIngredientsQuery();
