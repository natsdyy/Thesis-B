require("dotenv").config();
const { db } = require("../config/database");

async function getBranchEmployeesDetails() {
  try {
    console.log("\n📋 BRANCH EMPLOYEES DETAILS");
    console.log("=".repeat(80));

    // Get all branches
    const branches = await db("branches")
      .where("is_active", true)
      .whereNull("deleted_at")
      .orderBy("id");

    if (branches.length === 0) {
      console.log("❌ No active branches found.");
      return;
    }

    let totalEmployees = 0;

    for (const branch of branches) {
      console.log(`\n🏢 BRANCH: ${branch.name.toUpperCase()}`);
      console.log(`   Code: ${branch.code}`);
      console.log(`   Address: ${branch.address || "N/A"}`);
      console.log("-".repeat(80));

      // Get all employees for this branch
      const employees = await db("employees as e")
        .leftJoin("user_roles as r", "e.role_id", "r.role_id")
        .select(
          "e.employee_id",
          "e.first_name",
          "e.last_name",
          "e.email",
          "e.phone_number",
          "e.department",
          "e.employee_type",
          "e.civil_status",
          "e.sex",
          "e.birthday",
          "e.age",
          "e.citizenship",
          "e.address",
          "e.postal_code",
          "e.pagibig_number",
          "e.sss_number",
          "e.philhealth_number",
          "e.emergency_contact_name",
          "e.emergency_relationship",
          "e.emergency_contact_number",
          "e.alternate_contact_number",
          "e.emergency_contact_address",
          "e.emergency_contact_email",
          "e.status",
          "r.role",
          "r.rate_per_hour"
        )
        .where("e.branch_id", branch.id)
        .whereNull("e.deleted_at")
        .orderBy("r.role_id");

      if (employees.length === 0) {
        console.log("   ⚠️  No employees assigned to this branch");
        continue;
      }

      totalEmployees += employees.length;

      employees.forEach((emp, index) => {
        console.log(`\n   ${index + 1}. ${emp.role.toUpperCase()}`);
        console.log(`   ${"─".repeat(76)}`);
        console.log(`   Employee ID      : ${emp.employee_id}`);
        console.log(`   Name             : ${emp.first_name} ${emp.last_name}`);
        console.log(`   Email            : ${emp.email}`);
        console.log(`   Password         : ${emp.last_name} (default)`);
        console.log(`   Phone            : ${emp.phone_number}`);
        console.log(`   Department       : ${emp.department}`);
        console.log(`   Employment Type  : ${emp.employee_type}`);
        console.log(`   Rate per Hour    : ₱${emp.rate_per_hour}`);
        console.log(`   Status           : ${emp.status}`);
        console.log();
        console.log(`   Personal Info:`);
        console.log(`   - Civil Status   : ${emp.civil_status}`);
        console.log(`   - Sex            : ${emp.sex}`);
        console.log(`   - Birthday       : ${emp.birthday}`);
        console.log(`   - Age            : ${emp.age}`);
        console.log(`   - Citizenship    : ${emp.citizenship}`);
        console.log(`   - Address        : ${emp.address}`);
        console.log(`   - Postal Code    : ${emp.postal_code}`);
        console.log();
        console.log(`   Government Benefits:`);
        console.log(`   - Pag-IBIG       : ${emp.pagibig_number}`);
        console.log(`   - SSS            : ${emp.sss_number}`);
        console.log(`   - PhilHealth     : ${emp.philhealth_number}`);
        console.log();
        console.log(`   Emergency Contact:`);
        console.log(`   - Name           : ${emp.emergency_contact_name}`);
        console.log(`   - Relationship   : ${emp.emergency_relationship}`);
        console.log(`   - Phone          : ${emp.emergency_contact_number}`);
        console.log(`   - Alternate      : ${emp.alternate_contact_number}`);
        console.log(`   - Address        : ${emp.emergency_contact_address}`);
        console.log(`   - Email          : ${emp.emergency_contact_email}`);
      });

      console.log();
    }

    console.log("\n" + "=".repeat(80));
    console.log(`📊 SUMMARY`);
    console.log(`   Total Branches   : ${branches.length}`);
    console.log(`   Total Employees  : ${totalEmployees}`);
    console.log(`   Average per Branch: ${(totalEmployees / branches.length).toFixed(1)}`);
    console.log("=".repeat(80));

    // Generate CSV export
    console.log("\n📄 Generating CSV export...");
    const allEmployees = await db("employees as e")
      .leftJoin("user_roles as r", "e.role_id", "r.role_id")
      .leftJoin("branches as b", "e.branch_id", "b.id")
      .select(
        "b.name as branch_name",
        "b.code as branch_code",
        "e.employee_id",
        "e.first_name",
        "e.last_name",
        "e.email",
        "r.role",
        "e.phone_number",
        "e.department",
        "e.employee_type",
        "r.rate_per_hour",
        "e.status"
      )
      .whereNotNull("e.branch_id")
      .whereNull("e.deleted_at")
      .orderBy("b.name")
      .orderBy("r.role_id");

    console.log("\n📋 LOGIN CREDENTIALS (CSV Format)");
    console.log("-".repeat(80));
    console.log(
      "Branch,Branch Code,Employee ID,Name,Role,Email,Password,Phone,Rate/Hr,Status"
    );
    allEmployees.forEach((emp) => {
      console.log(
        `"${emp.branch_name}","${emp.branch_code}","${emp.employee_id}","${emp.first_name} ${emp.last_name}","${emp.role}","${emp.email}","${emp.last_name}","${emp.phone_number}","₱${emp.rate_per_hour}","${emp.status}"`
      );
    });

    console.log("\n✅ Complete!");
  } catch (error) {
    console.error("❌ Error fetching branch employees:", error);
  } finally {
    db.destroy();
  }
}

if (require.main === module) {
  getBranchEmployeesDetails();
}

module.exports = { getBranchEmployeesDetails };


