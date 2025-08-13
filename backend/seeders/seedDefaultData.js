const Permission = require("../models/Permission");
const Roles = require("../models/Roles");
const RolePermission = require("../models/RolePermission");

async function seedDefaultPermissions() {
  try {
    console.log("🌱 Seeding default permissions...");
    const seededPermissions = await Permission.seedDefaultPermissions();
    console.log(`✅ Seeded ${seededPermissions.length} permissions`);
    return seededPermissions;
  } catch (error) {
    console.error("❌ Error seeding permissions:", error);
    throw error;
  }
}

async function seedDefaultRoles() {
  try {
    console.log("🌱 Seeding default roles...");

    const defaultRoles = [
      {
        role: "Super Admin",
        department: "Admin",
        description: "Full system access with all permissions",
      },
      {
        role: "Manager",
        department: "Human Resource",
        description: "Human Resource department manager",
      },
      {
        role: "Staff",
        department: "Human Resource",
        description: "Human Resource department staff",
      },
      {
        role: "Manager",
        department: "Finance",
        description: "Finance department manager",
      },
      {
        role: "Staff",
        department: "Finance",
        description: "Finance department staff",
      },
      {
        role: "Manager",
        department: "Supply Chain",
        description: "Supply Chain Management manager",
      },
      {
        role: "Staff",
        department: "Supply Chain",
        description: "Supply Chain Management staff",
      },
      {
        role: "Manager",
        department: "Production",
        description: "Production department manager",
      },
      {
        role: "Staff",
        department: "Production",
        description: "Production department staff",
      },
      {
        role: "Manager",
        department: "Customer Relationship",
        description: "Customer Relationship Management manager",
      },
      {
        role: "Staff",
        department: "Customer Relationship",
        description: "Customer Relationship Management staff",
      },
    ];

    const seededRoles = [];
    for (const roleData of defaultRoles) {
      try {
        // Check if role already exists
        const existingRoles = await Roles.getAll();
        const roleExists = existingRoles.some(
          (role) =>
            role.role.toLowerCase() === roleData.role.toLowerCase() &&
            role.department.toLowerCase() === roleData.department.toLowerCase()
        );

        if (!roleExists) {
          const newRole = await Roles.create(roleData);
          seededRoles.push(newRole);
          console.log(
            `✅ Created role: ${roleData.role} - ${roleData.department}`
          );
        } else {
          console.log(
            `⏭️  Role already exists: ${roleData.role} - ${roleData.department}`
          );
        }
      } catch (error) {
        console.error(
          `❌ Error creating role ${roleData.role} - ${roleData.department}:`,
          error.message
        );
      }
    }

    console.log(`✅ Seeded ${seededRoles.length} new roles`);
    return seededRoles;
  } catch (error) {
    console.error("❌ Error seeding roles:", error);
    throw error;
  }
}

async function assignDefaultPermissions() {
  try {
    console.log("🌱 Assigning default permissions to roles...");

    // Get all permissions and roles
    const permissions = await Permission.getAll();
    const roles = await Roles.getAll();

    // Create permission maps for easier lookup
    const permissionMap = {};
    permissions.forEach((perm) => {
      permissionMap[perm.permission_name] = perm.permission_id;
    });

    const roleMap = {};
    roles.forEach((role) => {
      const key = `${role.role}-${role.department}`;
      roleMap[key] = role.role_id;
    });

    // Define role-permission mappings based on your frontend structure
    const rolePermissionMappings = {
      "Super Admin-Admin": [
        // All permissions
        ...permissions.map((p) => p.permission_id),
      ],
      "Manager-Human Resource": [
        permissionMap["View Dashboard"],
        permissionMap["Manage Attendance"],
        permissionMap["Manage Employee"],
        permissionMap["Manage Leave"],
        permissionMap["Manage Payroll"],
      ].filter(Boolean),
      "Staff-Human Resource": [
        permissionMap["View Dashboard"],
        permissionMap["Manage Attendance"],
        permissionMap["Manage Leave"],
      ].filter(Boolean),
      "Manager-Finance": [
        permissionMap["View Dashboard"],
        permissionMap["Manage Inventory"],
        permissionMap["Manage Purchase Order"],
        permissionMap["Manage Sales Order"],
        permissionMap["Manage Payment"],
      ].filter(Boolean),
      "Staff-Finance": [
        permissionMap["View Dashboard"],
        permissionMap["Manage Inventory"],
        permissionMap["Manage Purchase Order"],
      ].filter(Boolean),
      "Manager-Supply Chain": [
        permissionMap["View Dashboard"],
        permissionMap["Manage Inventory"],
        permissionMap["Manage Purchase Order"],
        permissionMap["Manage Supplier"],
        permissionMap["Manage Payment"],
      ].filter(Boolean),
      "Staff-Supply Chain": [
        permissionMap["View Dashboard"],
        permissionMap["Manage Inventory"],
        permissionMap["Manage Supplier"],
      ].filter(Boolean),
      "Manager-Production": [
        permissionMap["View Dashboard"],
        permissionMap["Manage Production"],
        permissionMap["Manage Quality Control"],
        permissionMap["Manage Inventory"],
        permissionMap["Manage Purchase Order"],
      ].filter(Boolean),
      "Staff-Production": [
        permissionMap["View Dashboard"],
        permissionMap["Manage Production"],
        permissionMap["Manage Quality Control"],
      ].filter(Boolean),
      "Manager-Customer Relationship": [
        permissionMap["View Dashboard"],
        permissionMap["Manage Customer"],
      ].filter(Boolean),
      "Staff-Customer Relationship": [
        permissionMap["View Dashboard"],
        permissionMap["Manage Customer"],
      ].filter(Boolean),
    };

    let assignmentCount = 0;
    for (const [roleKey, permissionIds] of Object.entries(
      rolePermissionMappings
    )) {
      const roleId = roleMap[roleKey];
      if (roleId && permissionIds.length > 0) {
        try {
          await RolePermission.bulkAssignPermissionsToRole(
            roleId,
            permissionIds
          );
          assignmentCount += permissionIds.length;
          console.log(
            `✅ Assigned ${permissionIds.length} permissions to ${roleKey}`
          );
        } catch (error) {
          console.error(
            `❌ Error assigning permissions to ${roleKey}:`,
            error.message
          );
        }
      }
    }

    console.log(`✅ Total permission assignments: ${assignmentCount}`);
  } catch (error) {
    console.error("❌ Error assigning default permissions:", error);
    throw error;
  }
}

async function seedAll() {
  try {
    console.log("🚀 Starting default data seeding...");

    // Seed permissions first
    await seedDefaultPermissions();

    // Then seed roles
    await seedDefaultRoles();

    // Finally assign permissions to roles
    await assignDefaultPermissions();

    console.log("🎉 Default data seeding completed successfully!");
  } catch (error) {
    console.error("💥 Error during seeding:", error);
    throw error;
  }
}

module.exports = {
  seedDefaultPermissions,
  seedDefaultRoles,
  assignDefaultPermissions,
  seedAll,
};

// If running this file directly
if (require.main === module) {
  seedAll()
    .then(() => {
      console.log("✅ Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}
