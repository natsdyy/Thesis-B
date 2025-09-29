const axios = require("axios");

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "your-admin-token-here";

// Remaining employees with UNIQUE benefit numbers
const remainingEmployees = [
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
    branch_id: null,
    pagibig_number: "1111-2222-3333", // UNIQUE
    sss_number: "11-2222333-4", // UNIQUE
    philhealth_number: "11-222233344-5", // UNIQUE
    emergency_contact_name: "John Johnson",
    emergency_relationship: "Father",
    emergency_contact_number: "09172345678",
    alternate_contact_number: "09173456789",
    emergency_contact_address: "123 Main Street, Quezon City, Metro Manila",
    emergency_contact_email: "john.johnson@email.com",
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
    pagibig_number: "2222-3333-4444", // UNIQUE
    sss_number: "22-3333444-5", // UNIQUE
    philhealth_number: "22-333344455-6", // UNIQUE
    emergency_contact_name: "Susan Wilson",
    emergency_relationship: "Wife",
    emergency_contact_number: "09187890123",
    alternate_contact_number: "09188901234",
    emergency_contact_address: "987 Cedar Street, San Juan City, Metro Manila",
    emergency_contact_email: "susan.wilson@email.com",
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
    pagibig_number: "3333-4444-5555", // UNIQUE
    sss_number: "33-4444555-6", // UNIQUE
    philhealth_number: "33-444455566-7", // UNIQUE
    emergency_contact_name: "Rachel Taylor",
    emergency_relationship: "Sister",
    emergency_contact_number: "09189012345",
    alternate_contact_number: "09180123456",
    emergency_contact_address: "741 Ash Street, Malabon City, Metro Manila",
    emergency_contact_email: "rachel.taylor@email.com",
  },
];

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
        `   Role: ${employeeData.role_id === 2 || employeeData.role_id === 6 || employeeData.role_id === 10 || employeeData.role_id === 4 || employeeData.role_id === 8 ? "Manager" : "Staff"}`
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

// Function to add remaining employees
async function addRemainingEmployees() {
  console.log("🚀 Adding remaining employees with unique benefit numbers...\n");

  let totalCreated = 0;
  let totalFailed = 0;

  for (const employee of remainingEmployees) {
    console.log(`\n📋 Processing ${employee.department} Department:`);
    console.log("=".repeat(50));

    const result = await createEmployee(employee);
    if (result) {
      totalCreated++;
    } else {
      totalFailed++;
    }

    // Add a small delay to avoid overwhelming the API
    await new Promise((resolve) => setTimeout(resolve, 500));
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
    console.log("\n🎉 All remaining employees have been successfully created!");
  }
}

// Main execution
async function main() {
  console.log("🏢 Countryside Steakhouse - Add Remaining Department Employees");
  console.log("=".repeat(70));

  console.log("📋 Employees to be created:");
  console.log("=".repeat(70));

  remainingEmployees.forEach((emp, index) => {
    const role =
      emp.role_id === 2 ||
      emp.role_id === 6 ||
      emp.role_id === 10 ||
      emp.role_id === 4 ||
      emp.role_id === 8
        ? "Manager"
        : "Staff";
    console.log(
      `${index + 1}. ${emp.first_name} ${emp.last_name} - ${emp.department} ${role}`
    );
    console.log(`   PAG-IBIG: ${emp.pagibig_number}`);
    console.log(`   SSS: ${emp.sss_number}`);
    console.log(`   PhilHealth: ${emp.philhealth_number}`);
    console.log("");
  });

  console.log("=".repeat(70));
  console.log("⚠️  IMPORTANT NOTES:");
  console.log("• These employees have UNIQUE benefit numbers");
  console.log("• They should not conflict with existing employees");
  console.log("• Make sure your API server is running and accessible");
  console.log("• Ensure you have a valid admin token");

  // Ask for confirmation
  console.log("\n" + "=".repeat(70));
  console.log(
    "Ready to proceed? Press Ctrl+C to cancel, or wait 3 seconds to continue..."
  );

  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Start creating employees
  await addRemainingEmployees();
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
