const { db } = require("../config/database");

async function resetRolesFromImage() {
  try {
    console.log("🧹 Clearing existing roles...");

    // Clear all existing roles
    await db("user_roles").del();

    // Reset the auto-increment sequence (PostgreSQL specific)
    await db.raw("ALTER SEQUENCE user_roles_role_id_seq RESTART WITH 1");

    console.log("📝 Inserting roles from image structure...");

    // Insert roles exactly as shown in the image
    const roles = [
      // Super Admin (system role)
      {
        role: "Super Admin",
        department: "System",
        description: "System administrator with full access to all modules",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },

      // HR Department
      {
        role: "Manager",
        department: "Human Resource",
        description: "HR Department Manager",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        role: "Staff",
        department: "Human Resource",
        description: "HR Department Staff",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Finance Department
      {
        role: "Manager",
        department: "Finance",
        description: "Finance Department Manager",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        role: "Staff",
        department: "Finance",
        description: "Finance Department Staff",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },

      // SCM Department
      {
        role: "Manager",
        department: "SCM",
        description: "Supply Chain Management Department Manager",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        role: "Staff",
        department: "SCM",
        description: "Supply Chain Management Department Staff",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Production Department
      {
        role: "Manager",
        department: "Production",
        description: "Production Department Manager",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        role: "Staff",
        department: "Production",
        description: "Production Department Staff",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },

      // CRM Department
      {
        role: "Manager",
        department: "CRM",
        description: "Customer Relationship Management Department Manager",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        role: "Staff",
        department: "CRM",
        description: "Customer Relationship Management Department Staff",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Branch Department
      {
        role: "Manager",
        department: "Branch",
        description: "Branch Manager",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        role: "Cook",
        department: "Branch",
        description: "Branch Cook",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        role: "Kitchen Assistant",
        department: "Branch",
        description: "Branch Kitchen Assistant",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        role: "Cashier",
        department: "Branch",
        description: "Branch Cashier",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        role: "Waiter",
        department: "Branch",
        description: "Branch Waiter",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    // Insert all roles
    await db("user_roles").insert(roles);

    console.log("✅ Successfully reset roles based on image structure");

    // Display the new roles
    const newRoles = await db("user_roles").select("*").orderBy("role_id");
    console.log("\n📋 New roles structure:");
    newRoles.forEach((r) =>
      console.log(`${r.role_id}: ${r.department} - ${r.role}`)
    );

    await db.destroy();
  } catch (error) {
    console.error("❌ Error resetting roles:", error);
    await db.destroy();
    process.exit(1);
  }
}

resetRolesFromImage();
