const express = require("express");
const router = express.Router();
const BranchDistribution = require("../models/BranchDistribution");
const { authenticateToken } = require("../middleware/rbac");

/**
 * @swagger
 * components:
 *   schemas:
 *     BranchDistribution:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         reference:
 *           type: string
 *         branch_id:
 *           type: integer
 *         branch_name:
 *           type: string
 *         prepared_by:
 *           type: string
 *         total_amount:
 *           type: number
 *         notes:
 *           type: string
 *         status:
 *           type: string
 *           enum: [delivered, completed]
 *         created_at:
 *           type: string
 *           format: date-time
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BranchDistributionItem'
 *     BranchDistributionItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         distribution_id:
 *           type: integer
 *         source:
 *           type: string
 *           enum: [scm, production]
 *         item_ref_id:
 *           type: integer
 *         name:
 *           type: string
 *         unit:
 *           type: string
 *         qty:
 *           type: number
 *         unit_price:
 *           type: number
 *         amount:
 *           type: number
 *         notes:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *     CreateBranchDistribution:
 *       type: object
 *       required:
 *         - branch_id
 *         - prepared_by
 *         - total_amount
 *         - items
 *       properties:
 *         branch_id:
 *           type: integer
 *         prepared_by:
 *           type: string
 *         total_amount:
 *           type: number
 *         notes:
 *           type: string
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - source
 *               - item_ref_id
 *               - name
 *               - unit
 *               - qty
 *               - unit_price
 *               - amount
 *             properties:
 *               source:
 *                 type: string
 *                 enum: [scm, production]
 *               item_ref_id:
 *                 type: integer
 *               name:
 *                 type: string
 *               unit:
 *                 type: string
 *               qty:
 *                 type: number
 *               unit_price:
 *                 type: number
 *               amount:
 *                 type: number
 *               notes:
 *                 type: string
 */

/**
 * @swagger
 * /api/branch-distributions:
 *   post:
 *     summary: Create a new branch distribution
 *     tags: [Branch Distributions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBranchDistribution'
 *     responses:
 *       201:
 *         description: Distribution created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/BranchDistribution'
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { branch_id, prepared_by, total_amount, notes, items } = req.body;

    // Validation
    if (
      !branch_id ||
      !prepared_by ||
      !total_amount ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: branch_id, prepared_by, total_amount, and items array",
      });
    }

    // Validate items
    for (const item of items) {
      if (
        !item.source ||
        !item.item_ref_id ||
        !item.name ||
        !item.unit ||
        item.qty === undefined ||
        item.unit_price === undefined ||
        item.amount === undefined
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Each item must have: source, item_ref_id, name, unit, qty, unit_price, amount",
        });
      }

      if (!["scm", "production"].includes(item.source)) {
        return res.status(400).json({
          success: false,
          message: 'Item source must be either "scm" or "production"',
        });
      }
    }

    const distribution = await BranchDistribution.create({
      branch_id,
      prepared_by,
      total_amount,
      notes,
      items,
    });

    res.status(201).json({
      success: true,
      message: "Branch distribution created successfully",
      data: distribution,
    });
  } catch (error) {
    console.error("Error creating branch distribution:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create branch distribution",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/branch-distributions:
 *   get:
 *     summary: Get all branch distributions with pagination
 *     tags: [Branch Distributions]
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
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: integer
 *         description: Filter by branch ID
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter
 *     responses:
 *       200:
 *         description: List of distributions
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
 *                     $ref: '#/components/schemas/BranchDistribution'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { page, limit, branch_id, start_date, end_date } = req.query;

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      startDate: start_date,
      endDate: end_date,
      branch_id: branch_id ? parseInt(branch_id) : undefined,
    };

    const result = await BranchDistribution.getAll(options);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error fetching branch distributions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch branch distributions",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/branch-distributions/{id}:
 *   get:
 *     summary: Get branch distribution by ID with items
 *     tags: [Branch Distributions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Distribution ID
 *     responses:
 *       200:
 *         description: Distribution details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/BranchDistribution'
 *       404:
 *         description: Distribution not found
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const distribution = await BranchDistribution.findByIdWithItems(
      parseInt(id)
    );

    if (!distribution) {
      return res.status(404).json({
        success: false,
        message: "Branch distribution not found",
      });
    }

    res.json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    console.error("Error fetching branch distribution:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch branch distribution",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/branch-distributions/reference/{reference}:
 *   get:
 *     summary: Get branch distribution by reference with items
 *     tags: [Branch Distributions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         description: Distribution reference
 *     responses:
 *       200:
 *         description: Distribution details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/BranchDistribution'
 *       404:
 *         description: Distribution not found
 */
router.get("/reference/:reference", authenticateToken, async (req, res) => {
  try {
    const { reference } = req.params;

    const distribution =
      await BranchDistribution.findByReferenceWithItems(reference);

    if (!distribution) {
      return res.status(404).json({
        success: false,
        message: "Branch distribution not found",
      });
    }

    res.json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    console.error("Error fetching branch distribution:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch branch distribution",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/branch-distributions/branch/{branchId}:
 *   get:
 *     summary: Get distributions for a specific branch
 *     tags: [Branch Distributions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
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
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter
 *     responses:
 *       200:
 *         description: List of distributions for the branch
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
 *                     $ref: '#/components/schemas/BranchDistribution'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get("/branch/:branchId", authenticateToken, async (req, res) => {
  try {
    const { branchId } = req.params;
    const { page, limit, start_date, end_date } = req.query;

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      startDate: start_date,
      endDate: end_date,
    };

    const result = await BranchDistribution.getByBranch(
      parseInt(branchId),
      options
    );

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error fetching branch distributions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch branch distributions",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/branch-distributions/{id}/status:
 *   patch:
 *     summary: Update status of a branch distribution (delivered -> completed)
 *     tags: [Branch Distributions]
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
 *               status:
 *                 type: string
 *                 enum: [delivered, completed]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch("/:id/status", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["delivered", "completed"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const updated = await require("../config/database")
      .db("branch_distributions")
      .where("id", id)
      .update({ status, updated_at: new Date() })
      .returning("*");

    if (!updated || updated.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Distribution not found" });
    }

    res.json({ success: true, data: updated[0] });
  } catch (error) {
    console.error("Error updating branch distribution status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update status",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/branch-distributions/{id}:
 *   delete:
 *     summary: Delete (soft delete) a branch distribution
 *     tags: [Branch Distributions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Distribution ID
 *     responses:
 *       200:
 *         description: Distribution deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Distribution not found
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const success = await BranchDistribution.delete(parseInt(id));

    if (!success) {
      return res.status(404).json({
        success: false,
        message: "Branch distribution not found",
      });
    }

    res.json({
      success: true,
      message: "Branch distribution deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting branch distribution:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete branch distribution",
      error: error.message,
    });
  }
});

module.exports = router;
