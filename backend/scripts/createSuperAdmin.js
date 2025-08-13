const User = require("../models/User");
const Roles = require("../models/Roles");
const { testConnection } = require("../config/database");

async function main() {
  try {
    // Test database connection
    await testConnection();
    console.log("✅ Database connected");

    // Check if Super Admin user already exists
    const existingSuperAdmin = await User.getByEmail("admin@gmail.com");

    if (existingSuperAdmin) {
      console.log("⏭️  Super Admin user already exists:");
      console.log("📧 Email: admin@gmail.com");
      console.log("🔑 Password: admin123");
      console.log(`👤 User ID: ${existingSuperAdmin.id}`);
      console.log(`🎭 Role: ${existingSuperAdmin.role_name || "No Role"}`);
      console.log(
        `🏢 Department: ${existingSuperAdmin.department || "No Department"}`
      );
      return;
    }

    // Get Super Admin role
    const roles = await Roles.getAll();
    const superAdminRole = roles.find(
      (role) => role.role === "Super Admin" && role.department === "Admin"
    );

    if (!superAdminRole) {
      console.log("❌ Super Admin role not found.");
      console.log("🔧 Please run the default data seeding first:");
      console.log("   node backend/seeders/seedDefaultData.js");
      return;
    }

    // Create Super Admin user
    const superAdminData = {
      name: "Super Administrator",
      email: "admin@gmail.com",
      password: "admin123",
      role_id: superAdminRole.role_id,
      department: "Admin",
    };

    const superAdmin = await User.create(superAdminData);

    console.log("🎉 Super Admin user created successfully!");
    console.log("📧 Email: admin@gmail.com");
    console.log("🔑 Password: admin123");
    console.log(`👤 User ID: ${superAdmin.id}`);
    console.log(`🎭 Role ID: ${superAdmin.role_id}`);
    console.log("🚀 You can now login to the application!");
  } catch (error) {
    console.error("❌ Error:", error.message);

    if (error.message.includes("connect")) {
      console.log(
        "🔧 Make sure your database is running and configured properly"
      );
    } else if (error.message.includes("role_id")) {
      console.log("🔧 Please run the migration first:");
      console.log("   npx knex migrate:latest");
    } else if (error.message.includes("bcrypt")) {
      console.log("🔧 Please install bcryptjs:");
      console.log("   npm install bcryptjs");
    }
  }
}

main();
