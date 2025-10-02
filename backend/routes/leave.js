const express = require("express");
const router = express.Router();
const LeaveRequest = require("../models/LeaveRequest");
const {
  getCurrentPhilippineDate,
  formatPhilippineTime,
} = require("../utils/timezoneUtils");
// Normalize YYYY-MM-DD in Asia/Manila
function normalizePHDateString(input) {
  if (!input) return input;
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date(input);
  // Fallback: if invalid date, return original
  if (isNaN(d.getTime())) return input;
  return formatPhilippineTime(d, "date").replace(/\//g, "-");
}
const { db } = require("../config/database");
const { authenticateToken } = require("../middleware/rbac");
const { requireAnyPermission } = require("../middleware/rbac");

/**
 * @swagger
 * components:
 *   schemas:
 *     LeaveRequest:
 *       type: object
 *       required:
 *         - from_date
 *         - to_date
 *         - leave_type
 *         - reason
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated ID
 *         employee_id:
 *           type: integer
 *           description: ID of the employee requesting leave
 *         from_date:
 *           type: string
 *           format: date
 *           description: Start date of leave
 *         to_date:
 *           type: string
 *           format: date
 *           description: End date of leave
 *         leave_type:
 *           type: string
 *           description: Type of leave (Sick Leave, Vacation Leave, etc.)
 *         reason:
 *           type: string
 *           description: Reason for leave request
 *         status:
 *           type: string
 *           enum: [pending, approved_by_manager, approved_by_hr, rejected]
 *           description: Current status of the leave request
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: When the request was created
 */

/**
 * @swagger
 * tags:
 *   name: Leave Requests
 *   description: Leave request management endpoints
 */

/**
 * @swagger
 * /api/leave:
 *   get:
 *     summary: Get all leave requests
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved_by_manager, approved_by_hr, rejected]
 *         description: Filter by status
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: integer
 *         description: Filter by branch ID
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of leave requests
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/",
  authenticateToken,
  requireAnyPermission([
    "Manage Employees",
    "Manage Attendance",
    "Approve Leave Requests",
    "View Leave Reports",
    "Manage Employee Leave",
  ]),
  async (req, res) => {
    try {
      const { status, branch_id, department, page = 1, limit = 50 } = req.query;

      const result = await LeaveRequest.getAll({
        status,
        branch_id: branch_id ? parseInt(branch_id) : undefined,
        department,
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching leave requests",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/leave/my-requests:
 *   get:
 *     summary: Get my leave requests
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of my leave requests
 *       401:
 *         description: Unauthorized
 */
router.get("/my-requests", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const employeeId = req.user.id;

    const leaveRequests = await LeaveRequest.getMine(employeeId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: leaveRequests,
    });
  } catch (error) {
    console.error("Error fetching my leave requests:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching leave requests",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/leave:
 *   post:
 *     summary: Create a new leave request
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - from_date
 *               - to_date
 *               - leave_type
 *               - reason
 *             properties:
 *               from_date:
 *                 type: string
 *                 format: date
 *                 description: Start date of leave
 *               to_date:
 *                 type: string
 *                 format: date
 *                 description: End date of leave
 *               leave_type:
 *                 type: string
 *                 description: Type of leave
 *               reason:
 *                 type: string
 *                 description: Reason for leave request
 *     responses:
 *       201:
 *         description: Leave request created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { from_date, to_date, leave_type, reason } = req.body;
    const employeeId = req.user.id;
    const createdBy = req.user.id;

    // Basic validation
    if (!from_date || !to_date || !leave_type || !reason) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Normalize to PH YYYY-MM-DD for storage
    const normalizedFrom = normalizePHDateString(from_date);
    const normalizedTo = normalizePHDateString(to_date);

    // Validate date range (compare YYYY-MM-DD strings to avoid TZ issues)
    if (normalizedFrom > normalizedTo) {
      return res.status(400).json({
        success: false,
        message: "From date cannot be later than To date",
      });
    }

    const leaveRequest = await LeaveRequest.create(
      {
        employee_id: employeeId,
        from_date: normalizedFrom,
        to_date: normalizedTo,
        leave_type,
        reason,
      },
      createdBy
    );

    res.status(201).json({
      success: true,
      data: leaveRequest,
      message: "Leave request submitted successfully",
    });
  } catch (error) {
    console.error("Error creating leave request:", error);
    res.status(500).json({
      success: false,
      message: "Error creating leave request",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/leave/department-employees:
 *   get:
 *     summary: Get department employee leave requests (single approval)
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of department employee requests
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/department-employees",
  authenticateToken,
  requireAnyPermission([
    "Approve Leave Requests",
    "Manage Employee Leave",
    "Manage Employees",
  ]),
  async (req, res) => {
    try {
      const departmentRequests =
        await LeaveRequest.getDepartmentEmployeeRequests();

      res.json({
        success: true,
        data: departmentRequests,
      });
    } catch (error) {
      console.error("Error fetching department employee requests:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching department employee requests",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/leave/history:
 *   get:
 *     summary: Get completed/approved leave requests history
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [approved_by_hr, rejected]
 *         description: Filter by completion status
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: integer
 *         description: Filter by branch ID
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of completed leave requests
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/history",
  authenticateToken,
  requireAnyPermission([
    "Approve Leave Requests",
    "Manage Employee Leave",
    "Manage Employees",
    "View Leave Reports",
  ]),
  async (req, res) => {
    try {
      const { status, branch_id, department, page = 1, limit = 10 } = req.query;

      // Build the query for completed requests
      let query = db("leave_requests as lr")
        .select(
          "lr.*",
          "e.first_name",
          "e.last_name",
          "e.employee_id as employee_code",
          "e.branch_id",
          "e.department",
          "b.name as branch_name",
          db.raw("COALESCE(mgr.first_name, '') as manager_first_name"),
          db.raw("COALESCE(mgr.last_name, '') as manager_last_name"),
          db.raw("COALESCE(hr.first_name, '') as hr_first_name"),
          db.raw("COALESCE(hr.last_name, '') as hr_last_name")
        )
        .leftJoin("employees as e", "lr.employee_id", "e.id")
        .leftJoin("branches as b", "e.branch_id", "b.id")
        .leftJoin("employees as mgr", "lr.approved_by_manager", "mgr.id")
        .leftJoin("employees as hr", "lr.approved_by_hr", "hr.id")
        .where("lr.status", "approved_by_hr")
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

      // Get total count for pagination
      const countQuery = db("leave_requests as lr")
        .leftJoin("employees as e", "lr.employee_id", "e.id")
        .leftJoin("branches as b", "e.branch_id", "b.id")
        .where("lr.status", "approved_by_hr")
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

      const countResult = await countQuery.count("* as total").first();
      const totalCount = parseInt(countResult.total);

      // Apply pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const completedRequests = await query
        .offset(offset)
        .limit(parseInt(limit));

      // Format the response data
      const formattedRequests = completedRequests.map((request) => ({
        id: request.id,
        employee_id: request.employee_id,
        first_name: request.first_name || "",
        last_name: request.last_name || "",
        employee_code: request.employee_code || "",
        department: request.department || "",
        branch_id: request.branch_id,
        branch_name: request.branch_name || "",
        leave_type: request.leave_type,
        from_date: request.from_date,
        to_date: request.to_date,
        reason: request.reason,
        status: request.status,
        created_at: request.created_at,
        manager_approved_at: request.manager_approved_at,
        hr_approved_at: request.hr_approved_at,
        rejected_at: request.rejected_at,
        manager_first_name: request.manager_first_name || "",
        manager_last_name: request.manager_last_name || "",
        hr_first_name: request.hr_first_name || "",
        hr_last_name: request.hr_last_name || "",
        manager_notes: request.manager_notes,
        hr_notes: request.hr_notes,
        rejection_reason: request.rejection_reason,
      }));

      const totalPages = Math.ceil(totalCount / parseInt(limit));

      res.json({
        success: true,
        data: formattedRequests,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_items: totalCount,
          items_per_page: parseInt(limit),
        },
      });
    } catch (error) {
      console.error("Error fetching leave history:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching leave history",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/leave/{id}:
 *   get:
 *     summary: Get leave request by ID
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Leave request details
 *       404:
 *         description: Leave request not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const leaveRequest = await LeaveRequest.getById(id);

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    res.json({
      success: true,
      data: leaveRequest,
    });
  } catch (error) {
    console.error("Error fetching leave request:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching leave request",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/leave/{id}/approve-manager:
 *   post:
 *     summary: Approve leave request by branch manager
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Manager notes
 *     responses:
 *       200:
 *         description: Leave request approved by manager
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  "/:id/approve-manager",
  authenticateToken,
  (req, res, next) => {
    const user = req.user || {};
    const roleName = (user.role || "").toLowerCase();

    // Allow branch managers or HR to approve
    if (roleName.includes("manager") || roleName.includes("hr")) {
      return next();
    }

    return requireAnyPermission([
      "Approve Leave Requests",
      "Manage Employees",
      "Manage Attendance",
    ])(req, res, next);
  },
  async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const managerId = req.user.id;

      const updated = await LeaveRequest.approveByManager(id, managerId, notes);

      res.json({
        success: true,
        data: updated,
        message: "Leave request approved by manager",
      });
    } catch (error) {
      console.error("Error approving leave by manager:", error);
      res.status(500).json({
        success: false,
        message: "Error approving leave request",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/leave/{id}/approve-hr:
 *   post:
 *     summary: Approve leave request by HR department
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: HR notes
 *     responses:
 *       200:
 *         description: Leave request approved by HR
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  "/:id/approve-hr",
  authenticateToken,
  requireAnyPermission([
    "Approve Leave Requests",
    "Manage Employee Leave",
    "Manage Employees",
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const hrId = req.user.id;

      const updated = await LeaveRequest.approveByHR(id, hrId, notes);

      res.json({
        success: true,
        data: updated,
        message: "Leave request approved by HR",
      });
    } catch (error) {
      console.error("Error approving leave by HR:", error);
      res.status(500).json({
        success: false,
        message: "Error approving leave request",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/leave/{id}/reject:
 *   post:
 *     summary: Reject leave request
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejection_reason
 *             properties:
 *               rejection_reason:
 *                 type: string
 *                 description: Reason for rejection
 *     responses:
 *       200:
 *         description: Leave request rejected
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  "/:id/reject",
  authenticateToken,
  (req, res, next) => {
    const user = req.user || {};
    const roleName = (user.role || "").toLowerCase();

    // Allow managers or HR to reject
    if (roleName.includes("manager") || roleName.includes("hr")) {
      return next();
    }

    return requireAnyPermission([
      "Approve Leave Requests",
      "Manage Employees",
      "Manage Attendance",
    ])(req, res, next);
  },
  async (req, res) => {
    try {
      const { id } = req.params;
      const { rejection_reason } = req.body;
      const rejectedById = req.user.id;

      if (!rejection_reason) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required",
        });
      }

      const updated = await LeaveRequest.reject(
        id,
        rejectedById,
        rejection_reason
      );

      res.json({
        success: true,
        data: updated,
        message: "Leave request rejected",
      });
    } catch (error) {
      console.error("Error rejecting leave request:", error);
      res.status(500).json({
        success: false,
        message: "Error rejecting leave request",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/leave/{id}:
 *   put:
 *     summary: Update leave request
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               from_date:
 *                 type: string
 *                 format: date
 *               to_date:
 *                 type: string
 *                 format: date
 *               leave_type:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Leave request updated
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Leave request not found
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    if (updateData.from_date) {
      updateData.from_date = normalizePHDateString(updateData.from_date);
    }
    if (updateData.to_date) {
      updateData.to_date = normalizePHDateString(updateData.to_date);
    }
    const updatedBy = req.user.id;

    const updated = await LeaveRequest.update(id, updateData, updatedBy);

    res.json({
      success: true,
      data: updated,
      message: "Leave request updated successfully",
    });
  } catch (error) {
    console.error("Error updating leave request:", error);
    res.status(500).json({
      success: false,
      message: "Error updating leave request",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/leave/{id}:
 *   delete:
 *     summary: Delete leave request
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Leave request deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Leave request not found
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    await LeaveRequest.delete(id);

    res.json({
      success: true,
      message: "Leave request deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting leave request:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting leave request",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/leave/pending/manager:
 *   get:
 *     summary: Get leave requests pending manager approval
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: integer
 *         description: Filter by branch ID (for branch managers)
 *     responses:
 *       200:
 *         description: List of pending manager approvals
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/pending/manager",
  authenticateToken,
  (req, res, next) => {
    const user = req.user || {};
    const roleName = (user.role || "").toLowerCase();

    // Allow branch managers or HR to view
    if (roleName.includes("manager") || roleName.includes("hr")) {
      return next();
    }

    return requireAnyPermission([
      "Approve Leave Requests",
      "Manage Employees",
      "Manage Attendance",
    ])(req, res, next);
  },
  async (req, res) => {
    try {
      const { branch_id } = req.query;
      const branchId = branch_id ? parseInt(branch_id) : null;

      const pendingRequests =
        await LeaveRequest.getPendingManagerApproval(branchId);

      res.json({
        success: true,
        data: pendingRequests,
      });
    } catch (error) {
      console.error("Error fetching pending manager approvals:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching pending approvals",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/leave/pending/hr:
 *   get:
 *     summary: Get leave requests pending HR approval
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending HR approvals
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/pending/hr",
  authenticateToken,
  requireAnyPermission([
    "Approve Leave Requests",
    "Manage Employee Leave",
    "Manage Employees",
  ]),
  async (req, res) => {
    try {
      const pendingRequests = await LeaveRequest.getPendingHRApproval();

      res.json({
        success: true,
        data: pendingRequests,
      });
    } catch (error) {
      console.error("Error fetching pending HR approvals:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching pending HR approvals",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/leave/stats:
 *   get:
 *     summary: Get leave request statistics
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: integer
 *         description: Filter by branch ID
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *     responses:
 *       200:
 *         description: Leave request statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/stats",
  authenticateToken,
  requireAnyPermission([
    "Approve Leave Requests",
    "Manage Employee Leave",
    "Manage Employees",
    "View Leave Reports",
  ]),
  async (req, res) => {
    try {
      const { branch_id, department } = req.query;

      // Get all leave requests for statistics
      const result = await LeaveRequest.getAll({
        branch_id: branch_id ? parseInt(branch_id) : undefined,
        department,
        page: 1,
        limit: 10000, // Get all for stats
      });

      const requests = result.data || [];
      const today = getCurrentPhilippineDate();

      const stats = {
        total: requests.length,
        pending_manager: requests.filter((r) => r.status === "pending").length,
        pending_hr: requests.filter((r) => r.status === "approved_by_manager")
          .length,
        approved: requests.filter((r) => r.status === "approved_by_hr").length,
        rejected: requests.filter((r) => r.status === "rejected").length,
        approved_today: requests.filter((r) => {
          if (r.status !== "approved_by_hr") return false;
          if (!r.hr_approved_at && !r.manager_approved_at) return false;
          const approvedDate = new Date(
            r.hr_approved_at || r.manager_approved_at
          );
          const approvedDatePH = formatPhilippineTime(
            approvedDate,
            "date"
          ).replace(/\//g, "-");
          return approvedDatePH === today;
        }).length,
        by_leave_type: {},
        by_department: {},
        by_branch: {},
      };

      // Calculate statistics by leave type
      requests.forEach((req) => {
        stats.by_leave_type[req.leave_type] =
          (stats.by_leave_type[req.leave_type] || 0) + 1;
        stats.by_department[req.department] =
          (stats.by_department[req.department] || 0) + 1;
        stats.by_branch[req.branch_id] =
          (stats.by_branch[req.branch_id] || 0) + 1;
      });

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error fetching leave statistics:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching leave statistics",
        error: error.message,
      });
    }
  }
);

module.exports = router;
