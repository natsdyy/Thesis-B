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
  static async create({ permission_name, permission_key, module }) {
    try {
      const [permission] = await db("user_permissions")
        .insert({
          permission_name: permission_name.trim(),
          permission_key: (permission_key || permission_name).trim().toLowerCase().replace(/\s+/g, ":"),
          module: module || "system",
        })
        .returning("*");
      return permission;
    } catch (error) {
      console.error("Error creating permission:", error);
      throw error;
    }
  }

  // Update permission
  static async update(permission_id, { permission_name, permission_key, module }) {
    try {
      const updateData = {
        permission_name: permission_name.trim(),
        updated_at: new Date()
      };
      
      if (permission_key) updateData.permission_key = permission_key.trim();
      if (module) updateData.module = module.trim();

      const [permission] = await db("user_permissions")
        .where("permission_id", permission_id)
        .update(updateData)
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
          { name: "Manage System Settings", key: "system:settings" },
          { name: "Manage User Management", key: "users:manage" },
          { name: "Manage Role Management", key: "roles:manage" },
          { name: "Manage Dashboard", key: "dashboard:manage" },
          { name: "Manage Branches", key: "branches:manage" },
        ],

        // Human Resource Department
        "Human Resource": [
          { name: "Manage HR Dashboard", key: "hr:dashboard" },
          { name: "Manage Employees", key: "employees:manage" },
          { name: "View Employee Records", key: "employees:view" },
          { name: "Manage  Attendance", key: "attendance:manage" },
          { name: "View Attendance Reports", key: "attendance:reports" },
          { name: "Manage Employee Leave", key: "leave:manage" },
          { name: "Approve Leave Requests", key: "leave:approve" },
          { name: "View Leave Reports", key: "leave:reports" },
          { name: "Manage Payroll", key: "payroll:manage" },
          { name: "Process Payroll", key: "payroll:process" },
          { name: "View Payroll Reports", key: "payroll:reports" },
        ],

        // Finance Department
        Finance: [
          { name: "Manage Finance Department", key: "finance:manage" }
        ],

        // Supply Chain Management
        "Supply Chain": [
          { name: "Manage SCM Dashboard", key: "scm:dashboard" },
          { name: "Manage Inventory", key: "inventory:manage" },
          { name: "View Inventory Reports", key: "inventory:reports" },
          { name: "Manage Suppliers", key: "suppliers:manage" },
          { name: "View Supplier Records", key: "suppliers:view" },
          { name: "Manage Purchase Orders", key: "po:manage" },
          { name: "Approve Purchase Orders", key: "po:approve" },
          { name: "View Purchase Reports", key: "po:reports" },
        ],

        // Production Department
        Production: [
          { name: "Manage Production Dashboard", key: "production:dashboard" },
          { name: "View Production Reports", key: "production:reports" },
          { name: "Manage Quality Control", key: "quality:manage" },
          { name: "View Quality Reports", key: "quality:reports" },
          { name: "Manage Production Schedule", key: "production:schedule" },
          { name: "View Production Status", key: "production:status" },
          { name: "Manage Equipment", key: "equipment:manage" },
        ],

        // Customer Relationship Management
        "Customer Relationship": [
          { name: "Manage CRM Dashboard", key: "crm:dashboard" },
          { name: "Manage Customers", key: "customers:manage" },
          { name: "View Customer Feedback", key: "feedback:view" },
        ],
      };

      const seededPermissions = [];

      for (const [dept, perms] of Object.entries(departmentPermissions)) {
        const module = dept.toLowerCase().replace(/\s+/g, "_");
        
        for (const p of perms) {
          try {
            // Check if permission already exists by key or name
            const existingPermission = await db("user_permissions")
              .where("permission_key", p.key)
              .orWhere("permission_name", p.name)
              .first();

            if (!existingPermission) {
              const newPermission = await this.create({
                permission_name: p.name,
                permission_key: p.key,
                module: module
              });
              seededPermissions.push(newPermission);
              console.log(`✅ Created permission: ${p.name}`);
            } else {
              console.log(`⏭️  Permission already exists: ${p.name}`);
            }
          } catch (error) {
            console.error(
              `❌ Error creating permission ${p.name}:`,
              error.message
            );
          }
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
