const { db } = require("../config/database");

async function checkInventoryItems() {
  try {
    console.log("Checking inventory items...\n");

    // Get all inventory items
    const items = await db("inventory_items as ii")
      .select(
        "ii.id",
        "ii.item_name",
        "ii.item_type_id",
        "ii.quantity",
        "ii.status",
        "iit.name as item_type_name"
      )
      .join("inventory_item_types as iit", "ii.item_type_id", "iit.id")
      .orderBy("ii.item_type_id", "asc");

    console.log("All inventory items:");
    console.log(
      "ID | Item Name | Item Type ID | Item Type Name | Quantity | Status"
    );
    console.log(
      "---|-----------|--------------|----------------|----------|--------"
    );

    for (const item of items) {
      console.log(
        `${item.id.toString().padStart(2)} | ${item.item_name.padEnd(15)} | ${item.item_type_id.toString().padStart(13)} | ${item.item_type_name.padEnd(16)} | ${item.quantity.toString().padStart(8)} | ${item.status}`
      );
    }

    console.log("\nChecking what the frontend should see...");
    const frontendItems = await db("inventory_items as ii")
      .select(
        "ii.id",
        "ii.item_name",
        "ii.item_type_id",
        "ii.quantity",
        "ii.unit_cost",
        "ic.name as category_name"
      )
      .join("inventory_item_types as iit", "ii.item_type_id", "iit.id")
      .join("inventory_categories as ic", "iit.category_id", "ic.id")
      .where("ii.status", "available")
      .where("ii.quantity", ">", 0)
      .orderBy("ic.name", "asc");

    console.log("\nItems the frontend should see (available with stock > 0):");
    for (const item of frontendItems) {
      console.log(
        `ID: ${item.id}, Name: "${item.item_name}", Type ID: ${item.item_type_id}, Category: ${item.category_name}, Stock: ${item.quantity}, Cost: ${item.unit_cost}`
      );
    }
  } catch (error) {
    console.error("Error checking inventory items:", error);
  } finally {
    await db.destroy();
  }
}

// Run the check
checkInventoryItems();
