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

  // Get role with permissions
  static async getByIdWithPermissions(role_id) {
    try {
      const role = await this.getById(role_id);
      if (!role) {
        return null;
      }

      const permissions = await db("user_permissions")
        .select("user_permissions.*")
        .join(
          "role_permissions",
          "user_permissions.permission_id",
          "role_permissions.permission_id"
        )
        .where("role_permissions.role_id", role_id)
        .where("role_permissions.is_active", true)
        .whereNull("role_permissions.deleted_at")
        .orderBy("user_permissions.permission_name", "asc");

      return {
        ...role,
        permissions,
      };
    } catch (error) {
      console.error("Error fetching role with permissions:", error);
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
          role: role.trim(),
          department: department.trim(),
          description: description.trim(),
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

  // Create role with permissions
  static async createWithPermissions(roleData) {
    const { role, department, description, permission_ids = [] } = roleData;

    const trx = await db.transaction();
    try {
      // Create role
      const [newRole] = await trx("user_roles")
        .insert({
          role: role.trim(),
          department: department.trim(),
          description: description.trim(),
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
          is_active: true,
        })
        .returning("*");

      // Assign permissions if provided
      if (permission_ids && permission_ids.length > 0) {
        const rolePermissions = permission_ids.map((permission_id) => ({
          role_id: newRole.role_id,
          permission_id,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
          is_active: true,
        }));

        await trx("role_permissions").insert(rolePermissions);
      }

      await trx.commit();
      return await this.getByIdWithPermissions(newRole.role_id);
    } catch (error) {
      await trx.rollback();
      console.error("Error creating role with permissions:", error);
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
          role: role.trim(),
          department: department.trim(),
          description: description.trim(),
          updated_at: db.fn.now(),
        })
        .returning("*");
      return updatedRole;
    } catch (error) {
      console.error("Error updating role:", error);
      throw error;
    }
  }

  // Update role with permissions
  static async updateWithPermissions(role_id, roleData) {
    const { role, department, description, permission_ids = [] } = roleData;

    const trx = await db.transaction();
    try {
      // Update role
      const [updatedRole] = await trx("user_roles")
        .where("role_id", role_id)
        .update({
          role: role.trim(),
          department: department.trim(),
          description: description.trim(),
          updated_at: db.fn.now(),
        })
        .returning("*");

      // Remove all current permissions for this role
      await trx("role_permissions").where("role_id", role_id).update({
        is_active: false,
        deleted_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      // Add new permissions
      if (permission_ids && permission_ids.length > 0) {
        const rolePermissions = permission_ids.map((permission_id) => ({
          role_id: role_id,
          permission_id,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
          is_active: true,
        }));

        await trx("role_permissions").insert(rolePermissions);
      }

      await trx.commit();
      return await this.getByIdWithPermissions(role_id);
    } catch (error) {
      await trx.rollback();
      console.error("Error updating role with permissions:", error);
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

      const trx = await db.transaction();
      try {
        // Soft delete role
        const [deletedRole] = await trx("user_roles")
          .where("role_id", role_id)
          .update({
            deleted_at: db.fn.now(),
            updated_at: db.fn.now(),
            is_active: false,
          })
          .returning("*");

        // Soft delete all role permissions
        await trx("role_permissions").where("role_id", role_id).update({
          deleted_at: db.fn.now(),
          updated_at: db.fn.now(),
          is_active: false,
        });

        await trx.commit();
        return deletedRole;
      } catch (error) {
        await trx.rollback();
        throw error;
      }
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

  // Get all roles with their permissions
  static async getAllWithPermissions(includeDeleted = false) {
    try {
      const roles = await this.getAll(includeDeleted);

      const rolesWithPermissions = [];
      for (const role of roles) {
        const roleWithPermissions = await this.getByIdWithPermissions(
          role.role_id
        );
        rolesWithPermissions.push(roleWithPermissions);
      }

      return rolesWithPermissions;
    } catch (error) {
      console.error("Error fetching roles with permissions:", error);
      throw error;
    }
  }

  // Check if role has specific permission
  static async hasPermission(role_id, permission_name) {
    try {
      const assignment = await db("role_permissions")
        .select("role_permissions.*")
        .join(
          "user_permissions",
          "role_permissions.permission_id",
          "user_permissions.permission_id"
        )
        .where("role_permissions.role_id", role_id)
        .where("user_permissions.permission_name", permission_name)
        .where("role_permissions.is_active", true)
        .whereNull("role_permissions.deleted_at")
        .first();

      return !!assignment;
    } catch (error) {
      console.error("Error checking role permission:", error);
      throw error;
    }
  }
}

module.exports = Roles;
