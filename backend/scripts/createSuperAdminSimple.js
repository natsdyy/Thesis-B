const { db } = require("../config/database");
const bcrypt = require("bcryptjs");
const { testConnection } = require("../config/database");

async function main() {
  try {
    // Test database connection
    await testConnection();
    console.log("✅ Database connected");

    // Check if user already exists
    const existingUser = await db("users")
      .where("email", "admin@gmail.com")
      .first();

    if (existingUser) {
      console.log("⏭️  Super Admin user already exists:");
      console.log("📧 Email: admin@gmail.com");
      console.log("🔑 Password: admin123");
      console.log(`👤 User ID: ${existingUser.id}`);
      return;
    }

    // Get Super Admin role
    const superAdminRole = await db("user_roles")
      .where("role", "Super Admin")
      .where("department", "Admin")
      .first();

    if (!superAdminRole) {
      console.log("❌ Super Admin role not found.");
      console.log("🔧 Please run the default data seeding first:");
      console.log("   npm run seed:default");
      return;
    }

    console.log("✅ Found Super Admin role:", superAdminRole);

    // Hash password
    const hashedPassword = await bcrypt.hash("admin123", 10);

    // Create Super Admin user
    const [superAdmin] = await db("users")
      .insert({
        name: "Super Administrator",
        email: "admin@gmail.com",
        password: hashedPassword,
        role_id: superAdminRole.role_id,
        department: "Admin",
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
      })
      .returning("*");

    console.log("🎉 Super Admin user created successfully!");
    console.log("📧 Email: admin@gmail.com");
    console.log("🔑 Password: admin123");
    console.log(`👤 User ID: ${superAdmin.id}`);
    console.log(`🎭 Role ID: ${superAdmin.role_id}`);
    console.log("🚀 You can now login to the application!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    // Close database connection
    await db.destroy();
  }
}

main();
