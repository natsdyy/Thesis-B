const { db } = require("../config/database");

async function checkDocuments() {
  try {
    console.log("Checking test employees and their documents...\n");

    // Get all test employees
    const employees = await db("employees")
      .where("email", "LIKE", "test.onboarding.%")
      .whereNull("deleted_at")
      .select("id", "employee_id", "email", "onboarding_status")
      .orderBy("id", "desc");

    console.log(`Found ${employees.length} test employees:\n`);

    for (const emp of employees) {
      console.log(`Employee ID: ${emp.id} | Employee ID: ${emp.employee_id} | Email: ${emp.email}`);
      
      // Check documents
      const docs = await db("employee_documents")
        .where("employee_id", emp.id)
        .whereNull("deleted_at")
        .select("*")
        .orderBy("document_type");

      if (docs.length === 0) {
        console.log("  ❌ No documents found!");
      } else {
        console.log(`  ✅ Found ${docs.length} documents:`);
        docs.forEach(doc => {
          console.log(`    - ${doc.document_type}: ${doc.original_filename} (${doc.file_size} bytes)`);
        });
      }
      console.log("");
    }

    // Also check the submissions endpoint data structure
    console.log("\n=== Checking submissions endpoint data structure ===");
    const submissions = await db("employees as e")
      .leftJoin("branches as b", function() {
        this.on("e.branch_id", "=", "b.id").andOnNull("b.deleted_at");
      })
      .leftJoin("user_roles as ur", function() {
        this.on("e.role_id", "=", "ur.role_id").andOnNull("ur.deleted_at");
      })
      .whereNotNull("e.onboarding_status")
      .where("e.email", "LIKE", "test.onboarding.%")
      .whereNull("e.deleted_at")
      .select(
        "e.id",
        "e.employee_id",
        "e.email",
        "e.onboarding_status as status"
      )
      .orderBy("e.created_at", "desc")
      .limit(3);

    console.log("Submissions endpoint returns:");
    submissions.forEach(sub => {
      console.log(`  - id: ${sub.id}, employee_id: ${sub.employee_id}, email: ${sub.email}`);
    });

    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    await db.destroy();
    process.exit(1);
  }
}

checkDocuments();

