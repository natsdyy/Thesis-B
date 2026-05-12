const { db } = require('../config/database');
async function listTables() {
  try {
    const r = await db.raw("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log(r.rows.map(x => x.table_name).join(', '));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
listTables();
