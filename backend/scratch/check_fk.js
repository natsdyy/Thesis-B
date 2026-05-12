const { db } = require('../config/database');
async function checkFK() {
  try {
    const r = await db.raw("SELECT * FROM information_schema.key_column_usage WHERE table_name = 'attendance_records' AND column_name = 'user_id'");
    console.log(JSON.stringify(r.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
checkFK();
