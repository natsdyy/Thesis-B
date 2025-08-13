const { db } = require("../config/database");

class Permission {
  // Get all permissions
  static async getAll() {
    try {
      const permissions = await db("user_permissions")
        .select("*")
        .orderBy("permission_name", "asc");
      return permissions;
    } catch (error) {
      console.error("Error fetching permissions:", error);
      throw error;
    }
  }

  // Get permission by ID
  static async getById(permission_id) {
    try {
      const permission = await db("user_permissions")
        .select("*")
        .where("permission_id", permission_id)
        .first();
      return permission;
    } catch (error) {
      console.error("Error fetching permission by ID:", error);
      throw error;
    }
  }

  // Create new permission
  static async create({ permission_name }) {
    try {
      const [permission] = await db("user_permissions")
        .insert({
          permission_name: permission_name.trim(),
        })
        .returning("*");
      return permission;
    } catch (error) {
      console.error("Error creating permission:", error);
      throw error;
    }
  }

  // Update permission
  static async update(permission_id, { permission_name }) {
    try {
      const [permission] = await db("user_permissions")
        .where("permission_id", permission_id)
        .update({
          permission_name: permission_name.trim(),
        })
        .returning("*");
      return permission;
    } catch (error) {
      console.error("Error updating permission:", error);
      throw error;
    }
  }

  // Delete permission
  static async delete(permission_id) {
    try {
      const deletedCount = await db("user_permissions")
        .where("permission_id", permission_id)
        .del();
      return deletedCount > 0;
    } catch (error) {
      console.error("Error deleting permission:", error);
      throw error;
    }
  }

  // Seed department-specific permissions
  static async seedDefaultPermissions() {
    try {
      const departmentPermissions = {
        // System Administration
        Admin: [
          "Manage System Settings",
          "Manage User Management",
          "Manage Role Management",
          "Manage Dashboard",
          "Manage Branches",
        ],

        // Human Resource Department
        "Human Resource": [
          "Manage HR Dashboard",
          "Manage Employees",
          "View Employee Records",
          "Manage  Attendance",
          "View Attendance Reports",
          "Manage Employee Leave",
          "Approve Leave Requests",
          "View Leave Reports",
          "Manage Payroll",
          "Process Payroll",
          "View Payroll Reports",
        ],

        // Finance Department
        Finance: ["Manage Finance Department"],

        // Supply Chain Management
        "Supply Chain": [
          "Manage SCM Dashboard",
          "Manage Inventory",
          "View Inventory Reports",
          "Manage Suppliers",
          "View Supplier Records",
          "Manage Purchase Orders",
          "Approve Purchase Orders",
          "View Purchase Reports",
        ],

        // Production Department
        Production: [
          "Manage Production Dashboard",
          "View Production Reports",
          "Manage Quality Control",
          "View Quality Reports",
          "Manage Production Schedule",
          "View Production Status",
          "Manage Equipment",
        ],

        // Customer Relationship Management
        "Customer Relationship": [
          "Manage CRM Dashboard",
          "Manage Customers",
          "View Customer Feedback",
        ],
      };

      const allPermissions = [];

      // Flatten all permissions into a single array
      Object.values(departmentPermissions).forEach((permissions) => {
        permissions.forEach((permission) => {
          if (!allPermissions.includes(permission)) {
            allPermissions.push(permission);
          }
        });
      });

      const seededPermissions = [];

      for (const permissionName of allPermissions) {
        try {
          // Check if permission already exists
          const existingPermission = await db("user_permissions")
            .where("permission_name", permissionName)
            .first();

          if (!existingPermission) {
            const newPermission = await this.create({
              permission_name: permissionName,
            });
            seededPermissions.push(newPermission);
            console.log(`✅ Created permission: ${permissionName}`);
          } else {
            console.log(`⏭️  Permission already exists: ${permissionName}`);
          }
        } catch (error) {
          console.error(
            `❌ Error creating permission ${permissionName}:`,
            error.message
          );
        }
      }

      return seededPermissions;
    } catch (error) {
      console.error("Error seeding default permissions:", error);
      throw error;
    }
  }
}

module.exports = Permission;
