const { db } = require("../config/database");

class Branch {
  // Generate unique branch code
  static async generateBranchCode() {
    try {
      const lastBranch = await db("branches")
        .select("code")
        .whereNotNull("code")
        .orderBy("id", "desc")
        .first();

      if (!lastBranch) {
        return "BRN001";
      }

      const lastCode = lastBranch.code;
      const numPart = parseInt(lastCode.replace("BRN", "")) + 1;
      return `BRN${numPart.toString().padStart(3, "0")}`;
    } catch (error) {
      console.error("Error generating branch code:", error);
      // Fallback to timestamp-based code
      return `BRN${Date.now().toString().slice(-3)}`;
    }
  }

  // Validation helpers
  static validateBranchData(data) {
    const errors = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push("Branch name is required");
    } else if (data.name.trim().length > 255) {
      errors.push("Branch name must not exceed 255 characters");
    }

    if (!data.address || data.address.trim().length === 0) {
      errors.push("Branch address is required");
    } else if (data.address.trim().length > 500) {
      errors.push("Branch address must not exceed 500 characters");
    }

    if (
      data.manager_id &&
      (typeof data.manager_id !== "number" || data.manager_id <= 0)
    ) {
      errors.push("Invalid manager ID");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Get all branches
  static async getAll(includeStats = false, includeDeleted = false) {
    try {
      let query = db("branches")
        .leftJoin("employees", "branches.manager_id", "employees.id")
        .select(
          "branches.*",
          db.raw(
            "CONCAT(employees.first_name, ' ', employees.last_name) as manager_name"
          ),
          "employees.email as manager_email",
          "employees.department as manager_department"
        );

      // Only exclude soft-deleted branches if includeDeleted is false
      if (!includeDeleted) {
        query = query.whereNull("branches.deleted_at");
      }

      let branches = await query.orderBy("branches.name");

      if (includeStats) {
        // Add employee count for each branch
        for (let branch of branches) {
          const employeeCount = await db("employees")
            .where("branch_id", branch.id)
            .whereNull("deleted_at")
            .count("id as count")
            .first();
          branch.user_count = parseInt(employeeCount.count) || 0;
        }
      }

      return branches;
    } catch (error) {
      console.error("Error fetching branches:", error);
      throw new Error("Failed to retrieve branches from database");
    }
  }

  // Get branch by ID
  static async getById(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid branch ID provided");
      }

      // First, try to get the basic branch data (including soft-deleted for validation)
      const branch = await db("branches").where("id", id).first();

      if (!branch) {
        console.log("No branch found with ID:", id);
        return null;
      }

      // If branch has a manager_id, try to get manager details
      if (branch.manager_id) {
        try {
          const manager = await db("employees")
            .where("id", branch.manager_id)
            .first();

          if (manager) {
            branch.manager_name = `${manager.first_name} ${manager.last_name}`;
            branch.manager_email = manager.email;
            branch.manager_department = manager.department;
          }
        } catch (managerError) {
          console.log("Error fetching manager details:", managerError.message);
          // Continue without manager details
        }
      }

      // Add employee count
      try {
        const employeeCount = await db("employees")
          .where("branch_id", id)
          .count("id as count")
          .first();
        branch.user_count = parseInt(employeeCount.count) || 0;
      } catch (countError) {
        console.log("Error fetching employee count:", countError.message);
        branch.user_count = 0;
      }

      return branch;
    } catch (error) {
      console.error("Error fetching branch by ID:", error);
      if (error.message === "Invalid branch ID provided") {
        throw error;
      }
      throw new Error("Failed to retrieve branch information");
    }
  }

  // Get branch by code
  static async getBranchByCode(code) {
    try {
      const branch = await db("branches").where("code", code).first();

      return branch;
    } catch (error) {
      console.error("Error fetching branch by code:", error);
      throw new Error("Failed to retrieve branch by code");
    }
  }

  // (Removed getByName; use getById or code-based lookup instead)

  // Get active branches only
  static async getActiveBranches() {
    try {
      const branches = await db("branches")
        .where("is_active", true)
        .orderBy("name");

      return branches;
    } catch (error) {
      console.error("Error fetching active branches:", error);
      throw new Error("Failed to retrieve active branches");
    }
  }

  // Create new branch
  static async create(branchData) {
    try {
      // Validate input
      const validation = this.validateBranchData(branchData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      // Generate unique branch code
      const branchCode = await this.generateBranchCode();

      // Prepare data for insertion
      const insertData = {
        name: branchData.name.trim(),
        code: branchCode,
        address: branchData.address.trim(),
        phone: branchData.phone?.trim() || null,
        email: branchData.email?.trim() || null,
        manager_id: branchData.manager_id || null,
        city: branchData.city?.trim() || null,
        state: branchData.state?.trim() || null,
        postal_code: branchData.postal_code?.trim() || null,
        country: branchData.country?.trim() || null,
        is_active:
          branchData.is_active !== undefined ? branchData.is_active : true,
        opening_hours: branchData.opening_hours || null,
        description: branchData.description?.trim() || null,
        // Respect provided coordinates if supplied by the client
        latitude:
          branchData.latitude !== undefined ? branchData.latitude : null,
        longitude:
          branchData.longitude !== undefined ? branchData.longitude : null,
        // Optional radius
        radius_meters:
          branchData.radius_meters !== undefined
            ? branchData.radius_meters
            : undefined,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Auto-geocode only if coordinates are not provided but we have an address
      if (
        insertData.address &&
        (insertData.latitude === null || insertData.longitude === null)
      ) {
        try {
          const { geocodeAddress } = require("../services/geocodingService");
          const geo = await geocodeAddress(insertData.address);
          if (geo) {
            insertData.latitude = geo.latitude;
            insertData.longitude = geo.longitude;
          }
        } catch (geoErr) {
          console.warn("[Branch.create] Auto-geocode failed:", geoErr.message);
        }
      }

      const [branch] = await db("branches").insert(insertData).returning("*");

      return branch;
    } catch (error) {
      console.error("Error creating branch:", error);

      // Handle specific database errors
      if (error.code === "23505") {
        throw new Error("Branch code already exists");
      }

      // Re-throw validation errors
      if (
        error.message.includes("Validation failed") ||
        error.message.includes("already exists")
      ) {
        throw error;
      }

      throw new Error("Failed to create branch. Please try again.");
    }
  }

  // Update branch
  static async update(id, branchData) {
    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid branch ID provided");
      }

      // Check if branch exists
      const existingBranch = await this.getById(id);
      if (!existingBranch) {
        throw new Error("Branch not found");
      }

      // Validate input
      const validation = this.validateBranchData(branchData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      // Note: Branch code is auto-generated and cannot be manually changed
      // If code is provided in update, we ignore it for security

      // Prepare data for update
      const updateData = {
        name: branchData.name.trim(),
        address: branchData.address.trim(),
        phone: branchData.phone?.trim() || null,
        email: branchData.email?.trim() || null,
        manager_id: branchData.manager_id || null,
        city: branchData.city?.trim() || null,
        state: branchData.state?.trim() || null,
        postal_code: branchData.postal_code?.trim() || null,
        country: branchData.country?.trim() || null,
        is_active:
          branchData.is_active !== undefined
            ? branchData.is_active
            : existingBranch.is_active,
        opening_hours: branchData.opening_hours || null,
        description: branchData.description?.trim() || null,
        updated_at: new Date(),
      };

      // Optional: allow updating radius and GPS directly if provided
      if (branchData.radius_meters !== undefined) {
        updateData.radius_meters = branchData.radius_meters;
      }
      if (
        branchData.latitude !== undefined &&
        branchData.longitude !== undefined
      ) {
        updateData.latitude = branchData.latitude;
        updateData.longitude = branchData.longitude;
      }

      // Auto-geocode: when address changed and no explicit lat/lon provided, or when forced
      const addressChanged =
        branchData.address &&
        branchData.address.trim() !== (existingBranch.address || "").trim();
      const shouldAutoGeocode =
        Boolean(branchData.auto_geocode) ||
        (addressChanged &&
          // Only auto-geocode when caller did NOT provide both coordinates
          !(
            branchData.latitude !== undefined &&
            branchData.longitude !== undefined
          ));

      if (addressChanged) {
        console.log("[Branch.update] Address changed for branch", id, {
          old: existingBranch.address,
          new: branchData.address,
        });
      }

      if (shouldAutoGeocode) {
        try {
          const { geocodeAddress } = require("../services/geocodingService");
          console.log(
            "[Branch.update] Auto-geocoding address:",
            updateData.address
          );
          const geo = await geocodeAddress(updateData.address);
          if (geo) {
            console.log("[Branch.update] Geocode result:", geo);
            updateData.latitude = geo.latitude;
            updateData.longitude = geo.longitude;
          } else {
            console.warn(
              "[Branch.update] Geocode returned null for address:",
              updateData.address
            );
          }
        } catch (geoErr) {
          console.warn("[Branch.update] Auto-geocode failed:", geoErr.message);
        }
      }

      const [branch] = await db("branches")
        .where("id", id)
        .update(updateData)
        .returning("*");

      return branch;
    } catch (error) {
      console.error("Error updating branch:", error);

      // Re-throw validation errors
      if (
        error.message.includes("Invalid") ||
        error.message.includes("not found") ||
        error.message.includes("Validation failed") ||
        error.message.includes("already exists")
      ) {
        throw error;
      }

      throw new Error("Failed to update branch. Please try again.");
    }
  }

  // Delete branch (only if no users assigned)
  static async delete(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid branch ID provided");
      }

      // Check if branch exists and is not already deleted
      const existingBranch = await this.getById(id);
      if (!existingBranch) {
        throw new Error("Branch not found");
      }

      if (existingBranch.deleted_at) {
        throw new Error("Branch is already deleted");
      }

      // Check if branch has assigned employees
      const employeeCount = await db("employees")
        .where("branch_id", id)
        .whereNull("deleted_at")
        .count("id as count")
        .first();

      if (parseInt(employeeCount.count) > 0) {
        throw new Error(
          `Cannot delete branch. ${employeeCount.count} employees are assigned to this branch.`
        );
      }

      // Soft delete - set deleted_at timestamp
      await db("branches").where("id", id).update({
        deleted_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      return true;
    } catch (error) {
      console.error("Error deleting branch:", error);

      // Re-throw validation errors
      if (
        error.message.includes("Invalid") ||
        error.message.includes("not found") ||
        error.message.includes("Cannot delete") ||
        error.message.includes("already deleted")
      ) {
        throw error;
      }

      throw new Error("Failed to delete branch. Please try again.");
    }
  }

  // Restore soft-deleted branch
  static async restore(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid branch ID provided");
      }

      // Check if branch exists and is soft-deleted
      const existingBranch = await db("branches").where("id", id).first();
      if (!existingBranch) {
        throw new Error("Branch not found");
      }

      if (!existingBranch.deleted_at) {
        throw new Error("Branch is not deleted");
      }

      // Restore branch by removing deleted_at timestamp
      await db("branches").where("id", id).update({
        deleted_at: null,
        updated_at: db.fn.now(),
      });

      return true;
    } catch (error) {
      console.error("Error restoring branch:", error);

      // Re-throw validation errors
      if (
        error.message.includes("Invalid") ||
        error.message.includes("not found") ||
        error.message.includes("not deleted")
      ) {
        throw error;
      }

      throw new Error("Failed to restore branch. Please try again.");
    }
  }

  // Get users assigned to branch
  static async getUsers(branchId) {
    try {
      if (!branchId || isNaN(branchId)) {
        throw new Error("Invalid branch ID provided");
      }

      // Check if branch exists
      const branch = await this.getById(branchId);
      if (!branch) {
        throw new Error("Branch not found");
      }

      const users = await db("employees")
        .leftJoin("user_roles", "employees.role_id", "user_roles.role_id")
        .select("employees.*", "user_roles.role", "user_roles.department")
        .where("employees.branch_id", branchId)
        .whereNull("employees.deleted_at")
        .orderBy("employees.first_name");

      return users;
    } catch (error) {
      console.error("Error fetching branch users:", error);

      if (
        error.message.includes("Invalid") ||
        error.message.includes("not found")
      ) {
        throw error;
      }

      throw new Error("Failed to retrieve branch users");
    }
  }

  // Get employees by department for manager selection
  static async getEmployeesByDepartment(department) {
    try {
      if (!department) {
        throw new Error("Department is required");
      }

      const employees = await db("employees")
        .leftJoin("user_roles", "employees.role_id", "user_roles.role_id")
        .select(
          "employees.id",
          "employees.employee_id",
          "employees.first_name",
          "employees.last_name",
          "employees.email",
          "employees.department",
          "user_roles.role"
        )
        .where("employees.department", department)
        .where("employees.status", "Active")
        .whereNull("employees.deleted_at")
        .whereNull("user_roles.deleted_at")
        .where("user_roles.is_active", true)
        .orderBy("employees.first_name");

      return employees;
    } catch (error) {
      console.error("Error fetching employees by department:", error);
      throw new Error("Failed to retrieve department employees");
    }
  }

  // Get branch managers (employees from Branch department with Manager role)
  static async getBranchManagers() {
    try {
      const employees = await db("employees")
        .leftJoin("user_roles", "employees.role_id", "user_roles.role_id")
        .select(
          "employees.id",
          "employees.employee_id",
          "employees.first_name",
          "employees.last_name",
          "employees.email",
          "employees.department",
          "user_roles.role"
        )
        .where("employees.department", "Branch")
        .where("user_roles.role", "Manager")
        .where("employees.status", "Active")
        .whereNull("employees.deleted_at")
        .whereNull("user_roles.deleted_at")
        .where("user_roles.is_active", true)
        .orderBy("employees.first_name");

      return employees;
    } catch (error) {
      console.error("Error fetching branch managers:", error);
      throw new Error("Failed to retrieve branch managers");
    }
  }

  // Get branch statistics
  static async getBranchStats() {
    try {
      const totalBranches = await db("branches").count("id as count").first();
      const activeBranches = await db("branches")
        .where("is_active", true)
        .count("id as count")
        .first();
      const totalEmployeesInBranches = await db("employees")
        .whereNotNull("branch_id")
        .count("id as count")
        .first();

      return {
        total_branches: parseInt(totalBranches.count) || 0,
        active_branches: parseInt(activeBranches.count) || 0,
        inactive_branches:
          (parseInt(totalBranches.count) || 0) -
          (parseInt(activeBranches.count) || 0),
        total_employees_in_branches:
          parseInt(totalEmployeesInBranches.count) || 0,
      };
    } catch (error) {
      console.error("Error fetching branch statistics:", error);
      throw new Error("Failed to retrieve branch statistics");
    }
  }
}

module.exports = Branch;
