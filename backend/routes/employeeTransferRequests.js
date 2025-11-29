const express = require("express");
const router = express.Router();
const EmployeeTransferRequest = require("../models/EmployeeTransferRequest");
const { authenticateToken } = require("../middleware/rbac");
const SendGridService = require("../services/sendGridService");

/**
 * @swagger
 * components:
 *   schemas:
 *     EmployeeTransferRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         employee_id:
 *           type: integer
 *         requested_by:
 *           type: integer
 *         transfer_type:
 *           type: string
 *           enum: [transfer_in, transfer_out]
 *         from_branch_id:
 *           type: integer
 *         to_branch_id:
 *           type: integer
 *         reason:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         approved_by:
 *           type: integer
 *         approval_notes:
 *           type: string
 *         approved_at:
 *           type: string
 *           format: date-time
 *         completed_at:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/employee-transfer-requests:
 *   post:
 *     summary: Create a new transfer request
 *     tags: [Employee Transfer Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employee_id
 *               - transfer_type
 *               - from_branch_id
 *               - to_branch_id
 *               - reason
 *             properties:
 *               employee_id:
 *                 type: integer
 *               transfer_type:
 *                 type: string
 *                 enum: [transfer_in, transfer_out]
 *               from_branch_id:
 *                 type: integer
 *               to_branch_id:
 *                 type: integer
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transfer request created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only managers can create transfer requests
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    // Check if user is a manager
    if (req.user.role !== "Manager") {
      return res.status(403).json({
        success: false,
        message: "Only managers can create transfer requests",
      });
    }

    const requestedBy = req.user.id;
    const transferRequest = await EmployeeTransferRequest.create(
      req.body,
      requestedBy
    );

    res.status(201).json({
      success: true,
      data: transferRequest,
      message: "Transfer request created successfully",
    });
  } catch (error) {
    console.error("Error creating transfer request:", error);

    if (
      error.message.includes("required") ||
      error.message.includes("Invalid") ||
      error.message.includes("not found") ||
      error.message.includes("already has a pending")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating transfer request",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employee-transfer-requests:
 *   get:
 *     summary: Get all transfer requests
 *     tags: [Employee Transfer Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by status
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: integer
 *         description: Filter by branch ID
 *       - in: query
 *         name: employee_id
 *         schema:
 *           type: integer
 *         description: Filter by employee ID
 *     responses:
 *       200:
 *         description: Transfer requests retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const filters = {};

    if (req.query.status) {
      filters.status = req.query.status;
    }

    if (req.query.branch_id) {
      filters.branch_id = parseInt(req.query.branch_id);
    }

    if (req.query.employee_id) {
      filters.employee_id = parseInt(req.query.employee_id);
    }

    // If user is not HR/Manager, only show requests for their branch
    if (
      req.user.role !== "HR" &&
      req.user.role !== "Manager" &&
      req.user.role !== "Super Admin"
    ) {
      filters.branch_id = req.user.branch_id;
    }

    const transferRequests = await EmployeeTransferRequest.getAll(filters);

    res.json({
      success: true,
      data: transferRequests,
      message: "Transfer requests retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching transfer requests:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching transfer requests",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employee-transfer-requests/pending:
 *   get:
 *     summary: Get all pending transfer requests (HR only)
 *     tags: [Employee Transfer Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending transfer requests retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only HR can access pending requests
 */
router.get("/pending", authenticateToken, async (req, res) => {
  try {
    // Check if user is HR, HR Manager, or Super Admin
    if (
      req.user.role !== "HR" &&
      req.user.role !== "Manager" &&
      req.user.role !== "Super Admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only HR staff can access pending transfer requests",
      });
    }

    const pendingRequests = await EmployeeTransferRequest.getPendingRequests();

    res.json({
      success: true,
      data: pendingRequests,
      message: "Pending transfer requests retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching pending transfer requests:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching pending transfer requests",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employee-transfer-requests/branch/{branchId}:
 *   get:
 *     summary: Get transfer requests for a specific branch
 *     tags: [Employee Transfer Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Branch transfer requests retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/branch/:branchId", authenticateToken, async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);

    // If user is not HR/Manager/Super Admin, check if they belong to this branch
    if (
      req.user.role !== "HR" &&
      req.user.role !== "Manager" &&
      req.user.role !== "Super Admin"
    ) {
      if (parseInt(req.user.branch_id) !== branchId) {
        return res.status(403).json({
          success: false,
          message: "You can only view transfer requests for your branch",
        });
      }
    }

    const branchRequests =
      await EmployeeTransferRequest.getRequestsByBranch(branchId);

    res.json({
      success: true,
      data: branchRequests,
      message: "Branch transfer requests retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching branch transfer requests:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching branch transfer requests",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employee-transfer-requests/{id}:
 *   get:
 *     summary: Get transfer request by ID
 *     tags: [Employee Transfer Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transfer request ID
 *     responses:
 *       200:
 *         description: Transfer request retrieved successfully
 *       404:
 *         description: Transfer request not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const transferRequest = await EmployeeTransferRequest.getById(id);

    if (!transferRequest) {
      return res.status(404).json({
        success: false,
        message: "Transfer request not found",
      });
    }

    // Check if user has permission to view this request
    const isHR =
      req.user.role === "HR" ||
      req.user.role === "Manager" ||
      req.user.role === "Super Admin";
    const isBranchManager =
      req.user.role === "Manager" &&
      (req.user.branch_id === transferRequest.from_branch_id ||
        req.user.branch_id === transferRequest.to_branch_id);

    if (!isHR && !isBranchManager) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this transfer request",
      });
    }

    res.json({
      success: true,
      data: transferRequest,
      message: "Transfer request retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching transfer request:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching transfer request",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employee-transfer-requests/{id}/approve:
 *   post:
 *     summary: Approve a transfer request (HR only)
 *     tags: [Employee Transfer Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transfer request ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Optional approval notes
 *     responses:
 *       200:
 *         description: Transfer request approved successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - Only HR can approve requests
 *       404:
 *         description: Transfer request not found
 *       401:
 *         description: Unauthorized
 */
router.post("/:id/approve", authenticateToken, async (req, res) => {
  try {
    // Check if user is HR, Manager, or Super Admin
    if (
      req.user.role !== "HR" &&
      req.user.role !== "Manager" &&
      req.user.role !== "Super Admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only HR staff can approve transfer requests",
      });
    }

    const id = parseInt(req.params.id);
    const approvedBy = req.user.id;
    const notes = req.body.notes || "";

    const approvedRequest = await EmployeeTransferRequest.approve(
      id,
      approvedBy,
      notes
    );

    // Send email notification to employee
    try {
      const fullRequest = await EmployeeTransferRequest.getById(id);
      if (fullRequest && fullRequest.employee_email) {
        const emailResult =
          await SendGridService.sendEmployeeTransferNotification(
            fullRequest.employee_email,
            fullRequest.employee_name,
            fullRequest.from_branch_name,
            fullRequest.to_branch_name,
            new Date(),
            fullRequest.requested_by_name
          );

        if (emailResult.success) {
          console.log(
            `✅ Transfer notification email sent to ${fullRequest.employee_email}`
          );
        } else {
          console.error(
            `❌ Failed to send transfer notification email:`,
            emailResult.error
          );
        }
      }
    } catch (emailError) {
      console.error("Error sending transfer notification email:", emailError);
      // Don't fail the approval if email fails
    }

    res.json({
      success: true,
      data: approvedRequest,
      message: "Transfer request approved successfully",
    });
  } catch (error) {
    console.error("Error approving transfer request:", error);

    if (
      error.message.includes("not found") ||
      error.message.includes("not pending")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error approving transfer request",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employee-transfer-requests/{id}/reject:
 *   post:
 *     summary: Reject a transfer request (HR only)
 *     tags: [Employee Transfer Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transfer request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notes
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Required rejection notes
 *     responses:
 *       200:
 *         description: Transfer request rejected successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - Only HR can reject requests
 *       404:
 *         description: Transfer request not found
 *       401:
 *         description: Unauthorized
 */
router.post("/:id/reject", authenticateToken, async (req, res) => {
  try {
    // Check if user is HR, Manager, or Super Admin
    if (
      req.user.role !== "HR" &&
      req.user.role !== "Manager" &&
      req.user.role !== "Super Admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only HR staff can reject transfer requests",
      });
    }

    const id = parseInt(req.params.id);
    const approvedBy = req.user.id;
    const notes = req.body.notes;

    if (!notes || !notes.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection notes are required",
      });
    }

    const rejectedRequest = await EmployeeTransferRequest.reject(
      id,
      approvedBy,
      notes
    );

    res.json({
      success: true,
      data: rejectedRequest,
      message: "Transfer request rejected successfully",
    });
  } catch (error) {
    console.error("Error rejecting transfer request:", error);

    if (
      error.message.includes("not found") ||
      error.message.includes("not pending") ||
      error.message.includes("required")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error rejecting transfer request",
      error: error.message,
    });
  }
});

module.exports = router;
