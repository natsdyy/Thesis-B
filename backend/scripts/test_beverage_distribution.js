const { db } = require("../config/database");
const BranchDistribution = require("../models/BranchDistribution");

async function testBeverageDistribution() {
  try {
    console.log(
      "🧪 Testing Beverage Distribution with Automatic Selling Price Setting...\n"
    );

    // Test data for distributing beverages to a new branch
    const testDistributionData = {
      branch_id: 8, // Test with a different branch
      prepared_by: "Test User",
      total_amount: 250.0,
      notes: "Test distribution for beverage selling price automation",
      items: [
        {
          source: "scm",
          item_ref_id: 74, // Mineral Water ID (you may need to adjust this)
          name: "Mineral Water / bottles",
          qty: 50,
          unit: "bottles",
          unit_price: 20.0, // Transfer price
          amount: 1000.0,
          category: "Beverages",
          expiry_date: null,
        },
        {
          source: "scm",
          item_ref_id: 72, // Coke Mismo ID (you may need to adjust this)
          name: "Coke Mismo",
          qty: 30,
          unit: "bottles",
          unit_price: 35.0, // Transfer price
          amount: 1050.0,
          category: "Beverages",
          expiry_date: null,
        },
      ],
    };

    console.log("📦 Creating test distribution...");
    console.log("Items to distribute:");
    testDistributionData.items.forEach((item) => {
      console.log(
        `   - ${item.name}: ${item.qty} ${item.unit} @ ₱${item.unit_price} (Transfer Price)`
      );
    });
    console.log("");

    // Create the distribution
    const distribution = await BranchDistribution.create(testDistributionData);
    console.log(`✅ Distribution created with ID: ${distribution.id}`);

    // Accept the distribution to trigger the selling price setting
    console.log(
      "\n✅ Accepting distribution to trigger selling price setting..."
    );
    const acceptData = {
      action: "accept",
      accepted_items: distribution.items.map((item) => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        unit_price: item.unit_price,
        amount: item.amount,
        source: item.source,
        category: item.category,
      })),
    };

    const result = await BranchDistribution.partialAcceptReject(
      distribution.id,
      acceptData
    );
    console.log("✅ Distribution accepted successfully!");

    // Check if selling prices were set correctly
    console.log("\n🔍 Checking if selling prices were set correctly...");
    const branchInventory = await db("branch_inventory")
      .where("branch_id", testDistributionData.branch_id)
      .where("item_type", "scm")
      .where("category", "Beverages")
      .whereNull("deleted_at")
      .select("item_name", "selling_price", "unit_cost", "quantity", "unit");

    console.log("\n📋 Branch Inventory Results:");
    branchInventory.forEach((item) => {
      console.log(`   🥤 ${item.item_name}:`);
      console.log(`      - Selling Price: ₱${item.selling_price || "NOT SET"}`);
      console.log(`      - Unit Cost: ₱${item.unit_cost}`);
      console.log(`      - Quantity: ${item.quantity} ${item.unit}`);

      if (item.selling_price) {
        console.log(
          `      ✅ Selling price automatically set from transfer price!`
        );
      } else {
        console.log(`      ❌ Selling price NOT set!`);
      }
      console.log("");
    });

    console.log(
      "🎉 Test completed! Check if selling prices were automatically set from transfer prices."
    );
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack trace:", error.stack);
  } finally {
    await db.destroy();
  }
}

testBeverageDistribution();
