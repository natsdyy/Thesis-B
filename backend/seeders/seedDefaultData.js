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
    console.log("🌱 Creating default system administrator and demo accounts...");

    const roles = await Roles.getAll();
    const superAdminRole = roles.find(
      (role) => role.role === "Super Admin" && role.department === "Admin"
    );

    if (!superAdminRole) {
      console.log("❌ Super Admin role not found. Skipping user creation.");
      return [];
    }

    // ─── Define all demo accounts ───────────────────────────────────
    const demoAccounts = [
      // Super Admin (original)
      {
        first_name: "System",
        last_name: "Administrator",
        email: "admin@countryside.com",
        password: "admin123",
        role_id: superAdminRole.role_id,
        department: "Admin",
        phone_number: "09123456789",
        address: "Main Office",
        postal_code: "1000",
        civil_status: "Single",
        sex: "Male",
        birthday: "1990-01-01",
        age: 34,
        citizenship: "Filipino",
        employee_type: "Full-time",
        pagibig_number: "000000000001",
        sss_number: "0000000001",
        philhealth_number: "000000000001",
        emergency_contact_name: "Admin Support",
        emergency_relationship: "Other",
        emergency_contact_number: "09123456789",
        emergency_contact_address: "Main Office",
      },
      // HR Admin
      {
        first_name: "HR",
        last_name: "Demo",
        email: "hr@countryside.com",
        password: "demo123",
        roleLookup: { role: "Admin", department: "Human Resource" },
        department: "Human Resource",
        phone_number: "09234567890",
        address: "Main Office",
        postal_code: "1000",
        civil_status: "Single",
        sex: "Female",
        birthday: "1992-03-15",
        age: 32,
        citizenship: "Filipino",
        employee_type: "Full-time",
        pagibig_number: "000000000002",
        sss_number: "0000000002",
        philhealth_number: "000000000002",
        emergency_contact_name: "HR Support",
        emergency_relationship: "Other",
        emergency_contact_number: "09234567890",
        emergency_contact_address: "Main Office",
      },
      // Finance Admin
      {
        first_name: "Finance",
        last_name: "Demo",
        email: "finance@countryside.com",
        password: "demo123",
        roleLookup: { role: "Admin", department: "Finance" },
        department: "Finance",
        phone_number: "09345678901",
        address: "Main Office",
        postal_code: "1000",
        civil_status: "Single",
        sex: "Male",
        birthday: "1991-06-20",
        age: 33,
        citizenship: "Filipino",
        employee_type: "Full-time",
        pagibig_number: "000000000003",
        sss_number: "0000000003",
        philhealth_number: "000000000003",
        emergency_contact_name: "Finance Support",
        emergency_relationship: "Other",
        emergency_contact_number: "09345678901",
        emergency_contact_address: "Main Office",
      },
      // Supply Chain Admin
      {
        first_name: "Supply",
        last_name: "Demo",
        email: "supply@countryside.com",
        password: "demo123",
        roleLookup: { role: "Admin", department: "Supply Chain" },
        department: "Supply Chain",
        phone_number: "09456789012",
        address: "Main Office",
        postal_code: "1000",
        civil_status: "Married",
        sex: "Male",
        birthday: "1988-09-10",
        age: 36,
        citizenship: "Filipino",
        employee_type: "Full-time",
        pagibig_number: "000000000004",
        sss_number: "0000000004",
        philhealth_number: "000000000004",
        emergency_contact_name: "SCM Support",
        emergency_relationship: "Other",
        emergency_contact_number: "09456789012",
        emergency_contact_address: "Main Office",
      },
      // Production Admin
      {
        first_name: "Production",
        last_name: "Demo",
        email: "production@countryside.com",
        password: "demo123",
        roleLookup: { role: "Admin", department: "Production" },
        department: "Production",
        phone_number: "09567890123",
        address: "Main Office",
        postal_code: "1000",
        civil_status: "Single",
        sex: "Female",
        birthday: "1993-12-05",
        age: 31,
        citizenship: "Filipino",
        employee_type: "Full-time",
        pagibig_number: "000000000005",
        sss_number: "0000000005",
        philhealth_number: "000000000005",
        emergency_contact_name: "Production Support",
        emergency_relationship: "Other",
        emergency_contact_number: "09567890123",
        emergency_contact_address: "Main Office",
      },
      // CRM Admin
      {
        first_name: "CRM",
        last_name: "Demo",
        email: "crm@countryside.com",
        password: "demo123",
        roleLookup: { role: "Admin", department: "Customer Relationship" },
        department: "Customer Relationship",
        phone_number: "09678901234",
        address: "Main Office",
        postal_code: "1000",
        civil_status: "Single",
        sex: "Female",
        birthday: "1994-04-18",
        age: 30,
        citizenship: "Filipino",
        employee_type: "Full-time",
        pagibig_number: "000000000006",
        sss_number: "0000000006",
        philhealth_number: "000000000006",
        emergency_contact_name: "CRM Support",
        emergency_relationship: "Other",
        emergency_contact_number: "09678901234",
        emergency_contact_address: "Main Office",
      },
      // Branch Manager (Main Branch) - for POS & Inventory access
      {
        first_name: "Branch",
        last_name: "Manager",
        email: "branch@countryside.com",
        password: "demo123",
        roleLookup: { role: "Manager", department: "Branch" },
        department: "Branch",
        branch_id: 1, // Main Branch
        phone_number: "09789012345",
        address: "Main Branch",
        postal_code: "1000",
        civil_status: "Married",
        sex: "Male",
        birthday: "1989-07-22",
        age: 35,
        citizenship: "Filipino",
        employee_type: "Full-time",
        pagibig_number: "000000000007",
        sss_number: "0000000007",
        philhealth_number: "000000000007",
        emergency_contact_name: "Branch Support",
        emergency_relationship: "Spouse",
        emergency_contact_number: "09789012345",
        emergency_contact_address: "Main Branch",
      },
      // Branch Cashier (Main Branch) - for POS access
      {
        first_name: "Branch",
        last_name: "Cashier",
        email: "cashier@countryside.com",
        password: "demo123",
        roleLookup: { role: "Cashier", department: "Branch" },
        department: "Branch",
        branch_id: 1, // Main Branch
        phone_number: "09890123456",
        address: "Main Branch",
        postal_code: "1000",
        civil_status: "Single",
        sex: "Female",
        birthday: "1996-11-30",
        age: 28,
        citizenship: "Filipino",
        employee_type: "Full-time",
        pagibig_number: "000000000008",
        sss_number: "0000000008",
        philhealth_number: "000000000008",
        emergency_contact_name: "Cashier Support",
        emergency_relationship: "Parent",
        emergency_contact_number: "09890123456",
        emergency_contact_address: "Main Branch",
      },
    ];

    const createdUsers = [];

    for (const account of demoAccounts) {
      try {
        // Resolve role_id for non-Super Admin accounts
        if (account.roleLookup) {
          const matchedRole = roles.find(
            (r) =>
              r.role.toLowerCase() === account.roleLookup.role.toLowerCase() &&
              r.department.toLowerCase() === account.roleLookup.department.toLowerCase()
          );
          if (!matchedRole) {
            console.log(
              `⚠️  Role ${account.roleLookup.role} - ${account.roleLookup.department} not found. Skipping ${account.email}`
            );
            continue;
          }
          account.role_id = matchedRole.role_id;
          delete account.roleLookup;
        }

        const existingUser = await Employee.findByEmail(account.email);

        if (!existingUser) {
          const newUser = await Employee.create(account);
          createdUsers.push(newUser);
          console.log(
            `✅ Created demo account: ${account.first_name} ${account.last_name} (${account.email})`
          );
        } else {
          console.log(`⏭️  Account already exists: ${account.email}`);
        }
      } catch (error) {
        console.error(
          `❌ Error creating account ${account.email}:`,
          error.message
        );
      }
    }

    // Print all demo credentials
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("🔑 DEMO LOGIN CREDENTIALS (saved locally)");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("┌──────────────────────────────┬──────────────────────────────┬──────────┐");
    console.log("│ Role                         │ Email                        │ Password │");
    console.log("├──────────────────────────────┼──────────────────────────────┼──────────┤");
    console.log("│ Super Admin                  │ admin@countryside.com        │ admin123 │");
    console.log("│ HR Admin                     │ hr@countryside.com           │ demo123  │");
    console.log("│ Finance Admin                │ finance@countryside.com      │ demo123  │");
    console.log("│ Supply Chain Admin            │ supply@countryside.com       │ demo123  │");
    console.log("│ Production Admin              │ production@countryside.com   │ demo123  │");
    console.log("│ CRM Admin                    │ crm@countryside.com          │ demo123  │");
    console.log("│ Branch Manager (Main)         │ branch@countryside.com       │ demo123  │");
    console.log("│ Branch Cashier (Main)         │ cashier@countryside.com      │ demo123  │");
    console.log("└──────────────────────────────┴──────────────────────────────┴──────────┘");
    console.log("⚠️  These are demo accounts for evaluation purposes only.");
    console.log("═══════════════════════════════════════════════════════════════\n");

    return createdUsers;
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
