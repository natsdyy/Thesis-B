const User = require("../models/User");
const Roles = require("../models/Roles");

async function createSuperAdmin() {
  try {
    console.log("🌱 Creating Super Admin user...");

    // Check if Super Admin user already exists
    const existingSuperAdmin = await User.getByEmail("admin@gmail.com");

    if (existingSuperAdmin) {
      console.log("⏭️  Super Admin user already exists");
      return existingSuperAdmin;
    }

    // Get Super Admin role
    const roles = await Roles.getAll();
    const superAdminRole = roles.find(
      (role) => role.role === "Super Admin" && role.department === "Admin"
    );

    if (!superAdminRole) {
      throw new Error(
        "Super Admin role not found. Please run default data seeding first."
      );
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

    console.log("✅ Super Admin user created successfully!");
    console.log("📧 Email: admin@gmail.com");
    console.log("🔑 Password: admin123");
    console.log(`👤 User ID: ${superAdmin.id}`);
    console.log(`🎭 Role ID: ${superAdmin.role_id}`);

    return superAdmin;
  } catch (error) {
    console.error("❌ Error creating Super Admin user:", error);
    throw error;
  }
}

async function createTestUsers() {
  try {
    console.log("🌱 Creating test users...");

    const roles = await Roles.getAll();

    const testUsers = [
      {
        name: "HR Manager",
        email: "hr@gmail.com",
        password: "admin123",
        department: "Human Resource",
        roleKey: "Manager-Human Resource",
      },
      {
        name: "Finance Manager",
        email: "finance@gmail.com",
        password: "admin123",
        department: "Finance",
        roleKey: "Manager-Finance",
      },
      {
        name: "SCM Manager",
        email: "scm@gmail.com",
        password: "admin123",
        department: "Supply Chain",
        roleKey: "Manager-Supply Chain",
      },
      {
        name: "Production Manager",
        email: "production@gmail.com",
        password: "admin123",
        department: "Production",
        roleKey: "Manager-Production",
      },
      {
        name: "CRM Manager",
        email: "crm@gmail.com",
        password: "admin123",
        department: "Customer Relationship",
        roleKey: "Manager-Customer Relationship",
      },
    ];

    const createdUsers = [];

    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.getByEmail(userData.email);

        if (existingUser) {
          console.log(`⏭️  User already exists: ${userData.email}`);
          continue;
        }

        // Find the role
        const role = roles.find(
          (r) =>
            r.role === userData.roleKey.split("-")[0] &&
            r.department === userData.roleKey.split("-")[1]
        );

        if (!role) {
          console.log(
            `❌ Role not found for ${userData.name}: ${userData.roleKey}`
          );
          continue;
        }

        // Create user
        const newUser = await User.create({
          name: userData.name,
          email: userData.email,
          password: userData.password,
          role_id: role.role_id,
          department: userData.department,
        });

        createdUsers.push(newUser);
        console.log(`✅ Created user: ${userData.name} (${userData.email})`);
      } catch (error) {
        console.error(
          `❌ Error creating user ${userData.name}:`,
          error.message
        );
      }
    }

    console.log(`✅ Created ${createdUsers.length} test users`);
    return createdUsers;
  } catch (error) {
    console.error("❌ Error creating test users:", error);
    throw error;
  }
}

async function createAllTestUsers() {
  try {
    console.log("🚀 Creating all test users...");

    // Create Super Admin first
    await createSuperAdmin();

    // Create other test users
    await createTestUsers();

    console.log("🎉 All test users created successfully!");
    console.log("\n📝 Test Credentials:");
    console.log("Super Admin: admin@gmail.com / admin123");
    console.log("HR Manager: hr@gmail.com / admin123");
    console.log("Finance Manager: finance@gmail.com / admin123");
    console.log("SCM Manager: scm@gmail.com / admin123");
    console.log("Production Manager: production@gmail.com / admin123");
    console.log("CRM Manager: crm@gmail.com / admin123");
  } catch (error) {
    console.error("💥 Error creating test users:", error);
    throw error;
  }
}

module.exports = {
  createSuperAdmin,
  createTestUsers,
  createAllTestUsers,
};

// If running this file directly
if (require.main === module) {
  createAllTestUsers()
    .then(() => {
      console.log("✅ User creation completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ User creation failed:", error);
      process.exit(1);
    });
}
