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

  // Seed default permissions for your simplified structure
  static async seedDefaultPermissions() {
    try {
      const defaultPermissions = [
        { permission_name: "View Dashboard" },
        { permission_name: "Manage Users" },
        { permission_name: "Manage Roles" },
        { permission_name: "Manage Attendance" },
        { permission_name: "Manage Employee" },
        { permission_name: "Manage Leave" },
        { permission_name: "Manage Payroll" },
        { permission_name: "Manage Inventory" },
        { permission_name: "Manage Purchase Order" },
        { permission_name: "Manage Sales Order" },
        { permission_name: "Manage Payment" },
        { permission_name: "Manage Supplier" },
        { permission_name: "Manage Production" },
        { permission_name: "Manage Quality Control" },
        { permission_name: "Manage Customer" },
      ];

      const seededPermissions = [];
      
      for (const permData of defaultPermissions) {
        try {
          // Check if permission already exists
          const existingPermission = await db("user_permissions")
            .where("permission_name", permData.permission_name)
            .first();

          if (!existingPermission) {
            const newPermission = await this.create(permData);
            seededPermissions.push(newPermission);
            console.log(`✅ Created permission: ${permData.permission_name}`);
          } else {
            console.log(`⏭️  Permission already exists: ${permData.permission_name}`);
          }
        } catch (error) {
          console.error(`❌ Error creating permission ${permData.permission_name}:`, error.message);
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
