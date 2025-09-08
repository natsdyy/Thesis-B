const fetch = require("node-fetch");

// Configuration
const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";
const API_URL = `${BASE_URL}/employees`;

// Test data with role_id instead of job_title
const testEmployee = {
  first_name: "Maria",
  middle_name: "Santos",
  last_name: "Cruz",
  email: "maria.cruz@countrysidesteakhouse.com",
  phone_number: "+63 912 345 6789",
  address: "123 Main Street, Quezon City, Metro Manila",
  postal_code: "1100",
  civil_status: "Single",
  sex: "Female",
  birthday: "1995-06-15",
  age: 29,
  citizenship: "Filipino",
  department: "Human Resource",
  role_id: 2, // HR Manager role_id
  employee_type: "Full-time",
  pagibig_number: "PAG987654321",
  sss_number: "SSS987654321",
  philhealth_number: "PH987654321",
  emergency_contact_name: "Juan Cruz",
  emergency_relationship: "Father",
  emergency_contact_number: "+63 912 345 6780",
  alternate_contact_number: "+63 912 345 6781",
  emergency_contact_address: "123 Main Street, Quezon City, Metro Manila",
  emergency_contact_email: "juan.cruz@email.com",
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
async function testGetDepartmentsWithRoles() {
  console.log("\n🏢 Testing GET /employees/departments-with-roles");
  return await makeRequest(`${API_URL}/departments-with-roles`);
}

async function testGetRolesByDepartment(department) {
  console.log(`\n👥 Testing GET /employees/roles/${department}`);
  return await makeRequest(
    `${API_URL}/roles/${encodeURIComponent(department)}`
  );
}

async function testCreateEmployeeWithRole() {
  console.log("\n➕ Testing POST /employees with role_id");
  return await makeRequest(API_URL, {
    method: "POST",
    body: JSON.stringify(testEmployee),
  });
}

async function testCreateEmployeeWithInvalidRole() {
  console.log("\n❌ Testing POST /employees with invalid role_id");
  const invalidEmployee = {
    ...testEmployee,
    role_id: 999, // Invalid role
    email: "invalid.role@test.com",
    pagibig_number: "PAG999999999",
    sss_number: "SSS999999999",
    philhealth_number: "PH999999999",
  };

  return await makeRequest(API_URL, {
    method: "POST",
    body: JSON.stringify(invalidEmployee),
  });
}

async function testCreateEmployeeWithWrongDepartmentRole() {
  console.log("\n❌ Testing POST /employees with role from wrong department");
  const wrongDeptEmployee = {
    ...testEmployee,
    department: "Finance",
    role_id: 2, // HR Manager role but Finance department
    email: "wrong.dept@test.com",
    pagibig_number: "PAG888888888",
    sss_number: "SSS888888888",
    philhealth_number: "PH888888888",
  };

  return await makeRequest(API_URL, {
    method: "POST",
    body: JSON.stringify(wrongDeptEmployee),
  });
}

// Main test function
async function runRoleSystemTests() {
  console.log("🚀 Starting Role System Tests");
  console.log("================================");

  try {
    // Test 1: Get all departments with their roles
    const deptResult = await testGetDepartmentsWithRoles();
    if (deptResult.data && deptResult.data.success) {
      console.log("✅ Departments with roles loaded successfully");
      console.log("Available departments:", Object.keys(deptResult.data.data));
    }

    // Test 2: Get roles for specific departments
    await testGetRolesByDepartment("Human Resource");
    await testGetRolesByDepartment("Branch");
    await testGetRolesByDepartment("Finance");

    // Test 3: Create employee with valid role
    const createResult = await testCreateEmployeeWithRole();
    let createdEmployeeId = null;
    if (createResult.data && createResult.data.success) {
      createdEmployeeId = createResult.data.data.id;
      console.log(
        `✅ Employee created successfully with ID: ${createdEmployeeId}`
      );
      console.log(`Role ID: ${createResult.data.data.role_id}`);
    }

    // Test 4: Try to create employee with invalid role
    await testCreateEmployeeWithInvalidRole();

    // Test 5: Try to create employee with role from wrong department
    await testCreateEmployeeWithWrongDepartmentRole();

    // Test 6: Get the created employee to verify role_id is stored
    if (createdEmployeeId) {
      console.log(`\n👤 Testing GET /employees/${createdEmployeeId}`);
      const getResult = await makeRequest(`${API_URL}/${createdEmployeeId}`);
      if (getResult.data && getResult.data.success) {
        console.log(
          `✅ Employee retrieved with role_id: ${getResult.data.data.role_id}`
        );
      }
    }

    console.log("\n✅ All role system tests completed!");
  } catch (error) {
    console.error("\n❌ Role system test failed:", error.message);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runRoleSystemTests().catch(console.error);
}

module.exports = {
  runRoleSystemTests,
  testGetDepartmentsWithRoles,
  testCreateEmployeeWithRole,
};
