const express = require("express");
const router = express.Router();
const BranchPosition = require("../models/BranchPosition");
const { authenticateToken } = require("../middleware/rbac");

/**
 * @swagger
 * /api/branch-positions:
 *   get:
 *     summary: Get all branch positions
 *     tags: [Branch Positions]
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in position title, code, or branch name
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Branch positions retrieved successfully
 */
/**
 * @swagger
 * /api/branch-positions/public:
 *   get:
 *     summary: Get all open branch positions for public job listings
 *     tags: [Branch Positions]
 *     description: Public endpoint that returns only open and active positions from branch_positions table
 *     parameters:
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *     responses:
 *       200:
 *         description: Open positions retrieved successfully
 */
router.get("/public", async (req, res) => {
  try {
    const filters = {
      job_status: 'open',
      is_active: true,
      department: req.query.department
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const positions = await BranchPosition.getAll(filters);

    res.json({
      success: true,
      data: positions,
      count: positions.length
    });
  } catch (error) {
    console.error("Error fetching public branch positions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching public branch positions",
      error: error.message
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const filters = {
      branch_id: req.query.branch_id,
      department: req.query.department,
      status: req.query.status,
      job_status: req.query.job_status,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      search: req.query.search
    };

    // Only apply pagination if explicitly requested
    if (req.query.page !== undefined || req.query.limit !== undefined) {
      filters.page = parseInt(req.query.page) || 1;
      filters.limit = parseInt(req.query.limit) || 10;
    }

    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const positions = await BranchPosition.getAll(filters);

    res.json({
      success: true,
      data: positions,
      count: positions.length
    });
  } catch (error) {
    console.error("Error fetching branch positions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching branch positions",
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/branch-positions/{id}:
 *   get:
 *     summary: Get branch position by ID
 *     tags: [Branch Positions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Position ID
 *     responses:
 *       200:
 *         description: Branch position retrieved successfully
 *       404:
 *         description: Position not found
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const position = await BranchPosition.getById(id);

    if (!position) {
      return res.status(404).json({
        success: false,
        message: "Position not found"
      });
    }

    res.json({
      success: true,
      data: position
    });
  } catch (error) {
    console.error("Error fetching branch position:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching branch position",
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/branch-positions/branch/{branchId}:
 *   get:
 *     summary: Get positions by branch ID
 *     tags: [Branch Positions]
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include inactive positions
 *     responses:
 *       200:
 *         description: Branch positions retrieved successfully
 */
router.get("/branch/:branchId", async (req, res) => {
  try {
    const { branchId } = req.params;
    const includeInactive = req.query.includeInactive === "true";

    const positions = await BranchPosition.getByBranchId(branchId, includeInactive);

    res.json({
      success: true,
      data: positions,
      count: positions.length
    });
  } catch (error) {
    console.error("Error fetching branch positions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching branch positions",
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/branch-positions/department/{department}:
 *   get:
 *     summary: Get positions by department
 *     tags: [Branch Positions]
 *     parameters:
 *       - in: path
 *         name: department
 *         required: true
 *         schema:
 *           type: string
 *         description: Department name
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include inactive positions
 *     responses:
 *       200:
 *         description: Department positions retrieved successfully
 */
router.get("/department/:department", async (req, res) => {
  try {
    const { department } = req.params;
    const includeInactive = req.query.includeInactive === "true";

    const positions = await BranchPosition.getByDepartment(department, includeInactive);

    res.json({
      success: true,
      data: positions,
      count: positions.length
    });
  } catch (error) {
    console.error("Error fetching department positions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching department positions",
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/branch-positions/available:
 *   get:
 *     summary: Get available positions (open slots)
 *     tags: [Branch Positions]
 *     responses:
 *       200:
 *         description: Available positions retrieved successfully
 */
router.get("/available", async (req, res) => {
  try {
    const positions = await BranchPosition.getAvailablePositions();

    res.json({
      success: true,
      data: positions,
      count: positions.length
    });
  } catch (error) {
    console.error("Error fetching available positions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching available positions",
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/branch-positions/stats:
 *   get:
 *     summary: Get branch position statistics
 *     tags: [Branch Positions]
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get("/stats", async (req, res) => {
  try {
    const stats = await BranchPosition.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error fetching position stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching position statistics",
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/branch-positions:
 *   post:
 *     summary: Create new branch position
 *     tags: [Branch Positions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - branch_id
 *               - position_title
 *               - position_code
 *               - rate_per_hour
 *               - department
 *             properties:
 *               branch_id:
 *                 type: integer
 *               position_title:
 *                 type: string
 *               position_code:
 *                 type: string
 *               description:
 *                 type: string
 *               requirements:
 *                 type: string
 *               rate_per_hour:
 *                 type: number
 *               hours_per_month:
 *                 type: integer
 *               department:
 *                 type: string
 *               position_type:
 *                 type: string
 *               total_slots:
 *                 type: integer
 *               filled_slots:
 *                 type: integer
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: Position created successfully
 *       400:
 *         description: Validation error
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const positionData = req.body;
    const createdBy = req.user?.id || null;

    // Validate required fields (allow branch_id to be null for main branch)
    const requiredFields = ["position_title", "position_code", "rate_per_hour", "department"];
    for (const field of requiredFields) {
      if (positionData[field] === undefined || positionData[field] === null || positionData[field] === '') {
        return res.status(400).json({
          success: false,
          message: `${field} is required`
        });
      }
    }
    
    // Validate branch_id (can be null for main branch, but must be valid number if provided)
    if (positionData.branch_id !== null && positionData.branch_id !== undefined && positionData.branch_id !== '') {
      if (isNaN(parseInt(positionData.branch_id))) {
        return res.status(400).json({
          success: false,
          message: `branch_id must be a valid number or null for main branch`
        });
      }
      positionData.branch_id = parseInt(positionData.branch_id);
    } else {
      // Set to null explicitly for main branch positions
      positionData.branch_id = null;
    }

    const newPosition = await BranchPosition.create(positionData, createdBy);

    res.status(201).json({
      success: true,
      data: newPosition,
      message: "Position created successfully"
    });
  } catch (error) {
    console.error("Error creating branch position:", error);
    
    if (error.message.includes("already exists")) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating branch position",
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/branch-positions/{id}:
 *   put:
 *     summary: Update branch position
 *     tags: [Branch Positions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Position ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               position_title:
 *                 type: string
 *               position_code:
 *                 type: string
 *               description:
 *                 type: string
 *               requirements:
 *                 type: string
 *               rate_per_hour:
 *                 type: number
 *               hours_per_month:
 *                 type: integer
 *               department:
 *                 type: string
 *               position_type:
 *                 type: string
 *               total_slots:
 *                 type: integer
 *               filled_slots:
 *                 type: integer
 *               status:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Position updated successfully
 *       404:
 *         description: Position not found
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updatedBy = req.user?.id || null;


    const updatedPosition = await BranchPosition.update(id, updateData, updatedBy);


    res.json({
      success: true,
      data: updatedPosition,
      message: "Position updated successfully"
    });
  } catch (error) {
    console.error("Error updating branch position:", error);
    
    if (error.message === "Position not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes("already exists")) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating branch position",
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/branch-positions/{id}/slots:
 *   patch:
 *     summary: Update position slots
 *     tags: [Branch Positions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Position ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - total_slots
 *               - filled_slots
 *             properties:
 *               total_slots:
 *                 type: integer
 *               filled_slots:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Slots updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Position not found
 */
router.patch("/:id/slots", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { total_slots, filled_slots } = req.body;

    if (total_slots === undefined || filled_slots === undefined) {
      return res.status(400).json({
        success: false,
        message: "total_slots and filled_slots are required"
      });
    }

    const updatedPosition = await BranchPosition.updateSlots(id, total_slots, filled_slots);

    res.json({
      success: true,
      data: updatedPosition,
      message: "Slots updated successfully"
    });
  } catch (error) {
    console.error("Error updating position slots:", error);
    
    if (error.message === "Position not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes("cannot exceed")) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating position slots",
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/branch-positions/{id}:
 *   delete:
 *     summary: Delete branch position
 *     tags: [Branch Positions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Position ID
 *     responses:
 *       200:
 *         description: Position deleted successfully
 *       404:
 *         description: Position not found
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user?.id || null;

    const deletedPosition = await BranchPosition.delete(id, deletedBy);

    res.json({
      success: true,
      data: deletedPosition,
      message: "Position deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting branch position:", error);
    
    if (error.message === "Position not found") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: "Error deleting branch position",
      error: error.message
    });
  }
});

module.exports = router;

