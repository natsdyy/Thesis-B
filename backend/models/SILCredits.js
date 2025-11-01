const { db } = require("../config/database");
const {
  getCurrentPhilippineTime,
  formatForDatabase,
} = require("../utils/timezoneUtils");

class SILCredits {
  /**
   * Get SIL credits for an employee for a specific year
   * @param {number} employeeId - Employee ID
   * @param {number} year - Year (defaults to current year)
   * @returns {Promise<Object|null>}
   */
  static async getByEmployeeAndYear(employeeId, year = null) {
    try {
      if (!year) {
        year = new Date().getFullYear();
      }

      const silCredits = await db("employee_sil_credits")
        .where("employee_id", employeeId)
        .where("year", year)
        .first();

      return silCredits;
    } catch (error) {
      console.error("Error fetching SIL credits:", error);
      throw new Error("Failed to fetch SIL credits");
    }
  }

  /**
   * Create or update SIL credits for an employee
   * @param {number} employeeId - Employee ID
   * @param {number} year - Year
   * @param {Object} data - SIL credits data
   * @returns {Promise<Object>}
   */
  static async createOrUpdate(employeeId, year, data) {
    try {
      const existing = await this.getByEmployeeAndYear(employeeId, year);

      if (existing) {
        // Update existing record
        const [updated] = await db("employee_sil_credits")
          .where("id", existing.id)
          .update({
            ...data,
            updated_at: formatForDatabase(getCurrentPhilippineTime()),
          })
          .returning("*");

        return updated;
      } else {
        // Create new record
        const [created] = await db("employee_sil_credits")
          .insert({
            employee_id: employeeId,
            year: year,
            total_credits: data.total_credits || 5.0,
            used_credits: data.used_credits || 0,
            available_credits: data.available_credits || 5.0,
            last_accrual_date: data.last_accrual_date || null,
            created_at: formatForDatabase(getCurrentPhilippineTime()),
            updated_at: formatForDatabase(getCurrentPhilippineTime()),
          })
          .returning("*");

        return created;
      }
    } catch (error) {
      console.error("Error creating/updating SIL credits:", error);
      throw new Error("Failed to create/update SIL credits");
    }
  }

  /**
   * Use SIL credits for a leave request
   * @param {number} employeeId - Employee ID
   * @param {number} year - Year
   * @param {number} daysToUse - Number of days to use
   * @returns {Promise<Object>}
   */
  static async useCredits(employeeId, year, daysToUse) {
    try {
      const silCredits = await this.getByEmployeeAndYear(employeeId, year);

      if (!silCredits) {
        throw new Error("SIL credits not found for this employee and year");
      }

      if (silCredits.available_credits < daysToUse) {
        throw new Error(
          `Insufficient SIL credits. Available: ${silCredits.available_credits}, Required: ${daysToUse}`
        );
      }

      const newUsedCredits = parseFloat(
        (parseFloat(silCredits.used_credits) + parseFloat(daysToUse)).toFixed(2)
      );
      const newAvailableCredits = parseFloat(
        (
          parseFloat(silCredits.available_credits) - parseFloat(daysToUse)
        ).toFixed(2)
      );

      const [updated] = await db("employee_sil_credits")
        .where("id", silCredits.id)
        .update({
          used_credits: newUsedCredits,
          available_credits: newAvailableCredits,
          updated_at: formatForDatabase(getCurrentPhilippineTime()),
        })
        .returning("*");

      return updated;
    } catch (error) {
      console.error("Error using SIL credits:", error);
      throw error;
    }
  }

  /**
   * Restore SIL credits (when leave request is cancelled/rejected)
   * @param {number} employeeId - Employee ID
   * @param {number} year - Year
   * @param {number} daysToRestore - Number of days to restore
   * @returns {Promise<Object>}
   */
  static async restoreCredits(employeeId, year, daysToRestore) {
    try {
      const silCredits = await this.getByEmployeeAndYear(employeeId, year);

      if (!silCredits) {
        throw new Error("SIL credits not found for this employee and year");
      }

      const newUsedCredits = Math.max(
        0,
        parseFloat(
          (
            parseFloat(silCredits.used_credits) - parseFloat(daysToRestore)
          ).toFixed(2)
        )
      );
      const newAvailableCredits = parseFloat(
        (
          parseFloat(silCredits.available_credits) + parseFloat(daysToRestore)
        ).toFixed(2)
      );

      // Cap available credits to not exceed total credits
      const cappedAvailableCredits = Math.min(
        newAvailableCredits,
        parseFloat(silCredits.total_credits)
      );

      const [updated] = await db("employee_sil_credits")
        .where("id", silCredits.id)
        .update({
          used_credits: newUsedCredits,
          available_credits: cappedAvailableCredits,
          updated_at: formatForDatabase(getCurrentPhilippineTime()),
        })
        .returning("*");

      return updated;
    } catch (error) {
      console.error("Error restoring SIL credits:", error);
      throw error;
    }
  }

  /**
   * Initialize SIL credits for all employees for a year
   * @param {number} year - Year
   * @returns {Promise<Array>}
   */
  static async initializeForAllEmployees(year) {
    try {
      // Get all active employees
      const employees = await db("employees")
        .where("status", "Active")
        .whereNull("deleted_at")
        .select("id");

      const results = [];

      for (const employee of employees) {
        // Check if SIL credits already exist for this employee and year
        const existing = await this.getByEmployeeAndYear(employee.id, year);

        if (!existing) {
          // Create new SIL credits record
          const silCredits = await this.createOrUpdate(employee.id, year, {
            total_credits: 5.0,
            used_credits: 0,
            available_credits: 5.0,
          });

          results.push(silCredits);
        }
      }

      return results;
    } catch (error) {
      console.error("Error initializing SIL credits for all employees:", error);
      throw new Error("Failed to initialize SIL credits");
    }
  }

  /**
   * Get SIL credits summary for an employee
   * @param {number} employeeId - Employee ID
   * @returns {Promise<Object>}
   */
  static async getSummary(employeeId) {
    try {
      const currentYear = new Date().getFullYear();
      const silCredits = await this.getByEmployeeAndYear(
        employeeId,
        currentYear
      );

      if (!silCredits) {
        // Initialize SIL credits if they don't exist
        const newCredits = await this.createOrUpdate(employeeId, currentYear, {
          total_credits: 5.0,
          used_credits: 0,
          available_credits: 5.0,
        });

        return {
          year: currentYear,
          total_credits: newCredits.total_credits,
          used_credits: newCredits.used_credits,
          available_credits: newCredits.available_credits,
          last_accrual_date: newCredits.last_accrual_date,
        };
      }

      return {
        year: silCredits.year,
        total_credits: silCredits.total_credits,
        used_credits: silCredits.used_credits,
        available_credits: silCredits.available_credits,
        last_accrual_date: silCredits.last_accrual_date,
      };
    } catch (error) {
      console.error("Error getting SIL credits summary:", error);
      throw new Error("Failed to get SIL credits summary");
    }
  }

  /**
   * Get all SIL credits for reporting
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>}
   */
  static async getAll(filters = {}) {
    try {
      let query = db("employee_sil_credits as esc")
        .select(
          "esc.*",
          "e.first_name",
          "e.last_name",
          "e.employee_id as employee_code",
          "e.department",
          "e.branch_id",
          "b.name as branch_name"
        )
        .leftJoin("employees as e", "esc.employee_id", "e.id")
        .leftJoin("branches as b", "e.branch_id", "b.id")
        .whereNull("e.deleted_at");

      if (filters.year) {
        query = query.where("esc.year", filters.year);
      }

      if (filters.department) {
        query = query.where("e.department", filters.department);
      }

      if (filters.branch_id) {
        query = query.where("e.branch_id", filters.branch_id);
      }

      if (filters.employee_id) {
        query = query.where("esc.employee_id", filters.employee_id);
      }

      const results = await query.orderBy("e.first_name", "asc");

      return results;
    } catch (error) {
      console.error("Error fetching all SIL credits:", error);
      throw new Error("Failed to fetch SIL credits");
    }
  }
}

module.exports = SILCredits;
