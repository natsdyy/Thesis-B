// Fix per-entry units for 'Other Materials' historical records
// - Cooking Oil -> liters
// - Egg -> cases
// - Others remain as-is (typically kg)

const { db } = require("../config/database");

async function run() {
  try {
    const targetType = await db("inventory_item_types")
      .select("id")
      .where({ name: "Other Materials" })
      .first();

    if (!targetType) {
      console.log("Item type 'Other Materials' not found. Nothing to update.");
      process.exit(0);
    }

    const typeId = targetType.id;

    const updatedCookingOil = await db("inventory_items")
      .where("item_type_id", typeId)
      .andWhereRaw("LOWER(item_name) LIKE ?", ["cooking oil%"])
      .update({ unit_of_measure: "liters", updated_at: db.fn.now() });

    const updatedEgg = await db("inventory_items")
      .where("item_type_id", typeId)
      .andWhereRaw("LOWER(item_name) LIKE ?", ["egg%"])
      .update({ unit_of_measure: "cases", updated_at: db.fn.now() });

    console.log(
      `Updated units -> Cooking Oil (liters): ${updatedCookingOil}, Egg (cases): ${updatedEgg}`
    );

    // Optional sanity: show a small sample after update
    const sample = await db("inventory_items as ii")
      .leftJoin("inventory_item_types as iit", "ii.item_type_id", "iit.id")
      .select("ii.id", "ii.item_name", "ii.unit_of_measure")
      .where("ii.item_type_id", typeId)
      .where(function () {
        this.whereRaw("LOWER(ii.item_name) LIKE ?", [
          "cooking oil%",
        ]).orWhereRaw("LOWER(ii.item_name) LIKE ?", ["egg%"]);
      })
      .orderBy("ii.id", "desc")
      .limit(10);

    console.table(sample);
  } catch (err) {
    console.error("Error fixing units:", err);
    process.exit(1);
  } finally {
    try {
      await db.destroy();
    } catch (_) {}
  }
}

run();
