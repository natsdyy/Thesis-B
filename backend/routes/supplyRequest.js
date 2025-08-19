// backend/routes/supplyRequests.js
const express = require("express");
const router = express.Router();
const SupplyRequest = require("../models/SupplyRequest");
const BudgetRelease = require("../models/BudgetRelease");

/**
 * @swagger
 * components:
 *   schemas:
 *     SupplyRequest:
 *       type: object
 *       required:
 *         - request_type
 *         - request_description
 *         - request_date
 *         - department
 *         - requested_by
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated unique identifier
 *         request_id:
 *           type: integer
 *           description: Unique request identifier
 *         request_type:
 *           type: string
 *           description: Type of request
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
 *         department:
 *           type: string
 *           description: Requesting department
 *         requested_by:
 *           type: string
 *           description: Person who made the request
 *         request_status:
 *           type: string
 *           enum: [To Request, Pending, Approved, Rejected, Cancelled, Budget Released, Completed]
 *           description: Current status of the request
 *         total_amount:
 *           type: number
 *           format: decimal
 *           description: Total amount of the request
 *         item_count:
 *           type: integer
 *           description: Number of items in the request
 *
 *     SupplyRequestItem:
 *       type: object
 *       required:
 *         - item_name
 *         - item_quantity
 *         - item_unit
 *         - item_type
 *         - item_unit_price
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
 *         item_unit_price:
 *           type: number
 *           format: decimal
 *           description: Price per unit
 *         item_amount:
 *           type: number
 *           format: decimal
 *           description: Total amount (quantity * unit_price)
 */

/**
 * @swagger
 * /api/supply-requests:
 *   get:
 *     summary: Get all supply requests
 *     tags: [Supply Requests]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by request status
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
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
 *         description: List of supply requests
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
 *                     $ref: '#/components/schemas/SupplyRequest'
 *       500:
 *         description: Server error
 */
router.get("/", async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      department: req.query.department,
      date: req.query.date,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      priority: req.query.priority,
      search: req.query.search,
    };

    const requests = await SupplyRequest.getAll(filters);

    res.json({
      success: true,
      data: requests,
      count: requests.length,
    });
  } catch (error) {
    console.error("Error fetching supply requests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve supply requests",
      error: error.message,
    });
  }
});

/**`
 * @swagger
 * /api/supply-requests/stats:
 *   get:
 *     summary: Get supply request statistics
 *     tags: [Supply Requests]
 *     parameters:
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
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
  console.log(">>> /api/supply-requests/stats endpoint HIT <<<");
  try {
    const filters = {
      department: req.query.department,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    };
    console.log("Filters:", filters);
    const stats = await SupplyRequest.getStats(filters);
    console.log("Stats result:", stats);
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching request statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve supply request",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/supply-requests/{id}:
 *   get:
 *     summary: Get supply request by ID
 *     tags: [Supply Requests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Supply request ID
 *     responses:
 *       200:
 *         description: Supply request details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SupplyRequest'
 *       404:
 *         description: Supply request not found
 *       500:
 *         description: Server error
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const request = await SupplyRequest.getById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Supply request not found",
      });
    }

    res.json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error("Error fetching supply request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve supply request",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/supply-requests/request/{requestId}:
 *   get:
 *     summary: Get supply request by request_id
 *     tags: [Supply Requests]
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Supply request ID (request_id field)
 *     responses:
 *       200:
 *         description: Supply request details
 *       404:
 *         description: Supply request not found
 *       500:
 *         description: Server error
 */
router.get("/request/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await SupplyRequest.getByRequestId(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Supply request not found",
      });
    }

    res.json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error("Error fetching supply request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve supply request",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/supply-requests:
 *   post:
 *     summary: Create a new supply request
 *     tags: [Supply Requests]
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
 *               - department
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
 *               department:
 *                 type: string
 *               requested_by:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/SupplyRequestItem'
 *     responses:
 *       201:
 *         description: Supply request created successfully
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
      !requestData.department ||
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
      if (
        !item.item_name ||
        !item.item_quantity ||
        !item.item_unit ||
        !item.item_type ||
        !item.item_unit_price
      ) {
        return res.status(400).json({
          success: false,
          message: "All item fields are required",
        });
      }
    }

    const newRequest = await SupplyRequest.create(requestData, items);

    res.status(201).json({
      success: true,
      message: "Supply request created successfully",
      data: newRequest,
    });
  } catch (error) {
    console.error("Error creating supply request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create supply request",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/supply-requests/{id}:
 *   put:
 *     summary: Update supply request
 *     tags: [Supply Requests]
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
 *                   $ref: '#/components/schemas/SupplyRequestItem'
 *     responses:
 *       200:
 *         description: Supply request updated successfully
 *       404:
 *         description: Supply request not found
 *       500:
 *         description: Server error
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { items, ...requestData } = req.body;
    // Check if request exists
    const existingRequest = await SupplyRequest.getById(id);
    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: "Supply request not found",
      });
    }
    // Check if request can be updated (only 'To Request' status)
    if (existingRequest.request_status !== "To Request") {
      return res.status(400).json({
        success: false,
        message: "Can only update requests with 'To Request' status",
      });
    }
    const updatedRequest = await SupplyRequest.update(id, requestData, items);
    res.json({
      success: true,
      message: "Supply request updated successfully",
      data: updatedRequest,
    });
  } catch (error) {
    console.error("Error updating supply request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update supply request",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/supply-requests/{id}/status:
 *   patch:
 *     summary: Update supply request status
 *     tags: [Supply Requests]
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
 *                 enum: [Pending, Approved, Rejected, Cancelled, Sent Back]
 *               updated_by:
 *                 type: string
 *               remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status or unauthorized action
 *       404:
 *         description: Supply request not found
 *       500:
 *         description: Server error
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, updated_by, remarks } = req.body;
    if (!status || !updated_by) {
      return res.status(400).json({
        success: false,
        message: "Status and updated_by are required",
      });
    }
    // Validate status transitions
    const validStatuses = [
      "Pending",
      "Approved",
      "Rejected",
      "Cancelled",
      "Sent Back",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }
    // Check if request exists
    const existingRequest = await SupplyRequest.getById(id);
    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: "Supply request not found",
      });
    }
    const updatedRequest = await SupplyRequest.updateStatus(
      id,
      status,
      updated_by,
      remarks
    );
    res.json({
      success: true,
      message: `Request ${status.toLowerCase()} successfully`,
      data: updatedRequest,
    });
  } catch (error) {
    console.error("Error updating request status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update request status",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/supply-requests/{id}:
 *   delete:
 *     summary: Delete supply request
 *     tags: [Supply Requests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Supply request deleted successfully
 *       404:
 *         description: Supply request not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    // Check if request exists
    const existingRequest = await SupplyRequest.getById(id);
    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        message: "Supply request not found",
      });
    }
    // Check if request can be deleted (only 'To Request' status)
    if (existingRequest.request_status !== "To Request") {
      return res.status(400).json({
        success: false,
        message: "Can only delete requests with 'To Request' status",
      });
    }
    const deletedRequest = await SupplyRequest.delete(id);
    res.json({
      success: true,
      message: "Supply request deleted successfully",
      data: deletedRequest,
    });
  } catch (error) {
    console.error("Error deleting supply request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete supply request",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/supply-requests/status/{status}:
 *   get:
 *     summary: Get requests by status
 *     tags: [Supply Requests]
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
    const requests = await SupplyRequest.getByStatus(status);
    res.json({
      success: true,
      data: requests,
      count: requests.length,
    });
  } catch (error) {
    console.error("Error fetching requests by status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve requests by status",
      error: error.message,
    });
  }
});

module.exports = router;
