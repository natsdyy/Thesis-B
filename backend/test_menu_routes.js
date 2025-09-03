const axios = require("axios");

// Test menu routes
async function testRoutes() {
  const baseURL = "http://localhost:5000/api/menu";

  try {
    console.log("Testing /api/menu/menus/stats...");
    const response = await axios.get(`${baseURL}/menus/stats`, {
      headers: { Authorization: "Bearer test" },
    });
    console.log("✅ Success:", response.data);
  } catch (error) {
    console.log("❌ Error:", error.response?.data || error.message);
  }

  try {
    console.log("Testing /api/menu/items/stats...");
    const response = await axios.get(`${baseURL}/items/stats`, {
      headers: { Authorization: "Bearer test" },
    });
    console.log("✅ Success:", response.data);
  } catch (error) {
    console.log("❌ Error:", error.response?.data || error.message);
  }

  try {
    console.log("Testing /api/menu/items...");
    const response = await axios.get(`${baseURL}/items`, {
      headers: { Authorization: "Bearer test" },
    });
    console.log("✅ Success:", response.data);
  } catch (error) {
    console.log("❌ Error:", error.response?.data || error.message);
  }
}

testRoutes();
