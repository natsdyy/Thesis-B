const { db } = require("../config/database");

class Roles {
  // Get all roles
  static async getAll(includeDeleted = false) {
    try {
      let query = db("user_roles").select("*");
      if (!includeDeleted) {
        query = query.whereNull("deleted_at");
      }
      const roles = await query.orderBy("created_at", "desc");
      return roles;
    } catch (error) {
      console.error("Error fetching roles:", error);
      throw error;
    }
  }

  // Get role by ID
  static async getById(role_id) {
    try {
      const role = await db("user_roles")
        .select("*")
        .where("role_id", role_id)
        .whereNull("deleted_at")
        .first();
      return role;
    } catch (error) {
      console.error("Error fetching role by ID:", error);
      throw error;
    }
  }

  // Check if role exists in department (case insensitive) - Helper method
  static async checkDuplicateRole(role, department, excludeRoleId = null) {
    try {
      let query = db("user_roles")
        .select("*")
        .whereRaw("LOWER(role) = LOWER(?)", [role])
        .whereRaw("LOWER(department) = LOWER(?)", [department])
        .whereNull("deleted_at");

      if (excludeRoleId) {
        query = query.whereNot("role_id", excludeRoleId);
      }

      const existingRole = await query.first();
      return existingRole;
    } catch (error) {
      console.error("Error checking duplicate role:", error);
      throw error;
    }
  }

  // Create new role
  static async create(roleData) {
    const { role, department, description } = roleData;
    try {
      // Check if role already exists in the same department (case insensitive)
      const existingRole = await this.checkDuplicateRole(
        role,
        department,
        null
      );

      if (existingRole) {
        const error = new Error(
          `Role "${role}" already exists in ${department} department`
        );
        error.code = "DUPLICATE_ROLE";
        throw error;
      }

      const [newRole] = await db("user_roles")
        .insert({
          role,
          department,
          description,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
          is_active: true,
        })
        .returning("*");
      return newRole;
    } catch (error) {
      console.error("Error creating role:", error);
      throw error;
    }
  }

  // Update role
  static async update(role_id, roleData) {
    const { role, department, description } = roleData;
    try {
      // Check if role exists
      const currentRole = await this.getById(role_id);
      if (!currentRole) {
        const error = new Error("Role not found");
        error.code = "ROLE_NOT_FOUND";
        throw error;
      }

      // Check if another role with the same name exists in the same department (excluding current role)
      const existingRole = await this.checkDuplicateRole(
        role,
        department,
        role_id
      );

      if (existingRole) {
        const error = new Error(
          `Role "${role}" already exists in ${department} department`
        );
        error.code = "DUPLICATE_ROLE";
        throw error;
      }

      const [updatedRole] = await db("user_roles")
        .where("role_id", role_id)
        .update({
          role,
          department,
          description,
          updated_at: db.fn.now(),
        })
        .returning("*");
      return updatedRole;
    } catch (error) {
      console.error("Error updating role:", error);
      throw error;
    }
  }

  // Soft delete role
  static async delete(role_id) {
    try {
      // Check if role exists before deleting
      const currentRole = await this.getById(role_id);
      if (!currentRole) {
        const error = new Error("Role not found");
        error.code = "ROLE_NOT_FOUND";
        throw error;
      }

      const [deletedRole] = await db("user_roles")
        .where("role_id", role_id)
        .update({
          deleted_at: db.fn.now(),
          updated_at: db.fn.now(),
          is_active: false,
        })
        .returning("*");
      return deletedRole;
    } catch (error) {
      console.error("Error deleting role:", error);
      throw error;
    }
  }

  // Restore role
  static async restore(role_id) {
    try {
      // First check if the role exists (including deleted ones)
      const roleToRestore = await db("user_roles")
        .select("*")
        .where("role_id", role_id)
        .first();

      if (!roleToRestore) {
        const error = new Error("Role not found");
        error.code = "ROLE_NOT_FOUND";
        throw error;
      }

      // Check if the role is actually deleted
      if (!roleToRestore.deleted_at) {
        const error = new Error("Role is not deleted and cannot be restored");
        error.code = "ROLE_NOT_DELETED";
        throw error;
      }

      // Check if restoring this role would create a duplicate in the same department
      const existingActiveRole = await this.checkDuplicateRole(
        roleToRestore.role,
        roleToRestore.department
      );

      if (existingActiveRole) {
        const error = new Error(
          `Cannot restore: Role "${roleToRestore.role}" already exists in ${roleToRestore.department} department`
        );
        error.code = "DUPLICATE_ROLE";
        throw error;
      }

      const [restoredRole] = await db("user_roles")
        .where("role_id", role_id)
        .update({
          deleted_at: null,
          updated_at: db.fn.now(),
          is_active: true,
        })
        .returning("*");
      return restoredRole;
    } catch (error) {
      console.error("Error restoring role:", error);
      throw error;
    }
  }

  // Get deleted roles only
  static async getDeleted() {
    try {
      const deletedRoles = await db("user_roles")
        .select("*")
        .whereNotNull("deleted_at")
        .orderBy("deleted_at", "desc");
      return deletedRoles;
    } catch (error) {
      console.error("Error fetching deleted roles:", error);
      throw error;
    }
  }

  // Get role count
  static async getCount(includeDeleted = false) {
    try {
      let query = db("user_roles").count("* as count");
      if (!includeDeleted) {
        query = query.whereNull("deleted_at");
      }
      const result = await query.first();
      return parseInt(result.count);
    } catch (error) {
      console.error("Error getting role count:", error);
      throw error;
    }
  }

  // Get roles by department
  static async getByDepartment(department, includeDeleted = false) {
    try {
      let query = db("user_roles")
        .select("*")
        .whereRaw("LOWER(department) = LOWER(?)", [department]);

      if (!includeDeleted) {
        query = query.whereNull("deleted_at");
      }

      const roles = await query.orderBy("created_at", "desc");
      return roles;
    } catch (error) {
      console.error("Error fetching roles by department:", error);
      throw error;
    }
  }
}

module.exports = Roles;
