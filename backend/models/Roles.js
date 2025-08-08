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

  // Create new role
  static async create(roleData) {
    const { role_name, description } = roleData;
    try {
      const [role] = await db("user_roles")
        .insert({
          role_name,
          description,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
          is_active: true,
        })
        .returning("*");
      return role;
    } catch (error) {
      console.error("Error creating role:", error);
      throw error;
    }
  }

  // Update role
  static async update(role_id, roleData) {
    const { role_name, description } = roleData;
    try {
      const [role] = await db("user_roles")
        .where("role_id", role_id)
        .update({
          role_name,
          description,
          updated_at: db.fn.now(),
        })
        .returning("*");
      return role;
    } catch (error) {
      console.error("Error updating role:", error);
      throw error;
    }
  }

  // Soft delete role
  static async delete(role_id) {
    try {
      const [role] = await db("user_roles")
        .where("role_id", role_id)
        .update({
          deleted_at: db.fn.now(),
          updated_at: db.fn.now(),
          is_active: false,
        })
        .returning("*");
      return role;
    } catch (error) {
      console.error("Error deleting role:", error);
      throw error;
    }
  }

  // Restore role
  static async restore(role_id) {
    try {
      const [role] = await db("user_roles")
        .where("role_id", role_id)
        .update({
          deleted_at: null,
          updated_at: db.fn.now(),
          is_active: true,
        })
        .returning("*");
      return role;
    } catch (error) {
      console.error("Error restoring role:", error);
      throw error;
    }
  }
}

module.exports = Roles;
