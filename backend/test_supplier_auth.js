/**
 * Quick test script for supplier authentication
 * Run this to test if supplier auth is working
 */

const axios = require("axios");

const BASE_URL = process.env.API_URL || "http://localhost:5000";

async function testSupplierAuth() {
  console.log("🧪 Testing Supplier Authentication System\n");
  console.log("=".repeat(60));

  try {
    // Test 1: Login with default credentials
    console.log("\n📋 Test 1: Supplier Login");
    console.log("-".repeat(60));

    const loginResponse = await axios.post(
      `${BASE_URL}/api/supplier-auth/login`,
      {
        email: "cedricbelisario@gmail.com", // Replace with actual supplier email
        password: "supplier123",
      }
    );

    if (loginResponse.data.success) {
      console.log("✅ Login successful!");
      console.log("   Supplier:", loginResponse.data.data.supplier.name);
      console.log(
        "   Token:",
        loginResponse.data.data.token.substring(0, 20) + "..."
      );

      const token = loginResponse.data.data.token;
      const supplierId = loginResponse.data.data.supplier.id;

      // Test 2: Validate Session
      console.log("\n📋 Test 2: Validate Session");
      console.log("-".repeat(60));

      const sessionResponse = await axios.post(
        `${BASE_URL}/api/supplier-auth/validate-session`,
        { supplier_id: supplierId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (sessionResponse.data.success) {
        console.log("✅ Session validation successful!");
        console.log("   Status:", sessionResponse.data.message);
      }

      // Test 3: Get Profile
      console.log("\n📋 Test 3: Get Supplier Profile");
      console.log("-".repeat(60));

      const profileResponse = await axios.get(
        `${BASE_URL}/api/supplier-auth/profile?supplier_id=${supplierId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (profileResponse.data.success) {
        console.log("✅ Profile retrieved successfully!");
        console.log("   Name:", profileResponse.data.data.supplier.name);
        console.log("   Email:", profileResponse.data.data.supplier.email);
        console.log("   Status:", profileResponse.data.data.supplier.status);
      }

      console.log("\n" + "=".repeat(60));
      console.log("✅ ALL TESTS PASSED!");
      console.log("=".repeat(60));
    } else {
      console.log("❌ Login failed:", loginResponse.data.message);
    }
  } catch (error) {
    console.log("\n❌ TEST FAILED!");
    console.log("Error:", error.response?.data?.message || error.message);

    if (error.response?.status === 404) {
      console.log(
        "\n💡 Tip: Make sure you have a supplier with email 'supplier@example.com'"
      );
      console.log(
        "   Or update the email in this test script to match an existing supplier."
      );
    }

    if (error.code === "ECONNREFUSED") {
      console.log(
        "\n💡 Tip: Make sure the backend server is running on",
        BASE_URL
      );
    }
  }

  console.log("\n");
}

// Run the test
testSupplierAuth();
