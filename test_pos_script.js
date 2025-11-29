const { db } = require("./backend/config/database");

async function testDatabaseConnection() {
  try {
    console.log("🔍 Testing database connection...");
    await db.raw("SELECT 1");
    console.log("✅ Database connection successful!");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    return false;
  }
}

async function checkRequiredTables() {
  try {
    console.log("\n🔍 Checking required database tables...");

    const tables = [
      "pos_sales_orders",
      "pos_order_items",
      "branches",
      "employees",
      "menu_items",
    ];

    for (const table of tables) {
      try {
        await db.raw(`SELECT 1 FROM ${table} LIMIT 1`);
        console.log(`   ✅ Table '${table}' exists`);
      } catch (error) {
        console.log(`   ❌ Table '${table}' missing or inaccessible`);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("❌ Error checking tables:", error.message);
    return false;
  }
}

async function checkBranchesAndEmployees() {
  try {
    console.log("\n🔍 Checking branches and employees...");

    // Check branches 6 and 7
    const branches = await db("branches")
      .whereIn("id", [6, 7])
      .select("id", "name");

    console.log(`   📍 Found ${branches.length} branches:`);
    branches.forEach((branch) => {
      console.log(`      - Branch ${branch.id}: ${branch.name}`);
    });

    if (branches.length === 0) {
      console.log("   ⚠️  No branches found with IDs 6 and 7");
    }

    // Check employees for these branches
    const employees = await db("employees")
      .whereIn("branch_id", [6, 7])
      .whereNull("deleted_at")
      .select("id", "branch_id", "first_name", "last_name");

    console.log(
      `   👥 Found ${employees.length} employees for branches 6 and 7:`
    );
    employees.forEach((emp) => {
      console.log(
        `      - ${emp.first_name} ${emp.last_name} (ID: ${emp.id}, Branch: ${emp.branch_id})`
      );
    });

    if (employees.length === 0) {
      console.log("   ⚠️  No employees found for branches 6 and 7");
    }

    return { branches, employees };
  } catch (error) {
    console.error("❌ Error checking branches and employees:", error.message);
    return { branches: [], employees: [] };
  }
}

async function checkExistingOrders() {
  try {
    console.log("\n🔍 Checking existing orders for September 2025...");

    const existingOrders = await db("pos_sales_orders")
      .whereIn("branch_id", [6, 7])
      .whereBetween("created_at", [
        new Date(2025, 8, 1), // September 1, 2025
        new Date(2025, 8, 30, 23, 59, 59), // September 30, 2025
      ])
      .count("id as count")
      .first();

    const count = parseInt(existingOrders.count);
    console.log(`   📊 Found ${count} existing orders for September 2025`);

    if (count > 0) {
      console.log("   ⚠️  There are already orders for September 2025");
      console.log("   💡 The script will add more orders to the existing data");
    }

    return count;
  } catch (error) {
    console.error("❌ Error checking existing orders:", error.message);
    return 0;
  }
}

async function runTests() {
  console.log("🧪 Running pre-generation tests...\n");

  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.log("\n❌ Cannot proceed without database connection");
    return false;
  }

  const tablesExist = await checkRequiredTables();
  if (!tablesExist) {
    console.log("\n❌ Required tables are missing");
    return false;
  }

  const { branches, employees } = await checkBranchesAndEmployees();
  const existingOrders = await checkExistingOrders();

  console.log("\n📋 Test Summary:");
  console.log(`   ✅ Database connection: OK`);
  console.log(`   ✅ Required tables: OK`);
  console.log(`   📍 Branches found: ${branches.length}/2`);
  console.log(`   👥 Employees found: ${employees.length}`);
  console.log(`   📊 Existing orders: ${existingOrders}`);

  if (branches.length === 0) {
    console.log("\n⚠️  WARNING: No branches found with IDs 6 and 7");
    console.log("   The script will still run but may fail");
  }

  if (employees.length === 0) {
    console.log("\n⚠️  WARNING: No employees found for branches 6 and 7");
    console.log("   The script will use employee ID 31 as fallback");
  }

  console.log("\n✅ Tests completed! You can now run the main script.");
  return true;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests()
    .then(() => {
      console.log("\n🎉 All tests passed! Ready to generate POS orders.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Tests failed:", error);
      process.exit(1);
    });
}

module.exports = {
  runTests,
  testDatabaseConnection,
  checkRequiredTables,
  checkBranchesAndEmployees,
  checkExistingOrders,
};
