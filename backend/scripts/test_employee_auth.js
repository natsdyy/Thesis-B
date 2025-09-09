require("dotenv").config();
const fetch = require("node-fetch");

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";

async function testAuthentication() {
  try {
    console.log("\n🧪 Testing Employee Authentication System...\n");

    // Test 1: Super Admin login
    console.log("1️⃣  Testing Super Admin login...");
    const superAdminResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "admin@gmail.com",
        password: "admin123",
      }),
    });

    const superAdminResult = await superAdminResponse.json();
    if (superAdminResult.success) {
      console.log("✅ Super Admin login successful");
      console.log(`   Role: ${superAdminResult.data.user.role}`);
      console.log(`   Department: ${superAdminResult.data.user.department}`);
    } else {
      console.log("❌ Super Admin login failed:", superAdminResult.message);
    }

    // Test 2: HR Manager login with default password (last name)
    console.log("\n2️⃣  Testing HR Manager login with default password...");
    const hrResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "maria.santos@company.com",
        password: "Santos",
      }),
    });

    const hrResult = await hrResponse.json();
    if (hrResult.success) {
      console.log("✅ HR Manager login successful");
      console.log(
        `   Name: ${hrResult.data.user.first_name} ${hrResult.data.user.last_name}`
      );
      console.log(`   Role: ${hrResult.data.user.role}`);
      console.log(`   Department: ${hrResult.data.user.department}`);
    } else {
      console.log("❌ HR Manager login failed:", hrResult.message);
    }

    // Test 3: Finance Manager login
    console.log("\n3️⃣  Testing Finance Manager login...");
    const financeResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "roberto.cruz@company.com",
        password: "Cruz",
      }),
    });

    const financeResult = await financeResponse.json();
    if (financeResult.success) {
      console.log("✅ Finance Manager login successful");
      console.log(
        `   Name: ${financeResult.data.user.first_name} ${financeResult.data.user.last_name}`
      );
      console.log(`   Role: ${financeResult.data.user.role}`);
      console.log(`   Department: ${financeResult.data.user.department}`);
    } else {
      console.log("❌ Finance Manager login failed:", financeResult.message);
    }

    // Test 4: Invalid credentials
    console.log("\n4️⃣  Testing invalid credentials...");
    const invalidResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "invalid@email.com",
        password: "wrongpassword",
      }),
    });

    const invalidResult = await invalidResponse.json();
    if (!invalidResult.success) {
      console.log("✅ Invalid credentials properly rejected");
      console.log(`   Message: ${invalidResult.message}`);
    } else {
      console.log("❌ Invalid credentials should have been rejected");
    }

    // Test 5: Session validation (using Super Admin token)
    if (superAdminResult.success) {
      console.log("\n5️⃣  Testing session validation...");
      const sessionResponse = await fetch(
        `${API_BASE_URL}/auth/validate-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${superAdminResult.data.token}`,
          },
          body: JSON.stringify({
            user_id: superAdminResult.data.user.id,
          }),
        }
      );

      const sessionResult = await sessionResponse.json();
      if (sessionResult.success) {
        console.log("✅ Session validation successful");
        console.log(
          `   User: ${sessionResult.data.user.first_name} ${sessionResult.data.user.last_name}`
        );
      } else {
        console.log("❌ Session validation failed:", sessionResult.message);
      }
    }

    console.log("\n🎉 Authentication testing completed!");
  } catch (error) {
    console.error("❌ Error testing authentication:", error);
  }
}

if (require.main === module) {
  testAuthentication();
}

module.exports = { testAuthentication };
