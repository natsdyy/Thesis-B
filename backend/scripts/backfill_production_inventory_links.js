/*
  Backfill production_inventory.inventory_item_id by matching inventory_items
  to the production item's linked menu item name.

  Strategy:
  - Join production_inventory -> menu_items to get menu_item_name
  - Find the most recent inventory_items row whose item_name ilike menu_item_name
  - Update production_inventory.inventory_item_id with that id
*/
const { db } = require("../config/database");

async function backfill() {
  console.log("Starting backfill of production_inventory.inventory_item_id");
  const rows = await db("production_inventory as pi")
    .leftJoin("menu_items as mi", "pi.menu_item_id", "mi.id")
    .select("pi.id as pi_id", "pi.inventory_item_id", "mi.menu_item_name")
    .whereNull("pi.inventory_item_id")
    .limit(500);

  let updated = 0;
  for (const row of rows) {
    if (!row.menu_item_name) continue;
    const inv = await db("inventory_items")
      .whereILike("item_name", row.menu_item_name)
      .orderBy("received_date", "desc")
      .first("id");
    if (inv && inv.id) {
      await db("production_inventory")
        .where("id", row.pi_id)
        .update({ inventory_item_id: inv.id, updated_at: db.fn.now() });
      updated++;
    }
  }
  console.log(`Backfill complete. Linked ${updated} rows.`);
  process.exit(0);
}

backfill().catch((e) => {
  console.error("Backfill failed:", e);
  process.exit(1);
});
