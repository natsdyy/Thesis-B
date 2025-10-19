require("dotenv").config();
const { db } = require("../config/database");

async function updateBranchEmployeeEmails() {
  try {
    console.log("\n🔄 Updating Branch Employee Emails");
    console.log("=".repeat(80));
    console.log("Changing format from: firstname.lastname.branchcode@branch.com");
    console.log("               to: firstname.lastname@gmail.com");
    console.log("=".repeat(80));

    // Get all branch employees with the old email format
    const employees = await db("employees")
      .whereNotNull("branch_id")
      .whereNull("deleted_at")
      .where("email", "like", "%@branch.com")
      .select("id", "employee_id", "first_name", "last_name", "email");

    if (employees.length === 0) {
      console.log("\n✅ No employees found with @branch.com emails. All emails are up to date!");
      return;
    }

    console.log(`\n📋 Found ${employees.length} employee(s) to update\n`);

    let successCount = 0;
    let errorCount = 0;
    const updates = [];

    for (const emp of employees) {
      const oldEmail = emp.email;
      const newEmail = `${emp.first_name.toLowerCase()}.${emp.last_name.toLowerCase()}@gmail.com`;

      // Check if the new email already exists (to avoid duplicates)
      const existingEmail = await db("employees")
        .where("email", newEmail)
        .whereNot("id", emp.id)
        .whereNull("deleted_at")
        .first();

      if (existingEmail) {
        console.log(`  ⚠️  SKIP - ${emp.employee_id} (${emp.first_name} ${emp.last_name})`);
        console.log(`     Old: ${oldEmail}`);
        console.log(`     New: ${newEmail} (already exists as ${existingEmail.employee_id})`);
        console.log();
        errorCount++;
        continue;
      }

      try {
        // Update the email
        await db("employees")
          .where("id", emp.id)
          .update({
            email: newEmail,
            updated_at: new Date(),
          });

        console.log(`  ✅ ${emp.employee_id} - ${emp.first_name} ${emp.last_name}`);
        console.log(`     Old: ${oldEmail}`);
        console.log(`     New: ${newEmail}`);
        console.log();

        updates.push({
          employee_id: emp.employee_id,
          name: `${emp.first_name} ${emp.last_name}`,
          old_email: oldEmail,
          new_email: newEmail,
        });

        successCount++;
      } catch (error) {
        console.log(`  ❌ ERROR - ${emp.employee_id} (${emp.first_name} ${emp.last_name})`);
        console.log(`     ${error.message}`);
        console.log();
        errorCount++;
      }
    }

    console.log("=".repeat(80));
    console.log("📊 UPDATE SUMMARY");
    console.log("=".repeat(80));
    console.log(`✅ Successfully updated: ${successCount}`);
    console.log(`❌ Errors/Skipped: ${errorCount}`);
    console.log(`📧 Total processed: ${employees.length}`);

    if (updates.length > 0) {
      console.log("\n📋 UPDATED EMAIL CREDENTIALS");
      console.log("-".repeat(80));
      console.log("Employee ID | Name                    | New Email");
      console.log("-".repeat(80));
      updates.forEach((u) => {
        console.log(
          `${u.employee_id.padEnd(12)} | ${u.name.padEnd(24)} | ${u.new_email}`
        );
      });
    }

    console.log("\n✅ Email update completed!");
  } catch (error) {
    console.error("❌ Error updating branch employee emails:", error);
  } finally {
    db.destroy();
  }
}

if (require.main === module) {
  updateBranchEmployeeEmails();
}

module.exports = { updateBranchEmployeeEmails };


