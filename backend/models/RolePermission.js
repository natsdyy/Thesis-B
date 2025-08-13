const { db } = require("../config/database");

class RolePermission {
  // Get all role-permission mappings
  static async getAll() {
    try {
      const rolePermissions = await db("role_permissions")
        .join("user_roles", "role_permissions.role_id", "user_roles.role_id")
        .join(
          "user_permissions",
          "role_permissions.permission_id",
          "user_permissions.permission_id"
        )
        .select(
          "role_permissions.*",
          "user_roles.role",
          "user_roles.department",
          "user_permissions.permission_name"
        )
        .orderBy("user_roles.role", "asc")
        .orderBy("user_permissions.permission_name", "asc");

      return rolePermissions;
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      throw error;
    }
  }

  // Get permissions for a specific role
  static async getPermissionsByRole(role_id) {
    try {
      const permissions = await db("role_permissions")
        .join(
          "user_permissions",
          "role_permissions.permission_id",
          "user_permissions.permission_id"
        )
        .select("user_permissions.*")
        .where("role_permissions.role_id", role_id);

      return permissions;
    } catch (error) {
      console.error("Error fetching permissions by role:", error);
      throw error;
    }
  }

  // Assign permission to role
  static async assignPermissionToRole(role_id, permission_id) {
    try {
      // Check if assignment already exists
      const existing = await db("role_permissions")
        .where({ role_id, permission_id })
        .first();

      if (existing) {
        return existing;
      }

      const [rolePermission] = await db("role_permissions")
        .insert({
          role_id,
          permission_id,
        })
        .returning("*");

      return rolePermission;
    } catch (error) {
      console.error("Error assigning permission to role:", error);
      throw error;
    }
  }

  // Remove permission from role
  static async removePermissionFromRole(role_id, permission_id) {
    try {
      const deletedCount = await db("role_permissions")
        .where({ role_id, permission_id })
        .del();

      return deletedCount > 0;
    } catch (error) {
      console.error("Error removing permission from role:", error);
      throw error;
    }
  }

  // Bulk assign permissions to role
  static async bulkAssignPermissionsToRole(role_id, permission_ids) {
    try {
      // First, remove existing permissions for this role
      await db("role_permissions").where("role_id", role_id).del();

      // Then insert new permissions
      const assignments = permission_ids.map((permission_id) => ({
        role_id,
        permission_id,
      }));

      if (assignments.length > 0) {
        await db("role_permissions").insert(assignments);
      }

      return assignments;
    } catch (error) {
      console.error("Error bulk assigning permissions to role:", error);
      throw error;
    }
  }

  // Get roles that have a specific permission
  static async getRolesByPermission(permission_id) {
    try {
      const roles = await db("role_permissions")
        .join("user_roles", "role_permissions.role_id", "user_roles.role_id")
        .select("user_roles.*")
        .where("role_permissions.permission_id", permission_id);

      return roles;
    } catch (error) {
      console.error("Error fetching roles by permission:", error);
      throw error;
    }
  }
}

module.exports = RolePermission;
