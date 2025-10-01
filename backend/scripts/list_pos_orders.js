/*
  Usage:
    node backend/scripts/list_pos_orders.js                # default limit 100
    node backend/scripts/list_pos_orders.js 50             # custom limit 50
    node backend/scripts/list_pos_orders.js 100 200        # limit 100, offset 200
*/

const { db, testConnection } = require("../config/database");

async function main() {
  try {
    await testConnection();

    const argLimit = Number(process.argv[2]);
    const argOffset = Number(process.argv[3]);

    const limit = Number.isFinite(argLimit) && argLimit > 0 ? argLimit : 100;
    const offset = Number.isFinite(argOffset) && argOffset >= 0 ? argOffset : 0;

    console.log(
      `\nFetching pos_sales_orders (limit=${limit}, offset=${offset})...`
    );

    const rows = await db("pos_sales_orders")
      .select("*")
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);

    console.log(`\nTotal fetched: ${rows.length}`);
    if (rows.length === 0) {
      console.log("No rows found.");
    } else {
      // Print as pretty JSON
      console.log(JSON.stringify(rows, null, 2));
    }
  } catch (err) {
    console.error("Error listing POS sales orders:", err.message || err);
    process.exitCode = 1;
  } finally {
    try {
      await db.destroy();
    } catch (_) {}
  }
}

main();
