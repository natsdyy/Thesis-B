// backend/routes/branchRequests.js
const express = require("express");
const router = express.Router();
const BranchRequest = require("../models/BranchRequest");

/**
 * @swagger
 * components:
 *   schemas:
 *     BranchRequest:
 *       type: object
 *       required:
 *         - request_type
 *         - request_description
 *         - request_date
 *         - branch_id
 *         - requested_by
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated unique identifier
 *         request_id:
 *           type: string
 *           description: Unique request identifier (e.g., BR-20240120-001)
 *         request_type:
 *           type: string
 *           description: Type of request (Regular, Emergency, Rush)
 *         request_description:
 *           type: string
 *           description: Detailed description of the request
 *         request_date:
 *           type: string
 *           format: date
 *           description: Date for the request
 *         priority:
 *           type: string
 *           enum: [Low, Normal, High, Urgent]
 *           description: Request priority level
 *         branch_id:
 *           type: integer
 *           description: Branch that made the request
 *         requested_by:
 *           type: string
 *           description: Person who made the request
 *         source_type:
 *           type: string
 *           enum: [scm, production]
 *           description: Source inventory type for the request
 *         status:
 *           type: string
 *           enum: [Draft, Sent, Acknowledged, In Progress, Completed, Cancelled]
 *           description: Current status of the request
 *         main_office_notes:
 *           type: string
 *           description: Notes from main office
 *         acknowledged_by:
 *           type: string
 *           description: Main office user who acknowledged
 *         acknowledged_at:
 *           type: string
 *           format: date-time
 *           description: Acknowledgment timestamp
 *         completed_by:
 *           type: string
 *           description: Main office user who completed
 *         completed_at:
 *           type: string
 *           format: date-time
 *           description: Completion timestamp
 *         cancelled_by:
 *           type: string
 *           description: User who cancelled the request
 *         cancelled_at:
 *           type: string
 *           format: date-time
 *           description: Cancellation timestamp
 *
 *     BranchRequestItem:
 *       type: object
 *       required:
 *         - item_name
 *         - item_quantity
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated unique identifier
 *         item_number:
 *           type: integer
 *           description: Item sequence number in request
 *         item_name:
 *           type: string
 *           description: Name of the item
 *         item_quantity:
 *           type: integer
 *           description: Quantity requested
 *         item_unit:
 *           type: string
 *           description: Unit of measurement
 *         item_type:
 *           type: string
 *           description: Category of item
 *         item_notes:
 *           type: string
 *           description: Additional notes for the item
 */

/**
 * @swagger
 * /api/branch-requests/with-items:
 *   get:
 *     summary: Get all branch requests with items
 *     tags: [Branch Requests]
 *     parameters:
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: integer
 *         description: Filter by branch ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by request status
 *       - in: query
 *         name: source_type
 *         schema:
 *           type: string
 *           enum: [scm, production]
 *         description: Filter by source type
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by specific date
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: Filter by priority
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in description, request_id, or requested_by
 *     responses:
 *       200:
 *         description: List of branch requests with items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/BranchRequest'
 *                       - type: object
 *                         properties:
 *                           items:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/BranchRequestItem'
 *       500:
 *         description: Server error
 */
router.get("/with-items", async (req, res) => {
  try {
    const filters = {
      branch_id: req.query.branch_id,
      status: req.query.status,
      source_type: req.query.source_type,
      date: req.query.date,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      priority: req.query.priority,
      search: req.query.search,
    };

    const requests = await BranchRequest.getAllWithItems(filters);

    res.json({
      success: true,
      data: requests,
      count: requests.length,
    });
  } catch (error) {
    console.error("Error fetching branch requests with items:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve branch requests with items",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/branch-requests:
 *   get:
 *     summary: Get all branch requests
 *     tags: [Branch Requests]
 *     parameters:
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: integer
 *         description: Filter by branch ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by request status
 *       - in: query
 *         name: source_type
 *         schema:
 *           type: string
 *           enum: [scm, production]
 *         description: Filter by source type
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by specific date
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: Filter by priority
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in description, request_id, or requested_by
 *     responses:
 *       200:
 *         description: List of branch requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BranchRequest'
 *       500:
 *         description: Server error
 */
router.get("/", async (req, res) => {
  try {
    const filters = {
      branch_id: req.query.branch_id,
      status: req.query.status,
      source_type: req.query.source_type,
      date: req.query.date,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      priority: req.query.priority,
      search: req.query.search,
    };

    const requests = await BranchRequest.getAll(filters);

    res.json({
      success: true,
      data: requests,
      count: requests.length,
    });
  } catch (error) {
    console.error("Error fetching branch requests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve branch requests",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/branch-requests/stats:
 *   get:
 *     summary: Get branch request statistics
 *     tags: [Branch Requests]
 *     parameters:
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: integer
 *         description: Filter by branch ID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *     responses:
 *       200:
 *         description: Request statistics
 *       500:
 *         description: Server error
 */
router.get("/stats", async (req, res) => {
  try {
    const filters = {
      branch_id: req.query.branch_id,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    };
    const stats = await BranchRequest.getStats(filters);
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching branch request statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve branch request statistics",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/branch-requests/{id}:
 *   get:
 *     summary: Get branch request by ID
 *     tags: [Branch Requests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch request ID
 *     responses:
 *       200:
 *         description: Branch request details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/BranchRequest'
 *       404:
 *         description: Branch request not found
 *       500:
 *         description: Server error
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const request = await BranchRequest.getById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Branch request not found",
      });
    }

    res.json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error("Error fetching branch request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve branch request",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/branch-requests/request/{requestId}:
 *   get:
 *     summary: Get branch request by request_id
 *     tags: [Branch Requests]
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Branch request ID (request_id field)
 *     responses:
 *       200:
 *         description: Branch request details
 *       404:
 *         description: Branch request not found
 *       500:
 *         description: Server error
 */
router.get("/request/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await BranchRequest.getByRequestId(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Branch request not found",
      });
    }

    res.json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error("Error fetching branch request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve branch request",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/branch-requests:
 *   post:
 *     summary: Create a new branch request
 *     tags: [Branch Requests]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - request_type
 *               - request_description
 *               - request_date
 *               - branch_id
 *               - requested_by
 *               - items
 *             properties:
 *               request_type:
 *                 type: string
 *               request_description:
 *                 type: string
 *               request_date:
 *                 type: string
 *                 format: date
 *               priority:
 *                 type: string
 *                 enum: [Low, Normal, High, Urgent]
 *               branch_id:
 *                 type: integer
 *               requested_by:
 *                 type: string
 *               source_type:
 *                 type: string
 *                 enum: [scm, production]
 *               items:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/BranchRequestItem'
 *     responses:
 *       201:
 *         description: Branch request created successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post("/", async (req, res) => {
  try {
    const { items, ...requestData } = req.body;

    // Validation
    if (
      !requestData.request_type ||
      !requestData.request_description ||
      !requestData.request_date ||
      !requestData.branch_id ||
      !requestData.requested_by
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one item is required",
      });
    }

    // Validate items
    for (const item of items) {
      if (!item.item_name || !item.item_quantity) {
        return res.status(400).json({
          success: false,
          message: "Item name and quantity are required",
        });
      }
    }

    const newRequest = await BranchRequest.create(requestData, items);

    res.status(201).json({
      success: true,
      message: "Branch request created successfully",
      data: newRequest,
    });
  } catch (error) {
    console.error("Error creating branch request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create branch request",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/branch-requests/{id}:
 *   put:
 *     summary: Update branch request
 *     tags: [Branch Requests]
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
 *               request_type:
 *                 type: string
 *               request_description:
 *                 type: string
 *               request_date:
 *                 type: string
 *                 format: date
 *               priority:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/BranchRequestItem'
 *     responses:
 *       200:
 *         description: Branch request updated successfully
 *       404:
 *         description: Branch request not found
 *       500:
 *         description: Server error
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { items, ...requestData } = req.body;

    // Check if request exists
    const existingRequest = await BranchRequest.getById(id);
    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: "Branch request not found",
      });
    }

    // Check if request can be updated (only 'Draft' status)
    if (existingRequest.status !== "Draft") {
      return res.status(400).json({
        success: false,
        message: "Can only update requests with 'Draft' status",
      });
    }

    const updatedRequest = await BranchRequest.update(id, requestData, items);
    res.json({
      success: true,
      message: "Branch request updated successfully",
      data: updatedRequest,
    });
  } catch (error) {
    console.error("Error updating branch request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update branch request",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/branch-requests/{id}/status:
 *   patch:
 *     summary: Update branch request status
 *     tags: [Branch Requests]
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
 *               - status
 *               - updated_by
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Sent, Acknowledged, In Progress, Completed, Cancelled]
 *               updated_by:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status or unauthorized action
 *       404:
 *         description: Branch request not found
 *       500:
 *         description: Server error
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, updated_by, notes } = req.body;

    if (!status || !updated_by) {
      return res.status(400).json({
        success: false,
        message: "Status and updated_by are required",
      });
    }

    // Validate status transitions
    const validStatuses = [
      "Sent",
      "Acknowledged",
      "In Progress",
      "Completed",
      "Cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    // Check if request exists
    const existingRequest = await BranchRequest.getById(id);
    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: "Branch request not found",
      });
    }

    const updatedRequest = await BranchRequest.updateStatus(
      id,
      status,
      updated_by,
      notes
    );

    res.json({
      success: true,
      message: `Request ${status.toLowerCase()} successfully`,
      data: updatedRequest,
    });
  } catch (error) {
    console.error("Error updating branch request status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update branch request status",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/branch-requests/{id}:
 *   delete:
 *     summary: Delete branch request
 *     tags: [Branch Requests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Branch request deleted successfully
 *       404:
 *         description: Branch request not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if request exists
    const existingRequest = await BranchRequest.getById(id);
    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: "Branch request not found",
      });
    }

    // Check if request can be deleted (only 'Draft' status)
    if (existingRequest.status !== "Draft") {
      return res.status(400).json({
        success: false,
        message: "Can only delete requests with 'Draft' status",
      });
    }

    const deletedRequest = await BranchRequest.delete(id);
    res.json({
      success: true,
      message: "Branch request deleted successfully",
      data: deletedRequest,
    });
  } catch (error) {
    console.error("Error deleting branch request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete branch request",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/branch-requests/status/{status}:
 *   get:
 *     summary: Get requests by status
 *     tags: [Branch Requests]
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *         description: Request status
 *     responses:
 *       200:
 *         description: List of requests with specified status
 *       500:
 *         description: Server error
 */
router.get("/status/:status", async (req, res) => {
  try {
    const { status } = req.params;
    const requests = await BranchRequest.getByStatus(status);
    res.json({
      success: true,
      data: requests,
      count: requests.length,
    });
  } catch (error) {
    console.error("Error fetching branch requests by status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve branch requests by status",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/branch-requests/branch/{branchId}:
 *   get:
 *     summary: Get branch requests by branch
 *     tags: [Branch Requests]
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by request status
 *       - in: query
 *         name: source_type
 *         schema:
 *           type: string
 *           enum: [scm, production]
 *         description: Filter by source type
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in description, request_id, or requested_by
 *     responses:
 *       200:
 *         description: List of branch requests for the branch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BranchRequest'
 *       500:
 *         description: Server error
 */
router.get("/branch/:branchId", async (req, res) => {
  try {
    const { branchId } = req.params;
    const filters = {
      status: req.query.status,
      source_type: req.query.source_type,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      search: req.query.search,
    };

    const requests = await BranchRequest.getByBranch(branchId, filters);

    res.json({
      success: true,
      data: requests,
      count: requests.length,
    });
  } catch (error) {
    console.error("Error fetching branch requests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve branch requests",
      error: error.message,
    });
  }
});

module.exports = router;
