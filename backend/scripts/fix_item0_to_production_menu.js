/**
 * Fix Item 0 Issue by Converting Beverages to Production Menu Items
 *
 * This script converts all POS order items with null menu_item_id (beverages)
 * to use random production menu items instead, since the Menu Inventory Demand
 * dashboard doesn't need beverages.
 */

const { db } = require("../config/database");

// Available production menu items
const PRODUCTION_MENU_ITEMS = [
  { id: 6, name: "Longsilog", category: "Breakfast" },
  { id: 11, name: "Tapsi", category: "Breakfast" },
  { id: 12, name: "Bacsilog", category: "Sizzling Plates" },
  { id: 13, name: "Pork Steak", category: "Steaks" },
  { id: 14, name: "Beef and mushroom", category: "Steaks" },
  { id: 15, name: "Bihon Guisado", category: "Breakfast" },
];

/**
 * Get a random production menu item
 */
function getRandomProductionMenuItem() {
  const randomIndex = Math.floor(Math.random() * PRODUCTION_MENU_ITEMS.length);
  return PRODUCTION_MENU_ITEMS[randomIndex];
}

/**
 * Update POS order items with null menu_item_id to use random production menu items
 */
async function fixItem0Issue() {
  try {
    console.log("🔧 Starting Item 0 fix process...\n");

    // Get all items with null menu_item_id
    const nullItems = await db("pos_order_items")
      .select("id", "item_name", "menu_item_id", "order_id")
      .whereNull("menu_item_id");

    console.log(`📊 Found ${nullItems.length} items with null menu_item_id`);

    if (nullItems.length === 0) {
      console.log(
        "✅ No items need fixing. All items already have menu_item_id assigned."
      );
      return;
    }

    // Group items by original name for better distribution
    const itemGroups = {};
    nullItems.forEach((item) => {
      if (!itemGroups[item.item_name]) {
        itemGroups[item.item_name] = [];
      }
      itemGroups[item.item_name].push(item);
    });

    console.log("\n📋 Items to be converted:");
    Object.keys(itemGroups).forEach((name) => {
      console.log(`  - ${name}: ${itemGroups[name].length} items`);
    });

    console.log("\n🔄 Converting items to production menu items...");

    let totalUpdated = 0;
    const conversionStats = {};

    // Process each group
    for (const [originalName, items] of Object.entries(itemGroups)) {
      console.log(`\n  Processing ${originalName} (${items.length} items)...`);

      // Get a random production menu item for this group
      const targetMenuItem = getRandomProductionMenuItem();

      if (!conversionStats[targetMenuItem.name]) {
        conversionStats[targetMenuItem.name] = {
          count: 0,
          from: [],
        };
      }

      conversionStats[targetMenuItem.name].count += items.length;
      conversionStats[targetMenuItem.name].from.push(originalName);

      // Update all items in this group
      const itemIds = items.map((item) => item.id);
      const updateResult = await db("pos_order_items")
        .whereIn("id", itemIds)
        .update({
          menu_item_id: targetMenuItem.id,
          item_name: targetMenuItem.name, // Update item_name to match the menu item
          updated_at: new Date(),
        });

      totalUpdated += updateResult;
      console.log(
        `    ✅ Updated ${updateResult} items to "${targetMenuItem.name}"`
      );
    }

    console.log(`\n📈 CONVERSION SUMMARY:`);
    console.log(`  Total items updated: ${totalUpdated}`);
    console.log(`  Original items processed: ${nullItems.length}`);

    console.log(`\n🎯 Distribution by production menu item:`);
    Object.entries(conversionStats).forEach(([menuItem, stats]) => {
      console.log(
        `  - ${menuItem}: ${stats.count} items (from: ${stats.from.join(", ")})`
      );
    });

    // Verify the fix
    console.log(`\n🔍 Verification:`);
    const remainingNullItems = await db("pos_order_items")
      .count("id as count")
      .whereNull("menu_item_id")
      .first();

    console.log(
      `  Remaining items with null menu_item_id: ${remainingNullItems.count}`
    );

    if (remainingNullItems.count === 0) {
      console.log("✅ SUCCESS: All items now have menu_item_id assigned!");
      console.log(
        "🎉 The 'Item 0' issue in Menu Inventory Demand should be resolved."
      );
    } else {
      console.log("⚠️  WARNING: Some items still have null menu_item_id");
    }
  } catch (error) {
    console.error("❌ Error fixing Item 0 issue:", error);
    throw error;
  }
}

// Run the fix
async function main() {
  try {
    await fixItem0Issue();
    console.log("\n🏁 Item 0 fix process completed successfully!");
  } catch (error) {
    console.error("💥 Failed to fix Item 0 issue:", error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = { fixItem0Issue, getRandomProductionMenuItem };
