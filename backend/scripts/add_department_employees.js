const axios = require("axios");

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "your-admin-token-here"; // You'll need to get this from a logged-in admin user

// Department and role mappings
const departmentRoles = {
  "Human Resource": [
    { role_id: 2, role: "Manager", department: "Human Resource" },
    { role_id: 3, role: "Staff", department: "Human Resource" },
  ],
  SCM: [
    { role_id: 6, role: "Manager", department: "SCM" },
    { role_id: 7, role: "Staff", department: "SCM" },
  ],
  CRM: [
    { role_id: 10, role: "Manager", department: "CRM" },
    { role_id: 11, role: "Staff", department: "CRM" },
  ],
  Finance: [
    { role_id: 4, role: "Manager", department: "Finance" },
    { role_id: 5, role: "Staff", department: "Finance" },
  ],
  Production: [
    { role_id: 8, role: "Manager", department: "Production" },
    { role_id: 9, role: "Staff", department: "Production" },
  ],
};

// Sample employee data for each department
const employeeData = {
  "Human Resource": [
    {
      first_name: "Sarah",
      last_name: "Johnson",
      middle_name: "Marie",
      email: "sarah.johnson@countryside.com",
      phone_number: "09171234567",
      address: "123 Main Street, Quezon City, Metro Manila",
      postal_code: "1100",
      civil_status: "Single",
      sex: "Female",
      birthday: "1990-05-15",
      age: "34",
      citizenship: "Filipino",
      department: "Human Resource",
      role_id: 2, // Manager
      employee_type: "Full-time",
      branch_id: null, // Department employees don't have branch assignments
      pagibig_number: "1234-5678-9012",
      sss_number: "12-3456789-0",
      philhealth_number: "12-345678901-2",
      emergency_contact_name: "John Johnson",
      emergency_relationship: "Father",
      emergency_contact_number: "09172345678",
      alternate_contact_number: "09173456789",
      emergency_contact_address: "123 Main Street, Quezon City, Metro Manila",
      emergency_contact_email: "john.johnson@email.com",
    },
    {
      first_name: "Michael",
      last_name: "Rodriguez",
      middle_name: "Antonio",
      email: "michael.rodriguez@countryside.com",
      phone_number: "09174567890",
      address: "456 Oak Avenue, Makati City, Metro Manila",
      postal_code: "1200",
      civil_status: "Married",
      sex: "Male",
      birthday: "1988-08-22",
      age: "36",
      citizenship: "Filipino",
      department: "Human Resource",
      role_id: 3, // Staff
      employee_type: "Full-time",
      branch_id: null,
      pagibig_number: "2345-6789-0123",
      sss_number: "23-4567890-1",
      philhealth_number: "23-456789012-3",
      emergency_contact_name: "Maria Rodriguez",
      emergency_relationship: "Wife",
      emergency_contact_number: "09175678901",
      alternate_contact_number: "09176789012",
      emergency_contact_address: "456 Oak Avenue, Makati City, Metro Manila",
      emergency_contact_email: "maria.rodriguez@email.com",
    },
  ],
  SCM: [
    {
      first_name: "David",
      last_name: "Chen",
      middle_name: "Wei",
      email: "david.chen@countryside.com",
      phone_number: "09177890123",
      address: "789 Pine Street, Taguig City, Metro Manila",
      postal_code: "1630",
      civil_status: "Single",
      sex: "Male",
      birthday: "1985-12-10",
      age: "39",
      citizenship: "Filipino",
      department: "SCM",
      role_id: 6, // Manager
      employee_type: "Full-time",
      branch_id: null,
      pagibig_number: "3456-7890-1234",
      sss_number: "34-5678901-2",
      philhealth_number: "34-567890123-4",
      emergency_contact_name: "Linda Chen",
      emergency_relationship: "Sister",
      emergency_contact_number: "09178901234",
      alternate_contact_number: "09179012345",
      emergency_contact_address: "789 Pine Street, Taguig City, Metro Manila",
      emergency_contact_email: "linda.chen@email.com",
    },
    {
      first_name: "Ana",
      last_name: "Santos",
      middle_name: "Rosa",
      email: "ana.santos@countryside.com",
      phone_number: "09180123456",
      address: "321 Elm Street, Pasig City, Metro Manila",
      postal_code: "1600",
      civil_status: "Married",
      sex: "Female",
      birthday: "1992-03-18",
      age: "32",
      citizenship: "Filipino",
      department: "SCM",
      role_id: 7, // Staff
      employee_type: "Full-time",
      branch_id: null,
      pagibig_number: "4567-8901-2345",
      sss_number: "45-6789012-3",
      philhealth_number: "45-678901234-5",
      emergency_contact_name: "Carlos Santos",
      emergency_relationship: "Husband",
      emergency_contact_number: "09181234567",
      alternate_contact_number: "09182345678",
      emergency_contact_address: "321 Elm Street, Pasig City, Metro Manila",
      emergency_contact_email: "carlos.santos@email.com",
    },
  ],
  CRM: [
    {
      first_name: "Jennifer",
      last_name: "Lee",
      middle_name: "May",
      email: "jennifer.lee@countryside.com",
      phone_number: "09183456789",
      address: "654 Maple Avenue, Mandaluyong City, Metro Manila",
      postal_code: "1550",
      civil_status: "Single",
      sex: "Female",
      birthday: "1987-07-25",
      age: "37",
      citizenship: "Filipino",
      department: "CRM",
      role_id: 10, // Manager
      employee_type: "Full-time",
      branch_id: null,
      pagibig_number: "5678-9012-3456",
      sss_number: "56-7890123-4",
      philhealth_number: "56-789012345-6",
      emergency_contact_name: "Robert Lee",
      emergency_relationship: "Brother",
      emergency_contact_number: "09184567890",
      alternate_contact_number: "09185678901",
      emergency_contact_address:
        "654 Maple Avenue, Mandaluyong City, Metro Manila",
      emergency_contact_email: "robert.lee@email.com",
    },
    {
      first_name: "James",
      last_name: "Wilson",
      middle_name: "Paul",
      email: "james.wilson@countryside.com",
      phone_number: "09186789012",
      address: "987 Cedar Street, San Juan City, Metro Manila",
      postal_code: "1500",
      civil_status: "Married",
      sex: "Male",
      birthday: "1991-11-08",
      age: "33",
      citizenship: "Filipino",
      department: "CRM",
      role_id: 11, // Staff
      employee_type: "Full-time",
      branch_id: null,
      pagibig_number: "6789-0123-4567",
      sss_number: "67-8901234-5",
      philhealth_number: "67-890123456-7",
      emergency_contact_name: "Susan Wilson",
      emergency_relationship: "Wife",
      emergency_contact_number: "09187890123",
      alternate_contact_number: "09188901234",
      emergency_contact_address:
        "987 Cedar Street, San Juan City, Metro Manila",
      emergency_contact_email: "susan.wilson@email.com",
    },
  ],
  Finance: [
    {
      first_name: "Patricia",
      last_name: "Garcia",
      middle_name: "Luz",
      email: "patricia.garcia@countryside.com",
      phone_number: "09189012345",
      address: "147 Birch Street, Marikina City, Metro Manila",
      postal_code: "1800",
      civil_status: "Married",
      sex: "Female",
      birthday: "1983-04-12",
      age: "41",
      citizenship: "Filipino",
      department: "Finance",
      role_id: 4, // Manager
      employee_type: "Full-time",
      branch_id: null,
      pagibig_number: "7890-1234-5678",
      sss_number: "78-9012345-6",
      philhealth_number: "78-901234567-8",
      emergency_contact_name: "Miguel Garcia",
      emergency_relationship: "Husband",
      emergency_contact_number: "09180123456",
      alternate_contact_number: "09181234567",
      emergency_contact_address:
        "147 Birch Street, Marikina City, Metro Manila",
      emergency_contact_email: "miguel.garcia@email.com",
    },
    {
      first_name: "Christopher",
      last_name: "Martinez",
      middle_name: "Jose",
      email: "christopher.martinez@countryside.com",
      phone_number: "09182345678",
      address: "258 Spruce Avenue, Caloocan City, Metro Manila",
      postal_code: "1400",
      civil_status: "Single",
      sex: "Male",
      birthday: "1989-09-30",
      age: "35",
      citizenship: "Filipino",
      department: "Finance",
      role_id: 5, // Staff
      employee_type: "Full-time",
      branch_id: null,
      pagibig_number: "8901-2345-6789",
      sss_number: "89-0123456-7",
      philhealth_number: "89-012345678-9",
      emergency_contact_name: "Elena Martinez",
      emergency_relationship: "Mother",
      emergency_contact_number: "09183456789",
      alternate_contact_number: "09184567890",
      emergency_contact_address:
        "258 Spruce Avenue, Caloocan City, Metro Manila",
      emergency_contact_email: "elena.martinez@email.com",
    },
  ],
  Production: [
    {
      first_name: "Lisa",
      last_name: "Anderson",
      middle_name: "Grace",
      email: "lisa.anderson@countryside.com",
      phone_number: "09185678901",
      address: "369 Willow Street, Valenzuela City, Metro Manila",
      postal_code: "1440",
      civil_status: "Married",
      sex: "Female",
      birthday: "1986-01-20",
      age: "38",
      citizenship: "Filipino",
      department: "Production",
      role_id: 8, // Manager
      employee_type: "Full-time",
      branch_id: null,
      pagibig_number: "9012-3456-7890",
      sss_number: "90-1234567-8",
      philhealth_number: "90-123456789-0",
      emergency_contact_name: "Mark Anderson",
      emergency_relationship: "Husband",
      emergency_contact_number: "09186789012",
      alternate_contact_number: "09187890123",
      emergency_contact_address:
        "369 Willow Street, Valenzuela City, Metro Manila",
      emergency_contact_email: "mark.anderson@email.com",
    },
    {
      first_name: "Daniel",
      last_name: "Taylor",
      middle_name: "Ryan",
      email: "daniel.taylor@countryside.com",
      phone_number: "09188901234",
      address: "741 Ash Street, Malabon City, Metro Manila",
      postal_code: "1470",
      civil_status: "Single",
      sex: "Male",
      birthday: "1994-06-14",
      age: "30",
      citizenship: "Filipino",
      department: "Production",
      role_id: 9, // Staff
      employee_type: "Full-time",
      branch_id: null,
      pagibig_number: "0123-4567-8901",
      sss_number: "01-2345678-9",
      philhealth_number: "01-234567890-1",
      emergency_contact_name: "Rachel Taylor",
      emergency_relationship: "Sister",
      emergency_contact_number: "09189012345",
      alternate_contact_number: "09180123456",
      emergency_contact_address: "741 Ash Street, Malabon City, Metro Manila",
      emergency_contact_email: "rachel.taylor@email.com",
    },
  ],
};

// Function to create employee via API
async function createEmployee(employeeData) {
  try {
    console.log(
      `Creating employee: ${employeeData.first_name} ${employeeData.last_name} (${employeeData.department})`
    );

    const response = await axios.post(
      `${API_BASE_URL}/api/employees`,
      employeeData,
      {
        headers: {
          Authorization: `Bearer ${ADMIN_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.success) {
      console.log(
        `✅ Successfully created employee: ${employeeData.first_name} ${employeeData.last_name}`
      );
      console.log(`   Employee ID: ${response.data.data.employee_id}`);
      console.log(`   Department: ${employeeData.department}`);
      console.log(
        `   Role: ${employeeData.role_id === departmentRoles[employeeData.department][0].role_id ? "Manager" : "Staff"}`
      );
      return response.data.data;
    } else {
      console.log(
        `❌ Failed to create employee: ${employeeData.first_name} ${employeeData.last_name}`
      );
      console.log(`   Error: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    console.log(
      `❌ Error creating employee: ${employeeData.first_name} ${employeeData.last_name}`
    );
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(
        `   Error: ${error.response.data.message || error.response.data.error}`
      );
    } else {
      console.log(`   Error: ${error.message}`);
    }
    return null;
  }
}

// Function to add all department employees
async function addDepartmentEmployees() {
  console.log("🚀 Starting to add department employees...\n");

  let totalCreated = 0;
  let totalFailed = 0;

  for (const [department, employees] of Object.entries(employeeData)) {
    console.log(`\n📋 Processing ${department} Department:`);
    console.log("=".repeat(50));

    for (const employee of employees) {
      const result = await createEmployee(employee);
      if (result) {
        totalCreated++;
      } else {
        totalFailed++;
      }

      // Add a small delay to avoid overwhelming the API
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 SUMMARY:");
  console.log("=".repeat(60));
  console.log(`✅ Total employees created: ${totalCreated}`);
  console.log(`❌ Total employees failed: ${totalFailed}`);
  console.log(
    `📈 Success rate: ${((totalCreated / (totalCreated + totalFailed)) * 100).toFixed(1)}%`
  );

  if (totalFailed > 0) {
    console.log(
      "\n⚠️  Some employees failed to be created. Please check the errors above."
    );
  } else {
    console.log("\n🎉 All employees have been successfully created!");
  }
}

// Function to display department and role information
function displayDepartmentInfo() {
  console.log("📋 Available Departments and Roles:");
  console.log("=".repeat(60));

  for (const [department, roles] of Object.entries(departmentRoles)) {
    console.log(`\n🏢 ${department}:`);
    roles.forEach((role) => {
      console.log(`   • ${role.role} (ID: ${role.role_id})`);
    });
  }

  console.log("\n📊 Employee Data Summary:");
  console.log("=".repeat(60));

  for (const [department, employees] of Object.entries(employeeData)) {
    console.log(`\n${department}: ${employees.length} employees`);
    employees.forEach((emp) => {
      const role =
        emp.role_id === departmentRoles[emp.department][0].role_id
          ? "Manager"
          : "Staff";
      console.log(`   • ${emp.first_name} ${emp.last_name} (${role})`);
    });
  }
}

// Main execution
async function main() {
  console.log(
    "🏢 Countryside Steakhouse - Department Employee Creation Script"
  );
  console.log("=".repeat(70));

  // Check if token is provided
  if (!ADMIN_TOKEN || ADMIN_TOKEN === "your-admin-token-here") {
    console.log(
      "❌ ERROR: Please set the ADMIN_TOKEN environment variable or update it in the script."
    );
    console.log(
      "   You can get a token by logging in as an admin user and checking the browser's localStorage."
    );
    console.log(
      "\n   Example: ADMIN_TOKEN=your-actual-token-here node add_department_employees.js"
    );
    process.exit(1);
  }

  // Display information
  displayDepartmentInfo();

  console.log("\n" + "=".repeat(70));
  console.log("⚠️  IMPORTANT NOTES:");
  console.log(
    "• This script will create employees for HR, SCM, CRM, Finance, and Production departments"
  );
  console.log("• Each department will have 1 Manager and 1 Staff employee");
  console.log(
    "• Department employees do not have branch assignments (branch_id: null)"
  );
  console.log("• Make sure your API server is running and accessible");
  console.log("• Ensure you have a valid admin token");

  // Ask for confirmation
  console.log("\n" + "=".repeat(70));
  console.log(
    "Ready to proceed? Press Ctrl+C to cancel, or wait 5 seconds to continue..."
  );

  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Start creating employees
  await addDepartmentEmployees();
}

// Handle script termination
process.on("SIGINT", () => {
  console.log("\n\n⚠️  Script interrupted by user. Exiting...");
  process.exit(0);
});

// Run the script
main().catch((error) => {
  console.error("💥 Script failed with error:", error.message);
  process.exit(1);
});
