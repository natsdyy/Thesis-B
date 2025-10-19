const { db } = require("../config/database");

class EmployeeTransferRequest {
  /**
   * Create a new transfer request
   * @param {Object} requestData - Transfer request data
   * @param {number} requestedBy - ID of the manager requesting the transfer
   * @returns {Promise<Object>} Created transfer request
   */
  static async create(requestData, requestedBy) {
    try {
      const {
        employee_id,
        employee_role,
        transfer_type,
        from_branch_id,
        to_branch_id,
        reason,
      } = requestData;

      // Validate required fields
      if (!transfer_type || !to_branch_id || !reason) {
        throw new Error(
          "Transfer type, destination branch, and reason are required"
        );
      }

      // For transfer_out, employee_id and from_branch_id are required
      if (transfer_type === "transfer_out") {
        if (!employee_id || !from_branch_id) {
          throw new Error(
            "Employee and source branch are required for transfer out"
          );
        }
      }

      // For transfer_in, employee_role is required instead of employee_id
      if (transfer_type === "transfer_in") {
        if (!employee_role) {
          throw new Error("Employee role is required for transfer in");
        }
      }

      // Validate transfer type
      if (!["transfer_in", "transfer_out"].includes(transfer_type)) {
        throw new Error(
          "Invalid transfer type. Must be transfer_in or transfer_out"
        );
      }

      // Validate that from_branch_id and to_branch_id are different (only for transfer_out)
      if (transfer_type === "transfer_out" && from_branch_id === to_branch_id) {
        throw new Error("Source and destination branches cannot be the same");
      }

      // Check if employee exists (only for transfer_out)
      let employee = null;
      if (transfer_type === "transfer_out") {
        employee = await db("employees").where("id", employee_id).first();
        if (!employee) {
          throw new Error("Employee not found");
        }

        // Check if employee is already in the source branch (for transfer_out)
        if (employee.branch_id !== from_branch_id) {
          throw new Error(
            "Employee is not currently assigned to the source branch"
          );
        }
      }

      // For transfer_in, we don't validate employee branch since we don't have a specific employee yet

      // Check if there's already a pending request for this employee (only for transfer_out)
      if (transfer_type === "transfer_out") {
        const existingRequest = await db("employee_transfer_requests")
          .where("employee_id", employee_id)
          .where("status", "pending")
          .first();

        if (existingRequest) {
          throw new Error("Employee already has a pending transfer request");
        }
      }

      // Create the transfer request
      const insertData = {
        requested_by: requestedBy,
        transfer_type,
        to_branch_id,
        reason: reason.trim(),
        status: "pending",
      };

      // Add employee_id and from_branch_id only for transfer_out
      if (transfer_type === "transfer_out") {
        insertData.employee_id = employee_id;
        insertData.from_branch_id = from_branch_id;
      } else if (transfer_type === "transfer_in") {
        insertData.employee_role = employee_role;
        insertData.from_branch_id = null; // Explicitly set to null for transfer_in
      }

      const [transferRequest] = await db("employee_transfer_requests")
        .insert(insertData)
        .returning("*");

      return transferRequest;
    } catch (error) {
      console.error("Error creating transfer request:", error);
      throw error;
    }
  }

  /**
   * Get transfer request by ID with related data
   * @param {number} id - Transfer request ID
   * @returns {Promise<Object|null>} Transfer request with employee and branch details
   */
  static async getById(id) {
    try {
      const transferRequest = await db("employee_transfer_requests as etr")
        .leftJoin("employees as emp", "etr.employee_id", "emp.id")
        .leftJoin("employees as req", "etr.requested_by", "req.id")
        .leftJoin("employees as app", "etr.approved_by", "app.id")
        .leftJoin("branches as fb", "etr.from_branch_id", "fb.id")
        .leftJoin("branches as tb", "etr.to_branch_id", "tb.id")
        .select(
          "etr.*",
          "emp.first_name as employee_first_name",
          "emp.last_name as employee_last_name",
          "emp.employee_id as employee_code",
          "emp.email as employee_email",
          "req.first_name as requested_by_first_name",
          "req.last_name as requested_by_last_name",
          "app.first_name as approved_by_first_name",
          "app.last_name as approved_by_last_name",
          "fb.name as from_branch_name",
          "fb.code as from_branch_code",
          "tb.name as to_branch_name",
          "tb.code as to_branch_code"
        )
        .where("etr.id", id)
        .whereNull("etr.deleted_at")
        .first();

      if (!transferRequest) {
        return null;
      }

      // Format the response
      return {
        ...transferRequest,
        employee_name: `${transferRequest.employee_first_name} ${transferRequest.employee_last_name}`,
        employee_code: transferRequest.employee_code,
        employee_email: transferRequest.employee_email,
        requested_by_name: `${transferRequest.requested_by_first_name} ${transferRequest.requested_by_last_name}`,
        approved_by_name:
          transferRequest.approved_by_first_name &&
          transferRequest.approved_by_last_name
            ? `${transferRequest.approved_by_first_name} ${transferRequest.approved_by_last_name}`
            : null,
        from_branch_display: `${transferRequest.from_branch_name} (${transferRequest.from_branch_code})`,
        to_branch_display: `${transferRequest.to_branch_name} (${transferRequest.to_branch_code})`,
      };
    } catch (error) {
      console.error("Error fetching transfer request by ID:", error);
      throw error;
    }
  }

  /**
   * Get all transfer requests with optional filters
   * @param {Object} filters - Optional filters (status, branch_id, employee_id)
   * @returns {Promise<Array>} Array of transfer requests
   */
  static async getAll(filters = {}) {
    try {
      let query = db("employee_transfer_requests as etr")
        .leftJoin("employees as emp", "etr.employee_id", "emp.id")
        .leftJoin("employees as req", "etr.requested_by", "req.id")
        .leftJoin("employees as app", "etr.approved_by", "app.id")
        .leftJoin("branches as fb", "etr.from_branch_id", "fb.id")
        .leftJoin("branches as tb", "etr.to_branch_id", "tb.id")
        .select(
          "etr.*",
          "emp.first_name as employee_first_name",
          "emp.last_name as employee_last_name",
          "emp.employee_id as employee_code",
          "emp.email as employee_email",
          "req.first_name as requested_by_first_name",
          "req.last_name as requested_by_last_name",
          "app.first_name as approved_by_first_name",
          "app.last_name as approved_by_last_name",
          "fb.name as from_branch_name",
          "fb.code as from_branch_code",
          "tb.name as to_branch_name",
          "tb.code as to_branch_code"
        )
        .whereNull("etr.deleted_at");

      // Apply filters
      if (filters.status) {
        query = query.where("etr.status", filters.status);
      }

      if (filters.branch_id) {
        query = query.where(function () {
          this.where("etr.from_branch_id", filters.branch_id).orWhere(
            "etr.to_branch_id",
            filters.branch_id
          );
        });
      }

      if (filters.employee_id) {
        query = query.where("etr.employee_id", filters.employee_id);
      }

      if (filters.requested_by) {
        query = query.where("etr.requested_by", filters.requested_by);
      }

      const transferRequests = await query.orderBy("etr.created_at", "desc");

      // Format the response
      return transferRequests.map((request) => ({
        ...request,
        employee_name: `${request.employee_first_name} ${request.employee_last_name}`,
        employee_code: request.employee_code,
        employee_email: request.employee_email,
        requested_by_name: `${request.requested_by_first_name} ${request.requested_by_last_name}`,
        approved_by_name:
          request.approved_by_first_name && request.approved_by_last_name
            ? `${request.approved_by_first_name} ${request.approved_by_last_name}`
            : null,
        from_branch_display: `${request.from_branch_name} (${request.from_branch_code})`,
        to_branch_display: `${request.to_branch_name} (${request.to_branch_code})`,
      }));
    } catch (error) {
      console.error("Error fetching transfer requests:", error);
      throw error;
    }
  }

  /**
   * Get all pending transfer requests
   * @returns {Promise<Array>} Array of pending transfer requests
   */
  static async getPendingRequests() {
    return this.getAll({ status: "pending" });
  }

  /**
   * Get transfer requests for a specific branch
   * @param {number} branchId - Branch ID
   * @returns {Promise<Array>} Array of transfer requests for the branch
   */
  static async getRequestsByBranch(branchId) {
    return this.getAll({ branch_id: branchId });
  }

  /**
   * Approve a transfer request and update employee's branch
   * @param {number} id - Transfer request ID
   * @param {number} approvedBy - ID of the HR who approved
   * @param {string} notes - Optional approval notes
   * @returns {Promise<Object>} Updated transfer request
   */
  static async approve(id, approvedBy, notes = "") {
    try {
      const transferRequest = await db("employee_transfer_requests")
        .where("id", id)
        .where("status", "pending")
        .first();

      if (!transferRequest) {
        throw new Error("Transfer request not found or not pending");
      }

      // Start a transaction
      const trx = await db.transaction();

      try {
        // Update the transfer request
        const [updatedRequest] = await trx("employee_transfer_requests")
          .where("id", id)
          .update({
            status: "approved",
            approved_by: approvedBy,
            approval_notes: notes.trim(),
            approved_at: new Date(),
            completed_at: new Date(),
          })
          .returning("*");

        // Update the employee's branch_id
        await trx("employees").where("id", transferRequest.employee_id).update({
          branch_id: transferRequest.to_branch_id,
        });

        // Commit the transaction
        await trx.commit();

        return updatedRequest;
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      console.error("Error approving transfer request:", error);
      throw error;
    }
  }

  /**
   * Reject a transfer request
   * @param {number} id - Transfer request ID
   * @param {number} approvedBy - ID of the HR who rejected
   * @param {string} notes - Required rejection notes
   * @returns {Promise<Object>} Updated transfer request
   */
  static async reject(id, approvedBy, notes = "") {
    try {
      if (!notes || !notes.trim()) {
        throw new Error("Rejection notes are required");
      }

      const transferRequest = await db("employee_transfer_requests")
        .where("id", id)
        .where("status", "pending")
        .first();

      if (!transferRequest) {
        throw new Error("Transfer request not found or not pending");
      }

      const [updatedRequest] = await db("employee_transfer_requests")
        .where("id", id)
        .update({
          status: "rejected",
          approved_by: approvedBy,
          approval_notes: notes.trim(),
          approved_at: new Date(),
        })
        .returning("*");

      return updatedRequest;
    } catch (error) {
      console.error("Error rejecting transfer request:", error);
      throw error;
    }
  }

  /**
   * Complete a transfer request (mark as completed and trigger email)
   * @param {number} id - Transfer request ID
   * @returns {Promise<Object>} Updated transfer request
   */
  static async completeTransfer(id) {
    try {
      const transferRequest = await db("employee_transfer_requests")
        .where("id", id)
        .where("status", "approved")
        .first();

      if (!transferRequest) {
        throw new Error("Transfer request not found or not approved");
      }

      const [updatedRequest] = await db("employee_transfer_requests")
        .where("id", id)
        .update({
          completed_at: new Date(),
        })
        .returning("*");

      return updatedRequest;
    } catch (error) {
      console.error("Error completing transfer request:", error);
      throw error;
    }
  }

  /**
   * Get transfer request statistics
   * @returns {Promise<Object>} Statistics object
   */
  static async getStats() {
    try {
      const stats = await db("employee_transfer_requests")
        .whereNull("deleted_at")
        .select(
          db.raw("COUNT(*) as total_requests"),
          db.raw(
            'COUNT(CASE WHEN status = "pending" THEN 1 END) as pending_requests'
          ),
          db.raw(
            'COUNT(CASE WHEN status = "approved" THEN 1 END) as approved_requests'
          ),
          db.raw(
            'COUNT(CASE WHEN status = "rejected" THEN 1 END) as rejected_requests'
          )
        )
        .first();

      return {
        totalRequests: parseInt(stats.total_requests) || 0,
        pendingRequests: parseInt(stats.pending_requests) || 0,
        approvedRequests: parseInt(stats.approved_requests) || 0,
        rejectedRequests: parseInt(stats.rejected_requests) || 0,
      };
    } catch (error) {
      console.error("Error fetching transfer request stats:", error);
      throw error;
    }
  }
}

module.exports = EmployeeTransferRequest;
