const { db } = require("../config/database");

async function updateExistingBeverageSellingPrices() {
  try {
    console.log(
      "💰 Updating Selling Prices for Existing SCM Beverage Items...\n"
    );

    // Get all SCM beverage items without selling prices
    const beverageItemsWithoutPrices = await db("branch_inventory")
      .where("item_type", "scm")
      .where("category", "Beverages")
      .whereNull("selling_price")
      .whereNull("deleted_at")
      .select("id", "item_name", "unit_cost", "branch_id", "quantity", "unit");

    console.log(
      `Found ${beverageItemsWithoutPrices.length} beverage items without selling prices\n`
    );

    if (beverageItemsWithoutPrices.length === 0) {
      console.log("✅ All beverage items already have selling prices set!");
      return;
    }

    // Define standard beverage prices (you can adjust these)
    const standardBeveragePrices = {
      "Coke in Can": 45.0,
      "Coke Mismo": 35.0,
      "Mineral Water / bottles": 20.0,
      "Sprite - 1.5": 50.0,
      Water: 15.0,
      "Coke - 1.5": 50.0,
      "Royal - 1.5": 50.0,
    };

    let updatedCount = 0;

    for (const item of beverageItemsWithoutPrices) {
      // Try to get standard price, fallback to unit_cost, or use a default
      let sellingPrice =
        standardBeveragePrices[item.item_name] || item.unit_cost || 25.0;

      const result = await db("branch_inventory").where("id", item.id).update({
        selling_price: sellingPrice,
        updated_at: db.fn.now(),
      });

      if (result > 0) {
        console.log(
          `✅ Updated ${item.item_name} (Branch ${item.branch_id}): ₱${sellingPrice}`
        );
        updatedCount++;
      }
    }

    console.log(
      `\n🎉 Successfully updated ${updatedCount} beverage items with selling prices!`
    );

    // Verify the updates
    console.log(
      "\n📋 Verification - All beverage items now have selling prices:"
    );
    const allBeverageItems = await db("branch_inventory")
      .where("item_type", "scm")
      .where("category", "Beverages")
      .whereNotNull("selling_price")
      .where("selling_price", ">", 0)
      .whereNull("deleted_at")
      .select(
        "item_name",
        "branch_id",
        "quantity",
        "selling_price",
        "unit",
        "status"
      )
      .orderBy("item_name");

    allBeverageItems.forEach((item) => {
      if (item.quantity > 0 && item.status === "active") {
        console.log(
          `   🥤 ${item.item_name} (Branch ${item.branch_id}): ₱${item.selling_price} - ${item.quantity} ${item.unit} available`
        );
      }
    });

    console.log(
      `\n✅ Total beverage items ready for POS: ${allBeverageItems.filter((item) => item.quantity > 0 && item.status === "active").length}`
    );
  } catch (error) {
    console.error("Error updating beverage selling prices:", error);
  } finally {
    await db.destroy();
  }
}

updateExistingBeverageSellingPrices();
