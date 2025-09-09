const fetch = require("node-fetch");

// Configuration
const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";
const API_URL = `${BASE_URL}/employees`;

// Test data
const testEmployee = {
  first_name: "Juan",
  middle_name: "Santos",
  last_name: "Dela Cruz",
  email: "juan.delacruz@countrysidesteakhouse.com",
  phone_number: "+63 912 345 6789",
  address: "123 Main Street, Quezon City, Metro Manila",
  postal_code: "1100",
  civil_status: "Single",
  sex: "Male",
  birthday: "1995-06-15",
  age: 29,
  citizenship: "Filipino",
  department: "Production",
  job_title: "Staff",
  employee_type: "Full-time",
  pagibig_number: "PAG123456789",
  sss_number: "SSS123456789",
  philhealth_number: "PH123456789",
  emergency_contact_name: "Maria Dela Cruz",
  emergency_relationship: "Mother",
  emergency_contact_number: "+63 912 345 6780",
  alternate_contact_number: "+63 912 345 6781",
  emergency_contact_address: "123 Main Street, Quezon City, Metro Manila",
  emergency_contact_email: "maria.delacruz@email.com",
};

// Helper function for making API requests
async function makeRequest(url, options = {}) {
  try {
    console.log(`\n🔄 Making request to: ${url}`);
    console.log(`Method: ${options.method || "GET"}`);

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    return { response, data };
  } catch (error) {
    console.error(`❌ Error making request to ${url}:`, error.message);
    return { error };
  }
}

// Test functions
async function testGetEmployeeStats() {
  console.log("\n📊 Testing GET /employees/stats");
  return await makeRequest(`${API_URL}/stats`);
}

async function testGetAllEmployees() {
  console.log("\n👥 Testing GET /employees");
  return await makeRequest(API_URL);
}

async function testCreateEmployee() {
  console.log("\n➕ Testing POST /employees");
  return await makeRequest(API_URL, {
    method: "POST",
    body: JSON.stringify(testEmployee),
  });
}

async function testGetEmployeeById(id) {
  console.log(`\n👤 Testing GET /employees/${id}`);
  return await makeRequest(`${API_URL}/${id}`);
}

async function testGetEmployeeByEmployeeId(employeeId) {
  console.log(`\n🆔 Testing GET /employees/employee-id/${employeeId}`);
  return await makeRequest(`${API_URL}/employee-id/${employeeId}`);
}

async function testUpdateEmployee(id) {
  console.log(`\n✏️ Testing PUT /employees/${id}`);
  const updatedData = {
    ...testEmployee,
    first_name: "Juan Carlos",
    job_title: "Manager",
  };

  return await makeRequest(`${API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(updatedData),
  });
}

async function testUpdateEmployeeStatus(id, status) {
  console.log(`\n📝 Testing PATCH /employees/${id}/status`);
  return await makeRequest(`${API_URL}/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

async function testDeleteEmployee(id) {
  console.log(`\n🗑️ Testing DELETE /employees/${id}`);
  return await makeRequest(`${API_URL}/${id}`, {
    method: "DELETE",
  });
}

async function testRestoreEmployee(id) {
  console.log(`\n🔄 Testing PATCH /employees/${id}/restore`);
  return await makeRequest(`${API_URL}/${id}/restore`, {
    method: "PATCH",
  });
}

// Main test function
async function runTests() {
  console.log("🚀 Starting Employee API Tests");
  console.log("================================");

  let createdEmployeeId = null;
  let createdEmployeeEmployeeId = null;

  try {
    // Test 1: Get employee stats
    await testGetEmployeeStats();

    // Test 2: Get all employees (should be empty initially)
    await testGetAllEmployees();

    // Test 3: Create a new employee
    const createResult = await testCreateEmployee();
    if (createResult.data && createResult.data.success) {
      createdEmployeeId = createResult.data.data.id;
      createdEmployeeEmployeeId = createResult.data.data.employee_id;
      console.log(
        `✅ Employee created with ID: ${createdEmployeeId}, Employee ID: ${createdEmployeeEmployeeId}`
      );
    }

    // Test 4: Get all employees (should now have one)
    await testGetAllEmployees();

    // Test 5: Get employee stats (should be updated)
    await testGetEmployeeStats();

    if (createdEmployeeId) {
      // Test 6: Get employee by ID
      await testGetEmployeeById(createdEmployeeId);

      // Test 7: Get employee by employee ID
      if (createdEmployeeEmployeeId) {
        await testGetEmployeeByEmployeeId(createdEmployeeEmployeeId);
      }

      // Test 8: Update employee
      await testUpdateEmployee(createdEmployeeId);

      // Test 9: Update employee status
      await testUpdateEmployeeStatus(createdEmployeeId, "On Leave");

      // Test 10: Update employee status back to Active
      await testUpdateEmployeeStatus(createdEmployeeId, "Active");

      // Test 11: Delete employee (soft delete)
      await testDeleteEmployee(createdEmployeeId);

      // Test 12: Try to get deleted employee
      await testGetEmployeeById(createdEmployeeId);

      // Test 13: Restore employee
      await testRestoreEmployee(createdEmployeeId);

      // Test 14: Get restored employee
      await testGetEmployeeById(createdEmployeeId);
    }

    console.log("\n✅ All tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
  }
}

// Error handling
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testCreateEmployee,
  testGetAllEmployees,
  testGetEmployeeStats,
};
