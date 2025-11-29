const { db } = require("../config/database");

async function debugBeverageSellingPrices() {
  try {
    console.log(
      "🔍 Debugging Beverage Selling Prices in Branch Inventory...\n"
    );

    // Check the actual data in branch_inventory table
    const beverageItems = await db("branch_inventory")
      .where("item_type", "scm")
      .where("category", "Beverages")
      .whereNull("deleted_at")
      .select(
        "id",
        "item_name",
        "branch_id",
        "selling_price",
        "unit_cost",
        "quantity",
        "unit",
        "status",
        "created_at",
        "updated_at"
      )
      .orderBy("item_name");

    console.log(
      `Found ${beverageItems.length} beverage items in branch_inventory:\n`
    );

    beverageItems.forEach((item) => {
      console.log(`📦 ${item.item_name} (Branch ${item.branch_id}):`);
      console.log(`   - ID: ${item.id}`);
      console.log(
        `   - Selling Price: ${item.selling_price} (${typeof item.selling_price})`
      );
      console.log(`   - Unit Cost: ${item.unit_cost}`);
      console.log(`   - Quantity: ${item.quantity} ${item.unit}`);
      console.log(`   - Status: ${item.status}`);
      console.log(`   - Created: ${item.created_at}`);
      console.log(`   - Updated: ${item.updated_at}`);
      console.log("");
    });

    // Check if there are any recent distributions
    console.log("🔍 Checking recent branch distributions...\n");

    const recentDistributions = await db("branch_distributions")
      .where("branch_id", 7) // Check branch 7 specifically
      .orderBy("created_at", "desc")
      .limit(5)
      .select("id", "reference", "status", "created_at", "prepared_by");

    console.log(
      `Found ${recentDistributions.length} recent distributions for branch 7:`
    );
    recentDistributions.forEach((dist) => {
      console.log(
        `   - ${dist.reference}: ${dist.status} (${dist.created_at}) by ${dist.prepared_by}`
      );
    });

    // Check distribution items
    if (recentDistributions.length > 0) {
      const latestDistId = recentDistributions[0].id;
      console.log(
        `\n🔍 Checking items in latest distribution (ID: ${latestDistId}):`
      );

      const distributionItems = await db("branch_distribution_items")
        .where("distribution_id", latestDistId)
        .select(
          "id",
          "name",
          "source",
          "category",
          "qty",
          "unit_price",
          "amount"
        );

      distributionItems.forEach((item) => {
        console.log(
          `   - ${item.name} (${item.source}): ${item.qty} @ ₱${item.unit_price}`
        );
      });
    }

    // Check if the issue is in the acceptance process
    console.log("\n🔍 Checking if distributions were accepted...");
    const acceptedDistributions = await db("branch_distributions")
      .where("branch_id", 7)
      .where("status", "delivered")
      .orderBy("created_at", "desc")
      .limit(3)
      .select("id", "reference", "status", "created_at");

    console.log(
      `Found ${acceptedDistributions.length} accepted distributions:`
    );
    acceptedDistributions.forEach((dist) => {
      console.log(
        `   - ${dist.reference}: ${dist.status} (${dist.created_at})`
      );
    });
  } catch (error) {
    console.error("Error debugging beverage selling prices:", error);
  } finally {
    await db.destroy();
  }
}

debugBeverageSellingPrices();
