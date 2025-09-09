require("dotenv").config();
const Employee = require("../models/Employee");
const { db } = require("../config/database");

async function createDefaultEmployees() {
  try {
    console.log("\n🏗️  Creating default employees...");

    // Check if Super Admin already exists
    const existingSuperAdmin = await Employee.findByEmail("admin@gmail.com");
    if (existingSuperAdmin) {
      console.log("✅ Super Admin already exists");
    } else {
      // Get Super Admin role
      const superAdminRole = await db("user_roles")
        .where("role", "Super Admin")
        .where("department", "System")
        .first();

      if (!superAdminRole) {
        throw new Error(
          "Super Admin role not found. Please run migrations first."
        );
      }

      // Create Super Admin
      const superAdminData = {
        first_name: "Super",
        last_name: "Admin",
        email: "admin@gmail.com",
        password: "admin123", // Custom password for super admin
        phone_number: "+63 912 345 6789",
        address: "System Administrator",
        postal_code: "1000",
        civil_status: "Single",
        sex: "Male",
        birthday: "1990-01-01",
        age: 34,
        citizenship: "Filipino",
        department: "System",
        role_id: superAdminRole.role_id,
        employee_type: "Full-time",
        pagibig_number: "SUPER-ADMIN-001",
        sss_number: "SUPER-ADMIN-001",
        philhealth_number: "SUPER-ADMIN-001",
        emergency_contact_name: "System Administrator",
        emergency_relationship: "Self",
        emergency_contact_number: "+63 912 345 6789",
        alternate_contact_number: "+63 912 345 6789",
        emergency_contact_address: "System Administrator",
        emergency_contact_email: "admin@gmail.com",
      };

      const superAdmin = await Employee.create(superAdminData);
      console.log(`✅ Created Super Admin: ${superAdmin.employee_id}`);
    }

    // Create sample department managers with default passwords (last name)
    const sampleEmployees = [
      {
        first_name: "Maria",
        last_name: "Santos", // Password will be 'Santos'
        email: "maria.santos@company.com",
        phone_number: "+63 912 345 6790",
        address: "123 HR Street, Manila",
        postal_code: "1000",
        civil_status: "Married",
        sex: "Female",
        birthday: "1985-03-15",
        age: 39,
        citizenship: "Filipino",
        department: "Human Resource",
        employee_type: "Full-time",
        pagibig_number: "HR-001-2024",
        sss_number: "HR-001-2024",
        philhealth_number: "HR-001-2024",
        emergency_contact_name: "Juan Santos",
        emergency_relationship: "Spouse",
        emergency_contact_number: "+63 912 345 6791",
        alternate_contact_number: "+63 912 345 6791",
        emergency_contact_address: "123 HR Street, Manila",
        emergency_contact_email: "juan.santos@email.com",
        role: "Manager",
      },
      {
        first_name: "Roberto",
        last_name: "Cruz", // Password will be 'Cruz'
        email: "roberto.cruz@company.com",
        phone_number: "+63 912 345 6792",
        address: "456 Finance Ave, Makati",
        postal_code: "1200",
        civil_status: "Single",
        sex: "Male",
        birthday: "1988-07-20",
        age: 36,
        citizenship: "Filipino",
        department: "Finance",
        employee_type: "Full-time",
        pagibig_number: "FIN-001-2024",
        sss_number: "FIN-001-2024",
        philhealth_number: "FIN-001-2024",
        emergency_contact_name: "Ana Cruz",
        emergency_relationship: "Sister",
        emergency_contact_number: "+63 912 345 6793",
        alternate_contact_number: "+63 912 345 6793",
        emergency_contact_address: "456 Finance Ave, Makati",
        emergency_contact_email: "ana.cruz@email.com",
        role: "Manager",
      },
      {
        first_name: "Elena",
        last_name: "Reyes", // Password will be 'Reyes'
        email: "elena.reyes@company.com",
        phone_number: "+63 912 345 6794",
        address: "789 SCM Road, Quezon City",
        postal_code: "1100",
        civil_status: "Married",
        sex: "Female",
        birthday: "1990-11-10",
        age: 34,
        citizenship: "Filipino",
        department: "SCM",
        employee_type: "Full-time",
        pagibig_number: "SCM-001-2024",
        sss_number: "SCM-001-2024",
        philhealth_number: "SCM-001-2024",
        emergency_contact_name: "Carlos Reyes",
        emergency_relationship: "Spouse",
        emergency_contact_number: "+63 912 345 6795",
        alternate_contact_number: "+63 912 345 6795",
        emergency_contact_address: "789 SCM Road, Quezon City",
        emergency_contact_email: "carlos.reyes@email.com",
        role: "Manager",
      },
    ];

    for (const employeeData of sampleEmployees) {
      const existingEmployee = await Employee.findByEmail(employeeData.email);
      if (existingEmployee) {
        console.log(`✅ Employee ${employeeData.email} already exists`);
        continue;
      }

      // Get the role for the department
      const role = await db("user_roles")
        .where("role", employeeData.role)
        .where("department", employeeData.department)
        .first();

      if (!role) {
        console.log(
          `❌ Role ${employeeData.role} not found for ${employeeData.department} department`
        );
        continue;
      }

      employeeData.role_id = role.role_id;
      delete employeeData.role; // Remove the role property as we now have role_id

      const employee = await Employee.create(employeeData);
      console.log(
        `✅ Created ${employeeData.department} Manager: ${employee.employee_id} (${employeeData.email})`
      );
      console.log(`   Default password: ${employeeData.last_name}`);
    }

    console.log("\n🎉 Default employees created successfully!");
    console.log("\n📝 Login credentials:");
    console.log("Super Admin: admin@gmail.com / admin123");
    console.log("HR Manager: maria.santos@company.com / Santos");
    console.log("Finance Manager: roberto.cruz@company.com / Cruz");
    console.log("SCM Manager: elena.reyes@company.com / Reyes");
  } catch (error) {
    console.error("❌ Error creating default employees:", error);
  } finally {
    db.destroy();
  }
}

if (require.main === module) {
  createDefaultEmployees();
}

module.exports = { createDefaultEmployees };
