// backend/scripts/pruneMaterialsItemTypes.js
const { db } = require("../config/database");

async function run() {
  const MATERIALS_CATEGORY_ID = 5;
  const keepIds = [19, 20, 21, 22, 23, 24];

  try {
    console.log("Pruning Materials item types…");

    // Deactivate and soft-delete the rest (no status change)
    const updated = await db("inventory_item_types")
      .where("category_id", MATERIALS_CATEGORY_ID)
      .whereNotIn("id", keepIds)
      .update({
        is_active: false,
        deleted_at: new Date(), // remove this line if you don't want soft-delete
        updated_at: new Date(),
      });

    console.log(`Updated ${updated} item types.`);

    // Ensure the kept ones stay active and undeleted
    await db("inventory_item_types").whereIn("id", keepIds).update({
      is_active: true,
      deleted_at: null,
      updated_at: new Date(),
    });

    console.log("Ensured kept IDs remain active.");
    process.exit(0);
  } catch (err) {
    console.error("Error pruning Materials item types:", err);
    process.exit(1);
  }
}

run();
