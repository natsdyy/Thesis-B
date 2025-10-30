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
        job_status: positionData.job_status || positionData.status || "open", // Initialize job_status to match status
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
      // Query all branch positions - don't filter by is_active, status, or job_status unless explicitly requested
      let query = db("branch_positions as bp")
        .leftJoin("branches as b", function() {
          this.on("bp.branch_id", "=", "b.id")
            .andOnNull("b.deleted_at"); // Only join with non-deleted branches
        })
        .select(
          "bp.id",
          "bp.branch_id",
          "bp.position_title",
          "bp.position_code",
          "bp.description",
          "bp.requirements",
          "bp.rate_per_hour",
          "bp.monthly_salary",
          "bp.department",
          "bp.position_type",
          "bp.total_slots",
          "bp.filled_slots",
          "bp.status",
          // Ensure job_status always has a value by using COALESCE (fallback to status if job_status is NULL)
          db.raw("COALESCE(bp.job_status, bp.status) as job_status"),
          "bp.is_active",
          "bp.created_at",
          "bp.updated_at",
          "bp.deleted_at",
          "b.name as branch_name",
          "b.code as branch_code",
          "b.address as branch_address"
        )
        .whereNull("bp.deleted_at");
      
      // Don't filter by branch is_active - we want to show positions even if branch is inactive
      // This allows HR to see all positions for management purposes
      // Also don't filter by position is_active or status unless explicitly requested
        
      // Also get all department positions from user_roles and combine
      // Filter by is_active if job_status=open is requested (only show active department positions)
      let departmentPositionsQuery = db("user_roles")
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
          db.raw("CASE WHEN is_active THEN 'open' ELSE 'closed' END as job_status"),
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
        .whereNull("deleted_at");
      
      // If job_status=open filter is requested, only include active department positions
      if (filters.job_status === 'open') {
        departmentPositionsQuery = departmentPositionsQuery.where("is_active", true);
      }
      
      const departmentPositions = await departmentPositionsQuery
        .orderBy("department", "asc")
        .orderBy("role", "asc");

      // Apply filters
      if (filters.branch_id) {
        query = query.where("bp.branch_id", filters.branch_id);
      }

      if (filters.department) {
        query = query.where("bp.department", filters.department);
      }

      // Filter by job_status for public job listing (preferred for public listing)
      // Use status filter as fallback for internal management
      if (filters.job_status) {
        if (filters.job_status === 'open') {
          // When job_status=open is requested, include positions where:
          // 1. (job_status = 'open' AND is_active = true) OR
          // 2. (job_status IS NULL AND status = 'open' AND is_active = true)
          // This ensures closed positions (is_active=false) don't show up even if job_status='open'
          query = query.where(function() {
            this.where(function() {
              this.where("bp.job_status", "open").where("bp.is_active", true);
            }).orWhere(function() {
              this.whereNull("bp.job_status")
                .where("bp.status", "open")
                .where("bp.is_active", true);
            });
          });
        } else {
          // For other job_status values, filter directly
          query = query.where("bp.job_status", filters.job_status);
        }
      } else if (filters.status) {
        // Only apply status filter if job_status is not provided
        query = query.where("bp.status", filters.status);
      }

      if (filters.position_type) {
        query = query.where("bp.position_type", filters.position_type);
      }

      if (filters.is_active !== undefined && !filters.job_status) {
        // Only apply is_active filter if job_status filter isn't already applied
        // (job_status=open already filters by is_active above)
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

      // Execute query and get raw results
      const branchPositions = await query;
      
      
      // Log detailed breakdown of branch positions
      if (branchPositions.length > 0) {
        const branchCounts = {};
        const statusCounts = { open: 0, closed: 0, filled: 0, 'on-hold': 0, other: 0 };
        const isActiveCounts = { active: 0, inactive: 0 };
        const branchIdCounts = {};
        
        branchPositions.forEach(p => {
          const branchName = p.branch_name || `Branch ID ${p.branch_id} (No Name)`;
          branchCounts[branchName] = (branchCounts[branchName] || 0) + 1;
          
          // Count by status
          const status = p.status || 'other';
          if (statusCounts[status] !== undefined) {
            statusCounts[status]++;
          } else {
            statusCounts.other++;
          }
          
          // Count by is_active
          if (p.is_active === true || p.is_active === 1) {
            isActiveCounts.active++;
          } else {
            isActiveCounts.inactive++;
          }
          
          // Count by branch_id
          branchIdCounts[p.branch_id] = (branchIdCounts[p.branch_id] || 0) + 1;
        });
        

      } else {
      }
      
      // If filtering by a specific department, combine appropriately
      // Otherwise, return branch positions only (not department positions)
      let allPositions;
      
      if (filters.department && filters.department !== 'Branch') {
        // For non-Branch departments, include both branch_positions filtered by department
        // AND user_roles positions for that department
        const filteredBranchByDept = branchPositions.filter(p => p.department === filters.department);
        const filteredDeptByDept = departmentPositions.filter(p => p.department === filters.department);
        allPositions = [...filteredBranchByDept, ...filteredDeptByDept];
      } else if (filters.department === 'Branch') {
        // For Branch, only return actual branch positions, not department roles
        // Include all branch positions regardless of department value (some might be NULL)
        allPositions = branchPositions.filter(p => {
          // Include if it's explicitly Branch department OR if it has a branch_id (actual branch position)
          return (p.department === 'Branch' || !p.department || p.department === null) && p.branch_id;
        });
      } else {
        // No department filter - return all branch positions only
        // Include ALL positions with a branch_id (even if branch_name is null due to deleted branch)
        allPositions = branchPositions.filter(p => {
          // Include positions that have a valid branch_id (non-null, not empty string, and numeric > 0)
          const branchId = p.branch_id;
          const hasValidBranchId = branchId != null && 
                                   branchId !== '' && 
                                   branchId !== undefined &&
                                   !isNaN(branchId) && 
                                   Number(branchId) > 0;
          
          if (!hasValidBranchId) {
            console.warn('Position excluded - invalid branch_id:', {
              position_id: p.id,
              position_title: p.position_title,
              branch_id: branchId,
              branch_id_type: typeof branchId
            });
          }
          
          return hasValidBranchId;
        });
        
        
        // Log detailed branch distribution
        const branchDistribution = {};
        allPositions.forEach(p => {
          const branchName = p.branch_name || `Branch ID ${p.branch_id} (No Name)`;
          if (!branchDistribution[branchName]) {
            branchDistribution[branchName] = { count: 0, positions: [] };
          }
          branchDistribution[branchName].count++;
          branchDistribution[branchName].positions.push(p.position_title);
        });        
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
      
      // Get current position to check status before update
      const currentPosition = await db("branch_positions")
        .where("id", id)
        .first();

      if (!currentPosition) {
        throw new Error("Position not found");
      }

      // Calculate monthly salary if rate changed (fixed 160 hours per month)
      if (updateData.rate_per_hour) {
        const rate = updateData.rate_per_hour || currentPosition.rate_per_hour;
        updateData.monthly_salary = rate * 160;
      }

      // Sync status, job_status, and is_active when status is changed
      // This ensures public homepage shows consistent filtering
      if (updateData.status !== undefined) {
        const newStatus = updateData.status;
        
        // Sync job_status with status (for public listing filter)
        updateData.job_status = newStatus;
        
        // Sync is_active with status (open = active, closed = inactive)
        if (newStatus === 'open') {
          updateData.is_active = true;
        } else if (newStatus === 'closed' || newStatus === 'filled' || newStatus === 'on-hold') {
          updateData.is_active = false;
        }
        
      }
      
      // Also handle if job_status is updated directly (sync status and is_active)
      if (updateData.job_status !== undefined && updateData.status === undefined) {
        const newJobStatus = updateData.job_status;
        updateData.status = newJobStatus;
        
        if (newJobStatus === 'open') {
          updateData.is_active = true;
        } else if (newJobStatus === 'closed' || newJobStatus === 'filled' || newJobStatus === 'on-hold') {
          updateData.is_active = false;
        }
        
      }

      updateData.updated_at = db.fn.now();

      const [updatedPosition] = await db("branch_positions")
        .where("id", id)
        .where("deleted_at", null)
        .update(updateData)
        .returning("*");

      if (!updatedPosition) {
        throw new Error("Position not found");
      }
      
      // Verify the update by reading it back with all relevant fields
      const verification = await db("branch_positions")
        .where("id", id)
        .select("id", "position_title", "status", "job_status", "is_active")
        .first();

      // Ensure the returned position has the synced fields
      if (verification) {
        updatedPosition.status = verification.status;
        updatedPosition.job_status = verification.job_status || verification.status;
        updatedPosition.is_active = verification.is_active;
      }

      return updatedPosition;
    } catch (error) {
      if (error.code === "23505") {
        throw new Error("Position code already exists for this branch");
      }
      throw error;
    }
  }

  /**
   * Delete position (hard delete - permanently removes from database)
   */
  static async delete(id, deletedBy = null) {
    try {
      // First check if position exists (and not already deleted)
      const existingPosition = await db("branch_positions")
        .where("id", id)
        .whereNull("deleted_at")
        .first();

      if (!existingPosition) {
        throw new Error("Position not found or already deleted");
      }

      // Hard delete - actually remove from database
      // For PostgreSQL, use .del() with .returning() to get the deleted row
      const deletedPosition = await db("branch_positions")
        .where("id", id)
        .del()
        .returning("*");

      if (!deletedPosition || deletedPosition.length === 0) {
        throw new Error("Position not found");
      }

      return deletedPosition[0];
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
