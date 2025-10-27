const { db } = require("../config/database");

class BranchPosition {
  /**
   * Create a new branch position
   */
  static async create(positionData, createdBy = null) {
    try {
      // Calculate monthly salary (fixed 160 hours per month)
      const monthlySalary = positionData.rate_per_hour * 160;
      
      const position = {
        branch_id: positionData.branch_id,
        position_title: positionData.position_title,
        position_code: positionData.position_code,
        description: positionData.description || null,
        requirements: positionData.requirements || null,
        rate_per_hour: positionData.rate_per_hour,
        monthly_salary: monthlySalary,
        department: positionData.department,
        position_type: positionData.position_type || "Full-time",
        total_slots: positionData.total_slots || 1,
        filled_slots: positionData.filled_slots || 0,
        status: positionData.status || "open",
        is_active: positionData.is_active !== undefined ? positionData.is_active : true,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      };

      const [newPosition] = await db("branch_positions")
        .insert(position)
        .returning("*");

      return newPosition;
    } catch (error) {
      if (error.code === "23505") {
        throw new Error("Position code already exists for this branch");
      }
      throw error;
    }
  }

  /**
   * Get all branch positions with optional filters
   */
  static async getAll(filters = {}) {
    try {
      let query = db("branch_positions as bp")
        .leftJoin("branches as b", "bp.branch_id", "b.id")
        .select(
          "bp.*",
          "b.name as branch_name",
          "b.code as branch_code",
          "b.address as branch_address"
        )
        .where("bp.deleted_at", null);
        
      // Also get all department positions from user_roles and combine
      const departmentPositions = await db("user_roles")
        .select(
          db.raw("CAST(role_id AS TEXT) as id"),
          "role as position_title",
          "department",
          db.raw("NULL::INTEGER as branch_id"),
          db.raw("NULL as branch_name"),
          "rate_per_hour",
          db.raw("rate_per_hour * 160 as monthly_salary"),
          db.raw("'Full-time' as position_type"),
          db.raw("1 as total_slots"),
          db.raw("0 as filled_slots"),
          db.raw("CASE WHEN is_active THEN 'open' ELSE 'closed' END as status"),
          "is_active",
          db.raw("NULL as position_code"),
          "description",
          db.raw("NULL as requirements"),
          "created_at",
          "updated_at"
        )
        .whereNotNull("department")
        .where("department", "!=", "System")
        .where("department", "!=", "Admin")
        .where("role", "!=", "Admin")
        .whereNull("deleted_at")
        .orderBy("department", "asc")
        .orderBy("role", "asc");

      // Apply filters
      if (filters.branch_id) {
        query = query.where("bp.branch_id", filters.branch_id);
      }

      if (filters.department) {
        query = query.where("bp.department", filters.department);
      }

      if (filters.status) {
        query = query.where("bp.status", filters.status);
      }

      if (filters.position_type) {
        query = query.where("bp.position_type", filters.position_type);
      }

      if (filters.is_active !== undefined) {
        query = query.where("bp.is_active", filters.is_active);
      }

      if (filters.search) {
        query = query.where(function() {
          this.where("bp.position_title", "ilike", `%${filters.search}%`)
            .orWhere("bp.position_code", "ilike", `%${filters.search}%`)
            .orWhere("b.name", "ilike", `%${filters.search}%`);
        });
      }

      // Order by
      query = query.orderBy("bp.created_at", "desc");

      // Pagination
      if (filters.page && filters.limit) {
        const offset = (filters.page - 1) * filters.limit;
        query = query.limit(filters.limit).offset(offset);
      }

      const branchPositions = await query;
      
      // Log sample positions to see their status
      console.log(`BranchPosition.getAll - Found ${branchPositions.length} branch positions`)
      console.log(`Found ${departmentPositions.length} department positions`)
      
      // If filtering by a specific department, combine appropriately
      // Otherwise, return branch positions only (not department positions)
      let allPositions;
      
      if (filters.department && filters.department !== 'Branch') {
        // For non-Branch departments, include both branch_positions filtered by department
        // AND user_roles positions for that department
        const filteredBranchByDept = branchPositions.filter(p => p.department === filters.department);
        const filteredDeptByDept = departmentPositions.filter(p => p.department === filters.department);
        allPositions = [...filteredBranchByDept, ...filteredDeptByDept];
        console.log(`Filtered for department ${filters.department}: ${allPositions.length} positions`)
      } else if (filters.department === 'Branch') {
        // For Branch, only return actual branch positions, not department roles
        allPositions = branchPositions.filter(p => p.department === 'Branch' || !p.department);
        console.log(`Filtered for Branch: ${allPositions.length} positions`)
      } else {
        // No department filter - return all branch positions only
        allPositions = branchPositions;
        console.log(`No department filter - returning ${allPositions.length} branch positions only`)
      }
      
      return allPositions;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get position by ID
   */
  static async getById(id) {
    try {
      const position = await db("branch_positions as bp")
        .leftJoin("branches as b", "bp.branch_id", "b.id")
        .select(
          "bp.*",
          "b.name as branch_name",
          "b.code as branch_code",
          "b.address as branch_address"
        )
        .where("bp.id", id)
        .where("bp.deleted_at", null)
        .first();

      return position;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get positions by branch ID
   */
  static async getByBranchId(branchId, includeInactive = false) {
    try {
      let query = db("branch_positions as bp")
        .leftJoin("branches as b", "bp.branch_id", "b.id")
        .select(
          "bp.*",
          "b.name as branch_name",
          "b.code as branch_code"
        )
        .where("bp.branch_id", branchId)
        .where("bp.deleted_at", null);

      if (!includeInactive) {
        query = query.where("bp.is_active", true);
      }

      const positions = await query.orderBy("bp.position_title", "asc");

      return positions;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update position
   */
  static async update(id, updateData, updatedBy = null) {
    try {
      console.log(`BranchPosition.update called - id: ${id}, updateData:`, updateData)
      
      // Calculate monthly salary if rate changed (fixed 160 hours per month)
      if (updateData.rate_per_hour) {
        const currentPosition = await db("branch_positions")
          .where("id", id)
          .first();

        const rate = updateData.rate_per_hour || currentPosition.rate_per_hour;
        updateData.monthly_salary = rate * 160;
      }

      updateData.updated_at = db.fn.now();

      const [updatedPosition] = await db("branch_positions")
        .where("id", id)
        .where("deleted_at", null)
        .update(updateData)
        .returning("*");

      console.log(`BranchPosition updated:`, updatedPosition)
      console.log(`Status after update: ${updatedPosition?.status}`)

      if (!updatedPosition) {
        throw new Error("Position not found");
      }
      
      // Verify the update by reading it back
      const verification = await db("branch_positions")
        .where("id", id)
        .select("id", "position_title", "status")
        .first();
      console.log(`Verification read from DB:`, verification)

      return updatedPosition;
    } catch (error) {
      if (error.code === "23505") {
        throw new Error("Position code already exists for this branch");
      }
      throw error;
    }
  }

  /**
   * Delete position (soft delete)
   */
  static async delete(id, deletedBy = null) {
    try {
      const [deletedPosition] = await db("branch_positions")
        .where("id", id)
        .where("deleted_at", null)
        .update({
          deleted_at: db.fn.now(),
          updated_at: db.fn.now()
        })
        .returning("*");

      if (!deletedPosition) {
        throw new Error("Position not found");
      }

      return deletedPosition;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update slot counts
   */
  static async updateSlots(id, totalSlots, filledSlots) {
    try {
      // Validate slot counts
      if (filledSlots > totalSlots) {
        throw new Error("Filled slots cannot exceed total slots");
      }

      // Determine status based on slots
      let status = "open";
      if (filledSlots >= totalSlots) {
        status = "filled";
      }

      const [updatedPosition] = await db("branch_positions")
        .where("id", id)
        .where("deleted_at", null)
        .update({
          total_slots: totalSlots,
          filled_slots: filledSlots,
          status: status,
          updated_at: db.fn.now()
        })
        .returning("*");

      if (!updatedPosition) {
        throw new Error("Position not found");
      }

      return updatedPosition;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get position statistics
   */
  static async getStats() {
    try {
      const stats = await db("branch_positions as bp")
        .leftJoin("branches as b", "bp.branch_id", "b.id")
        .where("bp.deleted_at", null)
        .select(
          db.raw("COUNT(*) as total_positions"),
          db.raw("COUNT(CASE WHEN bp.status = 'open' THEN 1 END) as open_positions"),
          db.raw("COUNT(CASE WHEN bp.status = 'filled' THEN 1 END) as filled_positions"),
          db.raw("COUNT(CASE WHEN bp.status = 'on-hold' THEN 1 END) as on_hold_positions"),
          db.raw("SUM(bp.total_slots) as total_slots"),
          db.raw("SUM(bp.filled_slots) as filled_slots"),
          db.raw("AVG(bp.rate_per_hour) as avg_hourly_rate"),
          db.raw("AVG(bp.monthly_salary) as avg_monthly_salary")
        )
        .first();

      return stats;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get positions by department
   */
  static async getByDepartment(department, includeInactive = false) {
    try {
      let query = db("branch_positions as bp")
        .leftJoin("branches as b", "bp.branch_id", "b.id")
        .select(
          "bp.*",
          "b.name as branch_name",
          "b.code as branch_code"
        )
        .where("bp.department", department)
        .where("bp.deleted_at", null);

      if (!includeInactive) {
        query = query.where("bp.is_active", true);
      }

      const positions = await query.orderBy("bp.position_title", "asc");

      return positions;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Calculate monthly salary for a position (fixed 160 hours per month)
   */
  static calculateMonthlySalary(ratePerHour) {
    return ratePerHour * 160;
  }

  /**
   * Get available positions (open slots)
   */
  static async getAvailablePositions() {
    try {
      const positions = await db("branch_positions as bp")
        .leftJoin("branches as b", "bp.branch_id", "b.id")
        .select(
          "bp.*",
          "b.name as branch_name",
          "b.code as branch_code"
        )
        .where("bp.deleted_at", null)
        .where("bp.is_active", true)
        .where("bp.status", "open")
        .whereRaw("bp.filled_slots < bp.total_slots")
        .orderBy("bp.position_title", "asc");

      return positions;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = BranchPosition;
