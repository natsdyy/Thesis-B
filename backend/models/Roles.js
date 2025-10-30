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

  // ===== POSITIONS MANAGEMENT METHODS =====

  // Get all positions (roles) grouped by department for positions management
  static async getAllPositions(includeDeleted = false) {
    try {
      let query = db("user_roles")
        .select(
          "role_id",
          "role",
          "department",
          "description",
          "rate_per_hour",
          "is_active",
          "created_at",
          "updated_at"
        )
        .whereNotNull("department")
        .where("department", "!=", "System") // Exclude system roles like Super Admin
        .where("department", "!=", "Admin") // Exclude admin departments
        .where("role", "!=", "Admin"); // Exclude admin roles

      if (!includeDeleted) {
        query = query.whereNull("deleted_at");
      }

      const positions = await query
        .orderBy("department", "asc")
        .orderBy("role", "asc");

      // Group positions by department
      const groupedPositions = {};
      positions.forEach((position) => {
        if (!groupedPositions[position.department]) {
          groupedPositions[position.department] = [];
        }
        groupedPositions[position.department].push(position);
      });

      return groupedPositions;
    } catch (error) {
      console.error("Error fetching positions:", error);
      throw error;
    }
  }

  // Get positions by department
  static async getPositionsByDepartment(department, includeDeleted = false) {
    try {
      let query = db("user_roles")
        .select(
          "role_id",
          "role",
          "department",
          "description",
          "rate_per_hour",
          "is_active",
          "created_at",
          "updated_at"
        )
        .whereRaw("LOWER(department) = LOWER(?)", [department])
        .where("department", "!=", "System"); // Exclude system roles

      if (!includeDeleted) {
        query = query.whereNull("deleted_at");
      }

      const positions = await query.orderBy("role", "asc");
      return positions;
    } catch (error) {
      console.error("Error fetching positions by department:", error);
      throw error;
    }
  }

  // Update rate per hour for a position
  static async updateRatePerHour(role_id, rate_per_hour) {
    try {
      // Check if role exists
      const currentRole = await this.getById(role_id);
      if (!currentRole) {
        const error = new Error("Position not found");
        error.code = "POSITION_NOT_FOUND";
        throw error;
      }

      // Validate rate_per_hour
      if (typeof rate_per_hour !== "number" || rate_per_hour < 0) {
        const error = new Error("Rate per hour must be a positive number");
        error.code = "INVALID_RATE";
        throw error;
      }

      const parsedRate = parseFloat(rate_per_hour);
      
      // Use transaction to ensure both updates succeed or fail together
      const trx = await db.transaction();
      
      try {
        // Update rate in user_roles
        const [updatedPosition] = await trx("user_roles")
          .where("role_id", role_id)
          .update({
            rate_per_hour: parsedRate,
            updated_at: db.fn.now(),
          })
          .returning([
            "role_id",
            "role",
            "department",
            "description",
            "rate_per_hour",
            "is_active",
            "created_at",
            "updated_at",
          ]);

        // Also update matching positions in branch_positions table
        // Match by position_title (role name) - e.g., "Cashier", "Cook", "Manager", etc.
        // Only update branch positions if the role is in "Branch" department
        let matchingBranchPositions = [];
        
        if (currentRole.department === "Branch" || currentRole.department === "branch") {
          // Debug: Check what branch positions exist
          const allBranchPositions = await trx("branch_positions")
            .whereNull("deleted_at")
            .select("id", "position_title", "rate_per_hour")
            .limit(10);
          
          
          // Try multiple matching strategies
          // 1. Exact case-insensitive match
          matchingBranchPositions = await trx("branch_positions")
            .whereRaw("LOWER(TRIM(position_title)) = LOWER(TRIM(?))", [currentRole.role])
            .whereNull("deleted_at")
            .select("id", "hours_per_month", "position_title", "branch_id", "rate_per_hour");

          // 2. If no exact match, try LIKE match (handles any extra spaces or variations)
          if (matchingBranchPositions.length === 0) {
            console.log(`   No exact match found, trying LIKE match...`);
            const likeMatch = await trx("branch_positions")
              .whereRaw("LOWER(position_title) LIKE LOWER(?)", [`%${currentRole.role}%`])
              .whereNull("deleted_at")
              .select("id", "hours_per_month", "position_title", "branch_id", "rate_per_hour");
            
            if (likeMatch.length > 0) {
              console.log(`   Found ${likeMatch.length} positions with LIKE match`);
              matchingBranchPositions = likeMatch;
            }
          }

          if (matchingBranchPositions.length > 0) {
            console.log(`\n🔄 Syncing rates for ${matchingBranchPositions.length} branch position(s) with position_title matching "${currentRole.role}"`);
            console.log(`   Role: ${currentRole.role} (${currentRole.department}), New Rate: ₱${parsedRate}/hour`);
            
            // Update each matching branch position
            let updatedCount = 0;
            for (const branchPosition of matchingBranchPositions) {
              const hoursPerMonth = branchPosition.hours_per_month || 160; // Default to 160 if not set
              const monthlySalary = parsedRate * hoursPerMonth;
              
              const updated = await trx("branch_positions")
                .where("id", branchPosition.id)
                .update({
                  rate_per_hour: parsedRate,
                  monthly_salary: monthlySalary,
                  updated_at: db.fn.now(),
                });
              
              if (updated > 0) {
                updatedCount++;
                console.log(`   ✓ Updated branch position ID ${branchPosition.id} ("${branchPosition.position_title}")`);
                console.log(`     Old Rate: ₱${branchPosition.rate_per_hour || 'N/A'}/hr → New Rate: ₱${parsedRate}/hr`);
                console.log(`     Monthly Salary: ₱${monthlySalary.toFixed(2)}`);
              }
            }
            
            console.log(`✅ Successfully updated ${updatedCount} of ${matchingBranchPositions.length} branch position(s) to match main branch rate\n`);
          } else {
            console.log(`⚠️  No branch positions found matching position_title "${currentRole.role}"`);
            console.log(`   This role's rate will only apply to Position Management, not branch_positions\n`);
          }
        } else {
          console.log(`ℹ️  Role "${currentRole.role}" is in "${currentRole.department}" department - skipping branch_positions sync (department roles don't need branch sync)`);
        }

        await trx.commit();
        return updatedPosition;
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      console.error("Error updating rate per hour:", error);
      throw error;
    }
  }

  // Update position status (is_active)
  static async updatePositionStatus(role_id, is_active) {
    try {
      console.log(`updatePositionStatus called with role_id: ${role_id}, is_active: ${is_active}`)
      
      // First check if the role exists
      const role = await db("user_roles")
        .where("role_id", role_id)
        .whereNull("deleted_at")
        .first();
      
      console.log('Found role:', role)
      
      if (!role) {
        const error = new Error("Position not found");
        error.code = "POSITION_NOT_FOUND";
        throw error;
      }

      // Validate is_active (should be boolean)
      if (typeof is_active !== "boolean") {image.png
        const error = new Error("is_active must be a boolean value");
        error.code = "INVALID_STATUS";
        throw error;
      }

      const [updatedPosition] = await db("user_roles")
        .where("role_id", role_id)
        .update({
          is_active: is_active,
          updated_at: db.fn.now(),
        })
        .returning([
          "role_id",
          "role",
          "department",
          "description",
          "rate_per_hour",
          "is_active",
          "created_at",
          "updated_at",
        ]);

      console.log('Updated position:', updatedPosition)
      console.log('is_active in DB should now be:', is_active)
      
      // Verify the update by reading it back
      const verification = await db("user_roles")
        .where("role_id", role_id)
        .select("role_id", "role", "is_active")
        .first();
      console.log('Verification read from DB:', verification)
      
      return updatedPosition;
    } catch (error) {
      console.error("Error updating position status:", error);
      throw error;
    }
  }

  // Get position by ID (for positions management)
  static async getPositionById(role_id) {
    try {
      const position = await db("user_roles")
        .select(
          "role_id",
          "role",
          "department",
          "description",
          "rate_per_hour",
          "is_active",
          "created_at",
          "updated_at"
        )
        .where("role_id", role_id)
        .whereNull("deleted_at")
        .where("department", "!=", "System") // Exclude system roles
        .first();

      return position;
    } catch (error) {
      console.error("Error fetching position by ID:", error);
      throw error;
    }
  }
}

module.exports = Roles;
