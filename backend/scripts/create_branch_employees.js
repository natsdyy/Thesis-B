require("dotenv").config();
const Employee = require("../models/Employee");
const { db } = require("../config/database");

const BRANCH_ROLES = [
  {
    role_id: 15,
    role: "Cashier",
    department: "Branch",
    description: "Branch Cashier",
    rate_per_hour: "50.00",
  },
  {
    role_id: 13,
    role: "Cook",
    department: "Branch",
    description: "Branch Cook",
    rate_per_hour: "60.00",
  },
  {
    role_id: 14,
    role: "Kitchen Assistant",
    department: "Branch",
    description: "Branch Kitchen Assistant",
    rate_per_hour: "50.00",
  },
  {
    role_id: 12,
    role: "Manager",
    department: "Branch",
    description: "Branch Manager",
    rate_per_hour: "80.00",
  },
  {
    role_id: 16,
    role: "Waiter",
    department: "Branch",
    description: "Branch Waiter",
    rate_per_hour: "40.00",
  },
];

// Sample employee names for each role
const EMPLOYEE_NAMES = {
  Manager: [
    { first: "Carlos", last: "Mendoza" },
    { first: "Maria", last: "Garcia" },
    { first: "Antonio", last: "Lopez" },
    { first: "Patricia", last: "Martinez" },
    { first: "Miguel", last: "Rodriguez" },
  ],
  Cashier: [
    { first: "Ana", last: "Santos" },
    { first: "Juan", last: "Reyes" },
    { first: "Rosa", last: "Fernandez" },
    { first: "Pedro", last: "Gonzales" },
    { first: "Linda", last: "Cruz" },
  ],
  Cook: [
    { first: "Ramon", last: "Diaz" },
    { first: "Elena", last: "Hernandez" },
    { first: "Diego", last: "Torres" },
    { first: "Carmen", last: "Flores" },
    { first: "Ricardo", last: "Morales" },
  ],
  "Kitchen Assistant": [
    { first: "Jose", last: "Ramirez" },
    { first: "Sofia", last: "Gutierrez" },
    { first: "Luis", last: "Ortiz" },
    { first: "Isabella", last: "Ruiz" },
    { first: "Fernando", last: "Perez" },
  ],
  Waiter: [
    { first: "Gabriel", last: "Sanchez" },
    { first: "Valentina", last: "Rivera" },
    { first: "Daniel", last: "Gomez" },
    { first: "Camila", last: "Jimenez" },
    { first: "Javier", last: "Alvarez" },
  ],
};

async function createBranchEmployees() {
  try {
    console.log("\n🏗️  Creating branch employees...");

    // Get all active branches
    const branches = await db("branches")
      .where("is_active", true)
      .whereNull("deleted_at")
      .orderBy("id");

    if (branches.length === 0) {
      console.log("❌ No active branches found. Please create branches first.");
      return;
    }

    console.log(`📍 Found ${branches.length} active branch(es)`);
    console.log("=".repeat(60));

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const branch of branches) {
      console.log(`\n🏢 Processing Branch: ${branch.name} (ID: ${branch.id})`);
      console.log("-".repeat(60));

      // Check if this branch already has employees
      const existingEmployees = await db("employees")
        .where("branch_id", branch.id)
        .whereNull("deleted_at")
        .count("id as count")
        .first();

      const existingCount = parseInt(existingEmployees.count) || 0;

      if (existingCount > 0) {
        console.log(
          `ℹ️  Branch already has ${existingCount} employee(s). Skipping duplicate creation for existing roles...`
        );
      }

      for (let i = 0; i < BRANCH_ROLES.length; i++) {
        const roleData = BRANCH_ROLES[i];

        // Verify the role exists in the database
        const role = await db("user_roles")
          .where("role_id", roleData.role_id)
          .where("department", "Branch")
          .whereNull("deleted_at")
          .where("is_active", true)
          .first();

        if (!role) {
          console.log(
            `❌ Role ${roleData.role} (ID: ${roleData.role_id}) not found in database. Skipping...`
          );
          continue;
        }

        // Check if an employee with this role already exists for this branch
        const existingRoleEmployee = await db("employees")
          .where("branch_id", branch.id)
          .where("role_id", roleData.role_id)
          .whereNull("deleted_at")
          .first();

        if (existingRoleEmployee) {
          console.log(
            `  ⏭️  ${roleData.role} already exists for this branch: ${existingRoleEmployee.employee_id}`
          );
          totalSkipped++;
          continue;
        }

        // Get a name from the pool (cycle through names if more branches than names)
        const namePool = EMPLOYEE_NAMES[roleData.role];
        const nameIndex = (branches.indexOf(branch) + i) % namePool.length;
        const name = namePool[nameIndex];

        // Generate unique email
        const emailBase = `${name.first.toLowerCase()}.${name.last.toLowerCase()}`;
        let email = `${emailBase}@gmail.com`;
        let emailCounter = 1;

        // Ensure email is unique
        while (
          await Employee.findByEmail(email)
        ) {
          email = `${name.first.toLowerCase()}.${name.last.toLowerCase()}${emailCounter}@gmail.com`;
          emailCounter++;
        }

        // Generate unique government benefit numbers
        const timestamp = Date.now().toString().slice(-6);
        const branchCode = branch.code.replace(/[^A-Z0-9]/gi, "").toUpperCase();
        const roleCode = roleData.role
          .replace(/[^A-Z]/gi, "")
          .toUpperCase()
          .slice(0, 3);

        // Generate proper Philippine phone numbers
        const generatePhoneNumber = () => {
          // Generate 09XXXXXXXXX format
          const randomDigits = Math.floor(100000000 + Math.random() * 900000000);
          return `09${randomDigits}`;
        };

        const employeeData = {
          first_name: name.first,
          last_name: name.last,
          email: email,
          password: name.last, // Default password is last name
          phone_number: generatePhoneNumber(),
          address: branch.address || `${branch.name} Location`,
          postal_code: branch.postal_code || "1000",
          civil_status: Math.random() > 0.5 ? "Single" : "Married",
          sex: ["Male", "Female"][Math.floor(Math.random() * 2)],
          birthday: `19${85 + Math.floor(Math.random() * 15)}-${String(
            Math.floor(Math.random() * 12) + 1
          ).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
          age: 25 + Math.floor(Math.random() * 20),
          citizenship: "Filipino",
          department: "Branch",
          role_id: roleData.role_id,
          employee_type: "Full-time",
          branch_id: branch.id,
          pagibig_number: `${branchCode}-${roleCode}-PAG-${timestamp}`,
          sss_number: `${branchCode}-${roleCode}-SSS-${timestamp}`,
          philhealth_number: `${branchCode}-${roleCode}-PH-${timestamp}`,
          emergency_contact_name: `Emergency Contact ${name.last}`,
          emergency_relationship: Math.random() > 0.5 ? "Spouse" : "Parent",
          emergency_contact_number: generatePhoneNumber(),
          alternate_contact_number: generatePhoneNumber(),
          emergency_contact_address: branch.address || `${branch.name} Location`,
          emergency_contact_email: `emergency.${emailBase}@gmail.com`,
        };

        try {
          const employee = await Employee.create(employeeData);
          console.log(
            `  ✅ Created ${roleData.role}: ${employee.employee_id} (${email})`
          );
          console.log(`     Password: ${name.last}`);
          totalCreated++;
        } catch (error) {
          console.error(
            `  ❌ Failed to create ${roleData.role}: ${error.message}`
          );
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("🎉 Branch employees creation completed!");
    console.log(`✅ Created: ${totalCreated} employee(s)`);
    console.log(`⏭️  Skipped: ${totalSkipped} employee(s) (already exist)`);

    if (totalCreated > 0) {
      console.log("\n📝 Note: Default password for all employees is their last name");
      console.log("Example logins created:");
      
      // Show a few example logins
      const sampleEmployees = await db("employees")
        .select("employee_id", "first_name", "last_name", "email", "role_id")
        .whereNotNull("branch_id")
        .whereNull("deleted_at")
        .orderBy("created_at", "desc")
        .limit(5);

      for (const emp of sampleEmployees) {
        const role = await db("user_roles")
          .where("role_id", emp.role_id)
          .first();
        console.log(
          `  - ${role?.role || "Unknown"}: ${emp.email} / ${emp.last_name}`
        );
      }
    }
  } catch (error) {
    console.error("❌ Error creating branch employees:", error);
  } finally {
    db.destroy();
  }
}

if (require.main === module) {
  createBranchEmployees();
}

module.exports = { createBranchEmployees };

