/*
  Maintenance script: Normalize performed_by in inventory_transactions

  - Replaces placeholders like "User 19" or "19" with the employee's full name
  - Looks up the employee in the employees table and constructs
    "first_name [middle_name] last_name" (fallback to email)

  Usage (from project root):
    node backend/scripts/update_performed_by_names.js
*/

const { db } = require("../config/database");

async function getEmployeeFullName(employeeId) {
  const emp = await db("employees")
    .select("first_name", "middle_name", "last_name", "email")
    .where({ id: employeeId })
    .first();
  if (!emp) return null;
  const parts = [emp.first_name, emp.middle_name, emp.last_name].filter(
    Boolean
  );
  return parts.join(" ") || emp.email || null;
}

function extractEmployeeId(performedBy) {
  if (!performedBy) return null;
  // "User 19" or "Employee 7"
  let match = String(performedBy).match(/\b(?:User|Employee)\s+(\d+)\b/i);
  if (match) return parseInt(match[1], 10);
  // Plain numeric string like "8"
  if (/^\d+$/.test(String(performedBy))) return parseInt(performedBy, 10);
  return null;
}

async function run() {
  const trx = await db.transaction();
  try {
    // Find candidates for performed_by normalization
    const candidates = await trx("inventory_transactions")
      .select("id", "performed_by")
      .where(function () {
        this.whereRaw("performed_by ~ ?", [
          "^(?:User|Employee)\\s+\\d+$",
        ]).orWhereRaw("performed_by ~ ?", ["^\\d+$"]);
      })
      .orderBy("id", "asc");

    let updated = 0;
    for (const row of candidates) {
      const employeeId = extractEmployeeId(row.performed_by);
      if (!employeeId) continue;
      const fullName = await getEmployeeFullName(employeeId);
      if (!fullName) continue;
      await trx("inventory_transactions").where({ id: row.id }).update({
        performed_by: fullName,
        updated_at: db.fn.now(),
      });
      updated += 1;
    }

    console.log(`Updated performed_by for ${updated} transaction(s).`);

    // Cleanup BATCH-[object Object] artifacts in reference_number and notes
    console.log(
      "Cleaning up malformed BATCH references in reference_number/notes..."
    );
    const cleanedRef = await trx("inventory_transactions")
      .whereNotNull("reference_number")
      .andWhere("reference_number", "like", "%[object Object]%")
      .update({
        reference_number: db.raw(
          "replace(reference_number, '[object Object]', 'UNKNOWN')"
        ),
        updated_at: db.fn.now(),
      });

    const cleanedNotes = await trx("inventory_transactions")
      .whereNotNull("notes")
      .andWhere("notes", "like", "%[object Object]%")
      .update({
        notes: db.raw("replace(notes, '[object Object]', 'UNKNOWN')"),
        updated_at: db.fn.now(),
      });

    await trx.commit();
    console.log(
      `Cleaned ${cleanedRef || 0} reference_number row(s) and ${cleanedNotes || 0} notes row(s).`
    );
    await db.destroy();
    process.exit(0);
  } catch (err) {
    await trx.rollback();
    console.error("Failed to update performed_by names:", err);
    await db.destroy();
    process.exit(1);
  }
}

if (require.main === module) {
  run();
}
