const { db } = require("../config/database");
const {
  getCurrentPhilippineDate,
  formatForDatabase,
} = require("../utils/timezoneUtils");

class LeaveRequest {
  // Create a new leave request
  static async create(
    { employee_id, from_date, to_date, leave_type, reason },
    createdBy = null
  ) {
    try {
      // Check for overlapping approved leave requests (only current/future ones)
      const today = getCurrentPhilippineDate(); // YYYY-MM-DD in Asia/Manila
      const overlappingRequest = await db("leave_requests")
        .where("employee_id", employee_id)
        .whereIn("status", ["approved_by_manager", "approved_by_hr"])
        .where("to_date", ">=", today) // Only check leave that hasn't ended yet
        .where(function () {
          this.where(function () {
            // New request starts during existing approved period
            this.where("from_date", "<=", from_date).where(
              "to_date",
              ">=",
              from_date
            );
          })
            .orWhere(function () {
              // New request ends during existing approved period
              this.where("from_date", "<=", to_date).where(
                "to_date",
                ">=",
                to_date
              );
            })
            .orWhere(function () {
              // New request completely contains existing approved period
              this.where("from_date", ">=", from_date).where(
                "to_date",
                "<=",
                to_date
              );
            })
            .orWhere(function () {
              // Existing approved period completely contains new request
              this.where("from_date", "<=", from_date).where(
                "to_date",
                ">=",
                to_date
              );
            });
        })
        .first();

      if (overlappingRequest) {
        const existingFrom = new Date(
          overlappingRequest.from_date
        ).toLocaleDateString();
        const existingTo = new Date(
          overlappingRequest.to_date
        ).toLocaleDateString();
        throw new Error(
          `You already have an approved leave request from ${existingFrom} to ${existingTo}. ` +
            `Please choose different dates or contact HR if you need to modify your existing leave.`
        );
      }

      // All employees start with pending status
      // Department employees skip manager approval and go directly to HR
      // Branch employees go through manager approval first
      const initialStatus = "pending";

      const [leaveRequest] = await db("leave_requests")
        .insert({
          employee_id,
          from_date,
          to_date,
          leave_type,
          reason,
          status: initialStatus,
          created_by: createdBy,
          created_at: formatForDatabase(),
          updated_at: formatForDatabase(),
        })
        .returning("*");

      return leaveRequest;
    } catch (error) {
      console.error("Error creating leave request:", error);
      // Re-throw validation errors as-is, wrap other errors
      if (error.message.includes("already have an approved leave request")) {
        throw error;
      }
      throw new Error("Failed to create leave request");
    }
  }

  // Get leave requests for a specific employee
  static async getMine(employeeId, { page = 1, limit = 20 } = {}) {
    try {
      const offset = (page - 1) * limit;

      const query = db("leave_requests as lr")
        .select(
          "lr.id",
          "lr.employee_id",
          db.raw("to_char(lr.from_date, 'YYYY-MM-DD') as from_date"),
          db.raw("to_char(lr.to_date, 'YYYY-MM-DD') as to_date"),
          "lr.leave_type",
          "lr.reason",
          "lr.status",
          "lr.approved_by_manager",
          "lr.manager_approved_at",
          "lr.manager_notes",
          "lr.approved_by_hr",
          "lr.hr_approved_at",
          "lr.hr_notes",
          "lr.rejected_by",
          "lr.rejected_at",
          "lr.rejection_reason",
          "lr.created_at",
          "lr.updated_at",
          "e.first_name",
          "e.last_name",
          "e.employee_id as employee_code",
          db.raw("COALESCE(mgr.first_name, '') as manager_first_name"),
          db.raw("COALESCE(mgr.last_name, '') as manager_last_name"),
          db.raw("COALESCE(hr.first_name, '') as hr_first_name"),
          db.raw("COALESCE(hr.last_name, '') as hr_last_name")
        )
        .leftJoin("employees as e", "lr.employee_id", "e.id")
        .leftJoin("employees as mgr", "lr.approved_by_manager", "mgr.id")
        .leftJoin("employees as hr", "lr.approved_by_hr", "hr.id")
        .where("lr.employee_id", employeeId)
        .whereNull("lr.deleted_at")
        .orderBy("lr.created_at", "desc")
        .limit(limit)
        .offset(offset);

      const rows = await query;

      return rows;
    } catch (error) {
      console.error("Error fetching employee leave requests:", error);
      throw new Error("Failed to retrieve leave requests");
    }
  }

  // Get all leave requests with filtering (for managers and HR)
  static async getAll({
    status,
    branch_id,
    department_only,
    department,
    page = 1,
    limit = 50,
  } = {}) {
    try {
      const offset = (page - 1) * limit;

      // Base query with employee and approver information
      let query = db("leave_requests as lr")
        .select(
          "lr.id",
          "lr.employee_id",
          db.raw("to_char(lr.from_date, 'YYYY-MM-DD') as from_date"),
          db.raw("to_char(lr.to_date, 'YYYY-MM-DD') as to_date"),
          "lr.leave_type",
          "lr.reason",
          "lr.status",
          "lr.approved_by_manager",
          "lr.manager_approved_at",
          "lr.manager_notes",
          "lr.approved_by_hr",
          "lr.hr_approved_at",
          "lr.hr_notes",
          "lr.rejected_by",
          "lr.rejected_at",
          "lr.rejection_reason",
          "lr.created_by",
          "lr.updated_by",
          "lr.created_at",
          "lr.updated_at",
          "e.first_name",
          "e.last_name",
          "e.employee_id as employee_code",
          "e.role_id",
          "e.branch_id",
          "e.department",
          db.raw("COALESCE(mgr.first_name, '') as manager_first_name"),
          db.raw("COALESCE(mgr.last_name, '') as manager_last_name"),
          db.raw("COALESCE(hr.first_name, '') as hr_first_name"),
          db.raw("COALESCE(hr.last_name, '') as hr_last_name")
        )
        .leftJoin("employees as e", "lr.employee_id", "e.id")
        .leftJoin("employees as mgr", "lr.approved_by_manager", "mgr.id")
        .leftJoin("employees as hr", "lr.approved_by_hr", "hr.id")
        .whereNull("lr.deleted_at")
        .orderBy("lr.created_at", "desc");

      // Apply filters
      if (status) {
        query = query.where("lr.status", status);
      }

      if (branch_id) {
        query = query.where("e.branch_id", branch_id);
      }

      if (department) {
        query = query.where("e.department", department);
      }

      // Get total count for pagination (simplified query without joins)
      const countQuery = db("leave_requests as lr")
        .leftJoin("employees as e", "lr.employee_id", "e.id")
        .whereNull("lr.deleted_at");

      // Apply same filters to count query
      if (status) {
        countQuery.where("lr.status", status);
      }
      if (branch_id) {
        countQuery.where("e.branch_id", branch_id);
      }
      if (department) {
        countQuery.where("e.department", department);
      }

      const count = await countQuery.count("* as count").first();
      const totalRecords = parseInt(count.count);

      // Apply pagination
      query = query.limit(limit).offset(offset);

      const rows = await query;

      return {
        data: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalRecords,
          totalPages: Math.max(1, Math.ceil(totalRecords / limit)),
        },
      };
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      throw new Error("Failed to retrieve leave requests");
    }
  }

  // Get leave request by ID
  static async getById(id) {
    try {
      const leaveRequest = await db("leave_requests as lr")
        .select(
          "lr.*",
          "e.first_name",
          "e.last_name",
          "e.employee_id as employee_code",
          "e.branch_id",
          "e.department",
          db.raw("COALESCE(mgr.first_name, '') as manager_first_name"),
          db.raw("COALESCE(mgr.last_name, '') as manager_last_name"),
          db.raw("COALESCE(hr.first_name, '') as hr_first_name"),
          db.raw("COALESCE(hr.last_name, '') as hr_last_name")
        )
        .leftJoin("employees as e", "lr.employee_id", "e.id")
        .leftJoin("employees as mgr", "lr.approved_by_manager", "mgr.id")
        .leftJoin("employees as hr", "lr.approved_by_hr", "hr.id")
        .where("lr.id", id)
        .whereNull("lr.deleted_at")
        .first();

      return leaveRequest;
    } catch (error) {
      console.error("Error fetching leave request:", error);
      throw new Error("Failed to retrieve leave request");
    }
  }

  // Approve by branch manager
  static async approveByManager(id, managerId, notes = null) {
    try {
      const leaveRequest = await this.getById(id);
      if (!leaveRequest) {
        throw new Error("Leave request not found");
      }

      if (leaveRequest.status !== "pending") {
        throw new Error(`Leave request is already ${leaveRequest.status}`);
      }

      // Allow employees to approve their own requests

      const [updated] = await db("leave_requests")
        .where("id", id)
        .update({
          status: "approved_by_manager",
          approved_by_manager: managerId,
          manager_approved_at: formatForDatabase(),
          manager_notes: notes,
          updated_at: formatForDatabase(),
        })
        .returning("*");

      return updated;
    } catch (error) {
      console.error("Error approving leave by manager:", error);
      // Re-throw the original error to preserve the specific error message
      throw error;
    }
  }

  // Approve by HR department
  static async approveByHR(id, hrId, notes = null) {
    try {
      const leaveRequest = await this.getById(id);
      if (!leaveRequest) {
        throw new Error("Leave request not found");
      }

      // Allow employees to approve their own requests

      // Check if this is a department employee (single approval) or branch employee (dual approval)
      if (leaveRequest.branch_id) {
        // Branch employee - must be approved by manager first
        if (leaveRequest.status !== "approved_by_manager") {
          throw new Error(
            "Branch employee leave request must be approved by manager first"
          );
        }
      } else {
        // Department employee - can be approved directly by HR
        if (leaveRequest.status !== "pending") {
          throw new Error(
            "Department employee leave request must be pending for HR approval"
          );
        }
      }

      const [updated] = await db("leave_requests")
        .where("id", id)
        .update({
          status: "approved_by_hr",
          approved_by_hr: hrId,
          hr_approved_at: formatForDatabase(),
          hr_notes: notes,
          updated_at: formatForDatabase(),
        })
        .returning("*");

      return updated;
    } catch (error) {
      console.error("Error approving leave by HR:", error);
      // Re-throw the original error to preserve the specific error message
      throw error;
    }
  }

  // Reject leave request
  static async reject(id, rejectedById, rejectionReason) {
    try {
      const leaveRequest = await this.getById(id);
      if (!leaveRequest) {
        throw new Error("Leave request not found");
      }

      if (leaveRequest.status === "rejected") {
        throw new Error("Leave request is already rejected");
      }

      if (leaveRequest.status === "approved_by_hr") {
        throw new Error("Cannot reject an already approved leave request");
      }

      const [updated] = await db("leave_requests")
        .where("id", id)
        .update({
          status: "rejected",
          rejected_by: rejectedById,
          rejected_at: formatForDatabase(),
          rejection_reason: rejectionReason,
          updated_at: formatForDatabase(),
        })
        .returning("*");

      return updated;
    } catch (error) {
      console.error("Error rejecting leave request:", error);
      // Re-throw the original error to preserve the specific error message
      throw error;
    }
  }

  // Update leave request (only if pending)
  static async update(id, updateData, updatedBy = null) {
    try {
      const leaveRequest = await this.getById(id);
      if (!leaveRequest) {
        throw new Error("Leave request not found");
      }

      if (leaveRequest.status !== "pending") {
        throw new Error("Cannot update leave request that is not pending");
      }

      const [updated] = await db("leave_requests")
        .where("id", id)
        .update({
          ...updateData,
          updated_by: updatedBy,
          updated_at: formatForDatabase(),
        })
        .returning("*");

      return updated;
    } catch (error) {
      console.error("Error updating leave request:", error);
      throw new Error("Failed to update leave request");
    }
  }

  // Soft delete leave request
  static async delete(id) {
    try {
      const leaveRequest = await this.getById(id);
      if (!leaveRequest) {
        throw new Error("Leave request not found");
      }

      if (leaveRequest.status === "approved_by_hr") {
        throw new Error("Cannot delete an approved leave request");
      }

      await db("leave_requests").where("id", id).update({
        deleted_at: formatForDatabase(),
        updated_at: formatForDatabase(),
      });

      return true;
    } catch (error) {
      console.error("Error deleting leave request:", error);
      throw new Error("Failed to delete leave request");
    }
  }

  // Get leave requests pending manager approval
  static async getPendingManagerApproval(branchId = null) {
    try {
      let query = db("leave_requests as lr")
        .select(
          "lr.id",
          "lr.employee_id",
          db.raw("to_char(lr.from_date, 'YYYY-MM-DD') as from_date"),
          db.raw("to_char(lr.to_date, 'YYYY-MM-DD') as to_date"),
          "lr.leave_type",
          "lr.reason",
          "lr.status",
          "lr.created_at",
          "e.first_name",
          "e.last_name",
          "e.employee_id as employee_code",
          "e.branch_id",
          "e.department"
        )
        .leftJoin("employees as e", "lr.employee_id", "e.id")
        .where("lr.status", "pending")
        .whereNull("lr.deleted_at")
        .orderBy("lr.created_at", "desc");

      if (branchId) {
        query = query.where("e.branch_id", branchId);
      }

      const rows = await query;
      return rows;
    } catch (error) {
      console.error("Error fetching pending manager approvals:", error);
      throw new Error("Failed to retrieve pending manager approvals");
    }
  }

  // Get department employee requests that need direct HR approval (single approval)
  static async getDepartmentEmployeeRequests() {
    try {
      const rows = await db("leave_requests as lr")
        .select(
          "lr.id",
          "lr.employee_id",
          db.raw("to_char(lr.from_date, 'YYYY-MM-DD') as from_date"),
          db.raw("to_char(lr.to_date, 'YYYY-MM-DD') as to_date"),
          "lr.leave_type",
          "lr.reason",
          "lr.status",
          "lr.created_at",
          "e.first_name",
          "e.last_name",
          "e.employee_id as employee_code",
          "e.branch_id",
          "e.department"
        )
        .leftJoin("employees as e", "lr.employee_id", "e.id")
        .where("lr.status", "pending")
        .whereNull("e.branch_id") // Department employees only
        .whereNull("lr.deleted_at")
        .orderBy("lr.created_at", "desc");

      return rows;
    } catch (error) {
      console.error("Error fetching department employee requests:", error);
      throw new Error("Failed to retrieve department employee requests");
    }
  }

  // Get leave requests pending HR approval (branch employees only)
  static async getPendingHRApproval() {
    try {
      const rows = await db("leave_requests as lr")
        .select(
          "lr.id",
          "lr.employee_id",
          db.raw("to_char(lr.from_date, 'YYYY-MM-DD') as from_date"),
          db.raw("to_char(lr.to_date, 'YYYY-MM-DD') as to_date"),
          "lr.leave_type",
          "lr.reason",
          "lr.status",
          "lr.manager_approved_at",
          "lr.manager_notes",
          "lr.created_at",
          "e.first_name",
          "e.last_name",
          "e.employee_id as employee_code",
          "e.branch_id",
          "e.department",
          db.raw("COALESCE(mgr.first_name, '') as manager_first_name"),
          db.raw("COALESCE(mgr.last_name, '') as manager_last_name")
        )
        .leftJoin("employees as e", "lr.employee_id", "e.id")
        .leftJoin("employees as mgr", "lr.approved_by_manager", "mgr.id")
        .where("lr.status", "approved_by_manager")
        .whereNull("lr.deleted_at")
        .orderBy("lr.created_at", "desc");

      return rows;
    } catch (error) {
      console.error("Error fetching pending HR approvals:", error);
      throw new Error("Failed to retrieve pending HR approvals");
    }
  }
}

module.exports = LeaveRequest;
