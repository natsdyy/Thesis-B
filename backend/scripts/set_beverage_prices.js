const { db } = require("../config/database");

async function setBeveragePrices() {
  try {
    console.log("💰 Setting selling prices for beverage items...\n");

    // Define beverage prices (you can adjust these as needed)
    const beveragePrices = {
      "Coke in Can": 45.0,
      "Coke Mismo": 35.0,
      "Mineral Water / bottles": 20.0,
      "Sprite - 1.5": 50.0,
      Water: 15.0,
      "Coke - 1.5": 50.0,
      "Royal - 1.5": 50.0,
    };

    let updatedCount = 0;

    for (const [itemName, price] of Object.entries(beveragePrices)) {
      const result = await db("branch_inventory")
        .where("item_type", "scm")
        .where("category", "Beverages")
        .where("item_name", itemName)
        .whereNull("deleted_at")
        .update({
          selling_price: price,
          updated_at: db.fn.now(),
        });

      if (result > 0) {
        console.log(`✅ Updated ${itemName}: ₱${price}`);
        updatedCount += result;
      } else {
        console.log(`⚠️  No items found for ${itemName}`);
      }
    }

    console.log(
      `\n🎉 Successfully updated ${updatedCount} beverage items with selling prices!`
    );

    // Verify the updates
    console.log("\n📋 Verification - Updated beverage items:");
    const updatedItems = await db("branch_inventory")
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

    updatedItems.forEach((item) => {
      if (item.quantity > 0 && item.status === "active") {
        console.log(
          `   🥤 ${item.item_name} (Branch ${item.branch_id}): ₱${item.selling_price} - ${item.quantity} ${item.unit} available`
        );
      }
    });

    console.log(
      `\n✅ Total beverage items ready for POS: ${updatedItems.filter((item) => item.quantity > 0 && item.status === "active").length}`
    );
  } catch (error) {
    console.error("Error setting beverage prices:", error);
  } finally {
    await db.destroy();
  }
}

setBeveragePrices();
