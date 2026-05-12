/**
 * Legacy MySQL → PostgreSQL Data Import Script
 */

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const { db } = require("../config/database");

const SQL_FILE = path.join(__dirname, "..", "..", "countryside_db.sql");

const employeeIdToUserId = {};
const employeeIdToSerialId = {}; // Map string employee_id to serial id

function parseInserts(sql, tableName) {
  const regex = new RegExp(`INSERT INTO \`${tableName}\`\\s*\\(([^)]+)\\)\\s*VALUES\\s*([\\s\\S]*?);`, "gi");
  const results = [];
  let match;
  while ((match = regex.exec(sql)) !== null) {
    const columns = match[1].split(",").map(c => c.trim().replace(/`/g, ""));
    const valuesStr = match[2];
    const rows = splitValueRows(valuesStr);
    for (const row of rows) {
      const values = parseValueRow(row);
      if (values.length === columns.length) {
        const obj = {};
        columns.forEach((col, i) => { obj[col] = values[i]; });
        results.push(obj);
      }
    }
  }
  return results;
}

function splitValueRows(valuesStr) {
  const rows = [];
  let depth = 0, current = "", inString = false, escapeNext = false, stringChar = "";
  for (let i = 0; i < valuesStr.length; i++) {
    const ch = valuesStr[i];
    if (escapeNext) { current += ch; escapeNext = false; continue; }
    if (ch === "\\") { current += ch; escapeNext = true; continue; }
    if (inString) { current += ch; if (ch === stringChar) inString = false; continue; }
    if (ch === "'" || ch === '"') { inString = true; stringChar = ch; current += ch; continue; }
    if (ch === "(") { if (depth === 0) current = ""; depth++; }
    else if (ch === ")") { depth--; if (depth === 0) { rows.push(current); current = ""; } else { current += ch; } }
    else { if (depth > 0) current += ch; }
  }
  return rows;
}

function parseValueRow(row) {
  const values = [];
  let current = "", inString = false, escapeNext = false, stringChar = "";
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (escapeNext) { current += ch; escapeNext = false; continue; }
    if (ch === "\\" && inString) { current += ch; escapeNext = true; continue; }
    if (inString) {
      if (ch === stringChar) { if (i + 1 < row.length && row[i + 1] === stringChar) { current += ch; i++; continue; } inString = false; }
      else { current += ch; }
      continue;
    }
    if (ch === "'" || ch === '"') { inString = true; stringChar = ch; continue; }
    if (ch === ",") { values.push(parseSqlValue(current.trim())); current = ""; continue; }
    current += ch;
  }
  values.push(parseSqlValue(current.trim()));
  return values;
}

function parseSqlValue(val) {
  if (val === "NULL" || val === "null") return null;
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    return val.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"');
  }
  if (!isNaN(val) && val !== "") return Number(val);
  return val;
}

// ─── Import Functions ────────────────────────────────────────────────

async function importBranches(sql) {
  console.log("\n📦 Importing branches...");
  const data = parseInserts(sql, "branches");
  for (const row of data) {
    try {
      const existing = await db("branches").where("name", row.name).first();
      if (existing) continue;
      const code = row.name.split(" ")[0].toUpperCase().substring(0, 10);
      await db("branches").insert({
        name: row.name, code: code, address: row.address || "", phone: row.contact_number || "",
        is_active: row.is_active === 1 || row.is_active === "1",
        created_at: new Date(), updated_at: new Date(),
      });
      console.log(`  ✅ Imported branch: ${row.name}`);
    } catch (err) { console.error(`  ❌ Failed to import branch ${row.name}: ${err.message}`); }
  }
}

async function importUsers(sql) {
  console.log("\n🔑 Importing users...");
  const userData = parseInserts(sql, "users");
  const employeeData = parseInserts(sql, "employees");
  for (const user of userData) {
    try {
      const existing = await db("users").where("email", user.email).first();
      if (existing) { employeeIdToUserId[user.employee_id] = existing.id; continue; }
      const emp = employeeData.find(e => e.employee_id === user.employee_id);
      const name = emp ? `${emp.first_name} ${emp.last_name}` : user.email;
      const [idObj] = await db("users").insert({
        name: name, email: user.email, password: user.password, role_id: user.role_id || 1, is_active: true,
        created_at: user.created_at ? new Date(user.created_at) : new Date(), updated_at: new Date()
      }).returning("id");
      const id = typeof idObj === 'object' ? idObj.id : idObj;
      employeeIdToUserId[user.employee_id] = id;
      console.log(`  ✅ Imported user: ${user.email}`);
    } catch (err) { console.error(`  ❌ Failed to import user ${user.email}: ${err.message}`); }
  }
}

async function importEmployees(sql) {
  console.log("\n👥 Importing employees...");
  const employeeData = parseInserts(sql, "employees");
  const emergencyData = parseInserts(sql, "emergency_contacts");
  const deptMap = { "Admin Department": "Admin", "HR Department": "Human Resource", "Finance Department": "Finance", "Supply Chain Management": "SCM", "Production Department": "Production", "Customer Relationship Management": "CRM", "Branch Operation": "Branch", "Sales Department": "CRM", "IT Department": "Admin", IT: "Admin" };
  for (const emp of employeeData) {
    if (emp.deleted_at) continue;
    try {
      const existing = await db("employees").where("employee_id", emp.employee_id).first();
      if (existing) { employeeIdToSerialId[emp.employee_id] = existing.id; continue; }
      const emergency = emergencyData.find(e => e.employee_id === emp.employee_id);
      const sex = emp.gender === "Male" ? "Male" : "Female";
      const department = deptMap[emp.department] || "Admin";
      const dob = new Date(emp.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) age--;
      const roles = await db("user_roles").select("role_id", "role", "department");
      let roleId = null;
      if (emp.role_id === 1) { const superAdmin = roles.find(r => r.role === "Super Admin"); if (superAdmin) roleId = superAdmin.role_id; }
      else { const deptRoles = roles.filter(r => r.department === department); if (deptRoles.length > 0) roleId = deptRoles[0].role_id; }
      const userId = employeeIdToUserId[emp.employee_id];
      let password = null;
      if (userId) { const userRec = await db("users").where("id", userId).first(); password = userRec ? userRec.password : await bcrypt.hash("changeme123", 12); }
      else password = await bcrypt.hash("changeme123", 12);
      const [idObj] = await db("employees").insert({
        employee_id: emp.employee_id, first_name: emp.first_name, middle_name: emp.middle_name || null, last_name: emp.last_name, email: emp.email || null, password: password, phone_number: emp.contact_number || "0000000000", address: emp.address || "N/A", postal_code: "0000", civil_status: "Single", sex: sex, birthday: emp.date_of_birth || "2000-01-01", age: age || 25, citizenship: "Filipino", department: department, employee_type: "Full-time", role_id: roleId, pagibig_number: "000000000000", sss_number: "0000000000", philhealth_number: "000000000000", emergency_contact_name: emergency ? `${emergency.first_name || ""} ${emergency.last_name || ""}`.trim() : "Not Provided", emergency_relationship: emergency ? emergency.relationship || "Other" : "Other", emergency_contact_number: emergency ? emergency.contact_number || "0000000000" : "0000000000", emergency_contact_address: emergency ? "On File" : "N/A", status: "Active", is_active: true, created_at: emp.created_at ? new Date(emp.created_at) : new Date(), updated_at: new Date(),
      }).returning("id");
      const id = typeof idObj === 'object' ? idObj.id : idObj;
      employeeIdToSerialId[emp.employee_id] = id;
      console.log(`  ✅ Imported employee: ${emp.employee_id}`);
    } catch (err) { console.error(`  ❌ Failed to import employee ${emp.employee_id}: ${err.message}`); }
  }
}

async function importShiftTypes(sql) {
  console.log("\n⏰ Importing shift types...");
  const data = parseInserts(sql, "available_schedules");
  for (const row of data) {
    if (row.deleted_at) continue;
    try {
      const existing = await db("shift_types").where("name", row.type).first();
      if (existing) continue;
      await db("shift_types").insert({
        name: row.type, start_time: row.time_in || "08:00", end_time: row.time_out || "17:00",
        description: row.remarks || null, is_active: true, created_at: new Date(), updated_at: new Date(),
      });
      console.log(`  ✅ Imported shift type: ${row.type}`);
    } catch (err) { console.error(`  ❌ Failed to import shift type ${row.type}: ${err.message}`); }
  }
}

async function importInventory(sql) {
  console.log("\n📦 Importing inventory items...");
  const data = parseInserts(sql, "inventory");
  const itemTypes = await db("inventory_item_types").select("id", "name");
  const categoryMap = { "Food Ingredients": "Meat and Poultry", "Office Supplies": "Office Equipment", "Kitchen Equipment": "Kitchen Equipment", "Cleaning Supplies": "Cleaning Equipment", "Service Equipment": "Service Equipment", "Raw Materials": "Meat and Poultry", "Packaging Materials": "Other Materials", Others: "Other Materials" };
  for (const row of data) {
    if (row.deleted_at) continue;
    try {
      const existing = await db("inventory_items").where("item_name", row.item_name).whereNull("deleted_at").first();
      if (existing) continue;
      const targetTypeName = categoryMap[row.category] || "Other Materials";
      const itemType = itemTypes.find((t) => t.name === targetTypeName) || itemTypes[0];
      if (!itemType) continue;
      await db("inventory_items").insert({
        item_type_id: itemType.id, item_name: row.item_name, batch_number: row.item_code, quantity: row.quantity || 0, unit_of_measure: row.unit || "pc", unit_cost: 0, total_value: 0, status: "available", notes: row.description || null, received_by: "System", received_date: row.last_received ? new Date(row.last_received) : new Date(), created_at: row.created_at ? new Date(row.created_at) : new Date(), updated_at: row.updated_at ? new Date(row.updated_at) : new Date(),
      });
      console.log(`  ✅ Imported inventory: ${row.item_name}`);
    } catch (err) { console.error(`  ❌ Failed to import inventory ${row.item_name}: ${err.message}`); }
  }
}

async function importAttendance(sql) {
  console.log("\n📅 Importing attendance records...");
  const data = parseInserts(sql, "employee_attendance");
  let qrId = null;
  const existingQr = await db("attendance_qr_codes").where("qr_code", "LEGACY").first();
  if (existingQr) qrId = existingQr.id;
  else {
    const [q] = await db("attendance_qr_codes").insert({ qr_code: "LEGACY", location_name: "Legacy System", is_active: false }).returning("id");
    qrId = typeof q === 'object' ? q.id : q;
  }
  for (const row of data) {
    try {
      const userId = employeeIdToUserId[row.employee_id];
      if (!userId) continue;
      const date = row.date;
      const timeIn = row.start_time ? new Date(`${date} ${row.start_time}`) : null;
      const timeOut = row.end_time ? new Date(`${date} ${row.end_time}`) : null;
      await db("attendance_records").insert({
        user_id: userId, qr_code_id: qrId, time_in: timeIn, time_out: timeOut,
        status: row.status || (row.absent ? "absent" : "present"),
        hours_worked: row.hours_worked || 0, tardiness_minutes: row.late_minutes || 0,
        created_at: new Date(`${date} 00:00:00`), updated_at: new Date(`${date} 00:00:00`)
      });
    } catch (err) { console.error(`  ❌ Failed to import attendance record: ${err.message}`); }
  }
  console.log(`  📊 Imported ${data.length} attendance records`);
}

async function importLeaves(sql) {
  console.log("\n🍃 Importing leave requests...");
  const data = parseInserts(sql, "leaves");
  for (const row of data) {
    try {
      const serialId = employeeIdToSerialId[row.employee_id];
      if (!serialId) {
        console.log(`  ⏭️  Skipping leave for unknown employee: ${row.employee_id}`);
        continue;
      }
      await db("leave_requests").insert({
        employee_id: serialId, from_date: row.date_from, to_date: row.date_to,
        leave_type: row.type, reason: row.remarks || "Legacy import",
        status: row.status.toLowerCase() === 'pending' ? 'pending' : (row.status.toLowerCase() === 'approved' ? 'approved' : 'rejected'),
        created_at: row.created_at ? new Date(row.created_at) : new Date(),
        updated_at: row.updated_at ? new Date(row.updated_at) : new Date()
      });
    } catch (err) { console.error(`  ❌ Failed to import leave: ${err.message}`); }
  }
  console.log(`  📊 Imported ${data.length} leave requests`);
}

async function main() {
  console.log("🚀 Legacy MySQL → PostgreSQL Data Import");
  const sql = fs.readFileSync(SQL_FILE, "utf8");
  try {
    await importBranches(sql);
    await importUsers(sql);
    await importEmployees(sql);
    await importShiftTypes(sql);
    await importInventory(sql);
    await importAttendance(sql);
    await importLeaves(sql);
    console.log("\n🎉 Import completed!");
  } catch (err) { console.error("❌ Import failed:", err); }
  finally { await db.destroy(); process.exit(0); }
}
main();
