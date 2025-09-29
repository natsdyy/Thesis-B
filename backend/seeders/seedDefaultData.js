const Permission = require("../models/Permission");
const Roles = require("../models/Roles");
const RolePermission = require("../models/RolePermission");
const Employee = require("../models/Employee");

async function seedDefaultPermissions() {
  try {
    console.log("🌱 Seeding department permissions...");
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
    console.log("🌱 Seeding department roles...");

    const departments = [
      "Admin",
      "Human Resource",
      "Finance",
      "Supply Chain",
      "Production",
      "Customer Relationship",
    ];

    const roleTypes = [
      {
        role: "Admin",
        description: "Full department access with all CRUD operations",
      },
      {
        role: "Manager",
        description: "Management access with most operations and approvals",
      },
      {
        role: "Staff",
        description: "Basic employee access with limited operations",
      },
    ];

    // Add Super Admin (system-wide)
    const systemRoles = [
      {
        role: "Super Admin",
        department: "Admin",
        description: "Full system access across all departments",
      },
    ];

    const allRoles = [];

    // Create system roles
    for (const roleData of systemRoles) {
      allRoles.push(roleData);
    }

    // Create department roles (Admin, Manager, Staff for each department)
    for (const department of departments) {
      if (department === "Admin") continue; // Skip Admin department for regular roles

      for (const roleType of roleTypes) {
        allRoles.push({
          role: roleType.role,
          department: department,
          description: `${department} ${roleType.description}`,
        });
      }
    }

    // Add special Admin department roles
    allRoles.push({
      role: "Admin",
      department: "Admin",
      description: "System administrator with full admin access",
    });

    const seededRoles = [];
    for (const roleData of allRoles) {
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
    console.log("🌱 Assigning permissions based on role hierarchy...");

    const permissions = await Permission.getAll();
    const roles = await Roles.getAll();

    // Create permission maps
    const permissionMap = {};
    permissions.forEach((perm) => {
      permissionMap[perm.permission_name] = perm.permission_id;
    });

    const roleMap = {};
    roles.forEach((role) => {
      const key = `${role.role}-${role.department}`;
      roleMap[key] = role.role_id;
    });

    // Define role-permission mappings based on your hierarchy
    const rolePermissionMappings = {
      // Super Admin - ALL permissions
      "Super Admin-Admin": permissions.map((p) => p.permission_id),

      // System Admin - All admin permissions
      "Admin-Admin": [
        permissionMap["Manage System Settings"],
        permissionMap["Manage User Management"],
        permissionMap["Manage Role Management"],
        permissionMap["Manage Dashboard"],
        permissionMap["Manage Branches"],
      ].filter(Boolean),

      // HR Department
      "Admin-Human Resource": [
        // HR Admin - All HR permissions (full CRUD)
        permissionMap["Manage HR Dashboard"],
        permissionMap["Manage Employees"],
        permissionMap["View Employee Records"],
        permissionMap["Manage  Attendance"],
        permissionMap["View Attendance Reports"],
        permissionMap["Manage Employee Leave"],
        permissionMap["Approve Leave Requests"],
        permissionMap["View Leave Reports"],
        permissionMap["Manage Payroll"],
        permissionMap["Process Payroll"],
        permissionMap["View Payroll Reports"],
      ].filter(Boolean),

      "Manager-Human Resource": [
        // HR Manager - Most operations, approvals, reports
        permissionMap["Manage HR Dashboard"],
        permissionMap["Manage Employees"],
        permissionMap["View Employee Records"],
        permissionMap["Manage Attendance"],
        permissionMap["Manage  Attendance"],
        permissionMap["View Attendance Reports"],
        permissionMap["Manage Employee Leave"],
        permissionMap["Approve Leave Requests"],
        permissionMap["View Leave Reports"],
        permissionMap["View Payroll Reports"],
      ].filter(Boolean),

      "Staff-Human Resource": [
        // HR Staff - Basic operations, limited access
        permissionMap["Manage HR Dashboard"],
        permissionMap["Manage Employees"],
        permissionMap["View Employee Records"],
        permissionMap["Manage Attendance"],
        permissionMap["Manage  Attendance"],
        permissionMap["Manage Employee Leave"],
      ].filter(Boolean),

      // Finance Department
      "Admin-Finance": [
        // Finance Admin - All finance permissions
        permissionMap["Manage Finance Department"],
      ].filter(Boolean),

      "Manager-Finance": [
        // Finance Manager - Most operations, approvals
        permissionMap["Manage Finance Department"],
      ].filter(Boolean),

      "Staff-Finance": [
        // Finance Staff - Basic operations
        permissionMap["Manage Finance Department"],
      ].filter(Boolean),

      // Supply Chain Department
      "Admin-Supply Chain": [
        // SCM Admin - All SCM permissions
        permissionMap["Manage SCM Dashboard"],
        permissionMap["Manage Inventory"],
        permissionMap["View Inventory Reports"],
        permissionMap["Manage Suppliers"],
        permissionMap["View Supplier Records"],
        permissionMap["Manage Purchase Orders"],
        permissionMap["Approve Purchase Orders"],
        permissionMap["View Purchase Reports"],
      ].filter(Boolean),

      "Manager-Supply Chain": [
        // SCM Manager - Most operations, approvals
        permissionMap["Manage SCM Dashboard"],
        permissionMap["Manage Inventory"],
        permissionMap["View Inventory Reports"],
        permissionMap["View Supplier Records"],
        permissionMap["Approve Purchase Orders"],
        permissionMap["View Purchase Reports"],
      ].filter(Boolean),

      "Staff-Supply Chain": [
        // SCM Staff - Basic operations
        permissionMap["Manage SCM Dashboard"],
        permissionMap["View Inventory Reports"],
        permissionMap["View Supplier Records"],
        permissionMap["Manage Purchase Orders"],
      ].filter(Boolean),

      // Production Department
      "Admin-Production": [
        // Production Admin - All production permissions
        permissionMap["Manage Production Dashboard"],
        permissionMap["View Production Reports"],
        permissionMap["Manage Quality Control"],

        permissionMap["View Quality Reports"],
        permissionMap["Manage Production Schedule"],
        permissionMap["View Production Status"],
        permissionMap["Manage Equipment"],
      ].filter(Boolean),

      "Manager-Production": [
        // Production Manager - Most operations, scheduling
        permissionMap["Manage Production Dashboard"],
        permissionMap["View Production Reports"],
        permissionMap["View Quality Reports"],
        permissionMap["Manage Production Schedule"],
        permissionMap["View Production Status"],
      ].filter(Boolean),

      "Staff-Production": [
        // Production Staff - Basic operations, quality checks
        permissionMap["Manage Production Dashboard"],
        permissionMap["View Production Reports"],
        permissionMap["View Production Status"],
      ].filter(Boolean),

      // Customer Relationship Department
      "Admin-Customer Relationship": [
        // CRM Admin - All CRM permissions
        permissionMap["Manage CRM Dashboard"],
        permissionMap["Manage Customers"],
        permissionMap["View Customer Feedback"],
      ].filter(Boolean),

      "Manager-Customer Relationship": [
        // CRM Manager - Most operations, reports
        permissionMap["Manage CRM Dashboard"],
        permissionMap["View Customer Feedback"],
      ].filter(Boolean),

      "Staff-Customer Relationship": [
        // CRM Staff - Basic operations, customer support
        permissionMap["Manage CRM Dashboard"],
        permissionMap["View Customer Feedback"],
      ].filter(Boolean),

      // Branch Department
      "Manager-Branch": [
        // Branch Manager - Full branch operations
        permissionMap["Manage Dashboard"],
        permissionMap["Manage Inventory"],
        permissionMap["View Inventory Reports"],
        permissionMap["Manage Sales Order"],
        permissionMap["Manage Payment"],
        permissionMap["Manage Customer"],
        permissionMap["Manage Employees"],
        permissionMap["View Employee Records"],
        permissionMap["Manage  Attendance"],
        permissionMap["View Attendance Reports"],
      ].filter(Boolean),

      "Cook-Branch": [
        // Cook - Inventory and production access
        permissionMap["Manage Dashboard"],
        permissionMap["Manage Inventory"],
        permissionMap["View Inventory Reports"],
        permissionMap["Manage Production"],
        permissionMap["View Production Reports"],
      ].filter(Boolean),

      "Kitchen Assistant-Branch": [
        // Kitchen Assistant - Basic inventory access
        permissionMap["Manage Dashboard"],
        permissionMap["Manage Inventory"],
        permissionMap["View Inventory Reports"],
      ].filter(Boolean),

      "Cashier-Branch": [
        // Cashier - Sales and payment access
        permissionMap["Manage Dashboard"],
        permissionMap["Manage Sales Order"],
        permissionMap["Manage Payment"],
        permissionMap["Manage Customer"],
      ].filter(Boolean),

      "Waiter-Branch": [
        // Waiter - Customer service access
        permissionMap["Manage Dashboard"],
        permissionMap["Manage Customer"],
        permissionMap["Manage Sales Order"],
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

async function createDefaultUsers() {
  try {
    console.log("🌱 Creating default system administrator...");

    const roles = await Roles.getAll();
    const superAdminRole = roles.find(
      (role) => role.role === "Super Admin" && role.department === "Admin"
    );

    if (!superAdminRole) {
      console.log("❌ Super Admin role not found. Skipping user creation.");
      return [];
    }

    const adminUser = {
      name: "System Administrator",
      email: "admin@countryside.com",
      password: "admin123",
      role_id: superAdminRole.role_id,
      department: "Admin",
    };

    try {
      const existingUser = await Employee.findByEmail(adminUser.email);

      if (!existingUser) {
        const newUser = await Employee.create(adminUser);
        console.log(`✅ Created system administrator: ${adminUser.name}`);

        console.log("\n🔑 System Administrator Credentials:");
        console.log("Email: admin@countryside.com");
        console.log("Password: admin123");
        console.log("Role: Super Admin (Full System Access)");
        console.log(
          "\n⚠️  Security Notice: Change default password immediately after first login!"
        );

        return [newUser];
      } else {
        console.log(
          `⏭️  System administrator already exists: ${adminUser.email}`
        );
        return [];
      }
    } catch (error) {
      console.error(`❌ Error creating system administrator:`, error.message);
      return [];
    }
  } catch (error) {
    console.error("❌ Error creating default users:", error);
    throw error;
  }
}

async function seedAll() {
  try {
    console.log("🚀 Initializing Countryside Steak House RBAC System...");
    console.log("=======================================================");
    console.log("📋 Role Structure:");
    console.log("   • Super Admin: Full system access");
    console.log("   • Admin: Full department CRUD operations");
    console.log("   • Manager: Most operations + approvals");
    console.log("   • Staff: Basic operations only");
    console.log("=======================================================");

    await seedDefaultPermissions();
    await seedDefaultRoles();
    await assignDefaultPermissions();
    await createDefaultUsers();

    console.log("=======================================================");
    console.log("🎉 RBAC System initialization completed successfully!");
    console.log("🏢 Departments: HR, Finance, SCM, Production, CRM");
    console.log("👥 Roles per department: Admin, Manager, Staff");
    console.log("🌐 System is ready for use!");
    console.log("=======================================================");
  } catch (error) {
    console.error("💥 Error during RBAC system initialization:", error);
    throw error;
  }
}

module.exports = {
  seedDefaultPermissions,
  seedDefaultRoles,
  assignDefaultPermissions,
  createDefaultUsers,
  seedAll,
};

// If running this file directly
if (require.main === module) {
  seedAll()
    .then(() => {
      console.log("✅ RBAC System initialization completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ RBAC System initialization failed:", error);
      process.exit(1);
    });
}
