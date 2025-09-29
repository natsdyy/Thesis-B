const axios = require("axios");

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "your-admin-token-here";

// Function to check existing employees and their benefit numbers
async function checkExistingBenefits() {
  try {
    console.log(
      "🔍 Checking existing employees and their benefit numbers...\n"
    );

    const response = await axios.get(`${API_BASE_URL}/api/employees`, {
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (response.data.success) {
      const employees = response.data.data;

      console.log(`📊 Found ${employees.length} existing employees:\n`);

      // Group by department
      const departmentGroups = {};
      employees.forEach((emp) => {
        if (!departmentGroups[emp.department]) {
          departmentGroups[emp.department] = [];
        }
        departmentGroups[emp.department].push(emp);
      });

      // Display employees by department
      for (const [department, deptEmployees] of Object.entries(
        departmentGroups
      )) {
        console.log(`🏢 ${department}:`);
        deptEmployees.forEach((emp) => {
          console.log(`   • ${emp.first_name} ${emp.last_name} (${emp.role})`);
          console.log(`     - Employee ID: ${emp.employee_id}`);
          console.log(`     - PAG-IBIG: ${emp.pagibig_number || "Not set"}`);
          console.log(`     - SSS: ${emp.sss_number || "Not set"}`);
          console.log(
            `     - PhilHealth: ${emp.philhealth_number || "Not set"}`
          );
          console.log(
            `     - Branch: ${emp.branch_id ? `Branch ${emp.branch_id}` : "No Branch (Department Employee)"}`
          );
          console.log("");
        });
      }

      // Check for specific benefit numbers that might be causing conflicts
      console.log("🔍 Checking for potential benefit number conflicts:\n");

      const benefitNumbers = {
        pagibig: employees.map((e) => e.pagibig_number).filter(Boolean),
        sss: employees.map((e) => e.sss_number).filter(Boolean),
        philhealth: employees.map((e) => e.philhealth_number).filter(Boolean),
      };

      console.log(
        `📋 Existing PAG-IBIG numbers (${benefitNumbers.pagibig.length}):`
      );
      benefitNumbers.pagibig.forEach((num) => console.log(`   • ${num}`));

      console.log(`\n📋 Existing SSS numbers (${benefitNumbers.sss.length}):`);
      benefitNumbers.sss.forEach((num) => console.log(`   • ${num}`));

      console.log(
        `\n📋 Existing PhilHealth numbers (${benefitNumbers.philhealth.length}):`
      );
      benefitNumbers.philhealth.forEach((num) => console.log(`   • ${num}`));

      // Check if our script's numbers already exist
      console.log(
        "\n🔍 Checking if our script's benefit numbers already exist:\n"
      );

      const scriptNumbers = {
        pagibig: [
          "1234-5678-9012",
          "2345-6789-0123",
          "3456-7890-1234",
          "4567-8901-2345",
          "5678-9012-3456",
          "6789-0123-4567",
          "7890-1234-5678",
          "8901-2345-6789",
          "9012-3456-7890",
          "0123-4567-8901",
        ],
        sss: [
          "12-3456789-0",
          "23-4567890-1",
          "34-5678901-2",
          "45-6789012-3",
          "56-7890123-4",
          "67-8901234-5",
          "78-9012345-6",
          "89-0123456-7",
          "90-1234567-8",
          "01-2345678-9",
        ],
        philhealth: [
          "12-345678901-2",
          "23-456789012-3",
          "34-567890123-4",
          "45-678901234-5",
          "56-789012345-6",
          "67-890123456-7",
          "78-901234567-8",
          "89-012345678-9",
          "90-123456789-0",
          "01-234567890-1",
        ],
      };

      const conflicts = {
        pagibig: scriptNumbers.pagibig.filter((num) =>
          benefitNumbers.pagibig.includes(num)
        ),
        sss: scriptNumbers.sss.filter((num) =>
          benefitNumbers.sss.includes(num)
        ),
        philhealth: scriptNumbers.philhealth.filter((num) =>
          benefitNumbers.philhealth.includes(num)
        ),
      };

      if (conflicts.pagibig.length > 0) {
        console.log("⚠️ PAG-IBIG conflicts found:");
        conflicts.pagibig.forEach((num) => console.log(`   • ${num}`));
      }

      if (conflicts.sss.length > 0) {
        console.log("⚠️ SSS conflicts found:");
        conflicts.sss.forEach((num) => console.log(`   • ${num}`));
      }

      if (conflicts.philhealth.length > 0) {
        console.log("⚠️ PhilHealth conflicts found:");
        conflicts.philhealth.forEach((num) => console.log(`   • ${num}`));
      }

      if (
        conflicts.pagibig.length === 0 &&
        conflicts.sss.length === 0 &&
        conflicts.philhealth.length === 0
      ) {
        console.log(
          "✅ No benefit number conflicts found with our script's numbers."
        );
        console.log(
          "🤔 The error might be due to a different validation issue."
        );
      }
    } else {
      console.log("❌ Failed to fetch employees:", response.data.message);
    }
  } catch (error) {
    console.log("❌ Error checking existing benefits:");
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(
        `   Error: ${error.response.data.message || error.response.data.error}`
      );
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }
}

// Run the check
checkExistingBenefits();
