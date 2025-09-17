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
 * /api/branch-distributions/bulk-distribute:
 *   post:
 *     summary: Create multiple branch distributions in bulk (optimized for performance)
 *     tags: [Branch Distributions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - distributions
 *             properties:
 *               distributions:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/CreateBranchDistribution'
 *     responses:
 *       201:
 *         description: Distributions created successfully
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BranchDistribution'
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post("/bulk-distribute", authenticateToken, async (req, res) => {
  try {
    const { distributions } = req.body;

    // Validation
    if (
      !distributions ||
      !Array.isArray(distributions) ||
      distributions.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Distributions array is required and must not be empty",
      });
    }

    // Validate each distribution
    for (const distributionData of distributions) {
      const { branch_id, prepared_by, total_amount, items } = distributionData;

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
            "Each distribution must have: branch_id, prepared_by, total_amount, and items array",
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
    }

    // Process all distributions in a single transaction
    const results =
      await BranchDistribution.createBulkDistributions(distributions);

    res.status(201).json({
      success: true,
      message: `${results.length} branch distributions created successfully`,
      data: results,
    });
  } catch (error) {
    console.error("Error creating bulk branch distributions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create bulk branch distributions",
      error: error.message,
    });
  }
});

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

    // Validate items (relaxed to support auto-map payloads)
    for (const item of items) {
      const src = (item.source || "scm").toString().toLowerCase();
      const qty = item.qty !== undefined ? item.qty : item.quantity;
      const unitPrice =
        item.unit_price !== undefined ? item.unit_price : item.price;
      const amount = item.amount !== undefined ? item.amount : undefined;

      if (!item.name || !item.unit || qty === undefined) {
        return res.status(400).json({
          success: false,
          message: "Each item must have: name, unit, and qty/quantity",
        });
      }

      if (!["scm", "production"].includes(src)) {
        return res.status(400).json({
          success: false,
          message: 'Item source must be either "scm" or "production"',
        });
      }

      // unit_price and amount can be derived if missing
      if (unitPrice === undefined && amount === undefined) {
        return res.status(400).json({
          success: false,
          message: "Provide unit_price/price or amount to derive totals",
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
 *     summary: Update status of a branch distribution
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
 *                 enum: [delivered, completed, rejected]
 *               completed_by:
 *                 type: string
 *               rejected_by:
 *                 type: string
 *               rejection_reason:
 *                 type: string
 *               rejection_notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch("/:id/status", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      completed_by,
      rejected_by,
      rejection_reason,
      rejection_notes,
    } = req.body;

    if (!["delivered", "completed", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const details = {};
    if (status === "completed" && completed_by) {
      details.completed_by = completed_by;
    }
    if (status === "rejected") {
      if (rejected_by) details.rejected_by = rejected_by;
      if (rejection_reason) details.rejection_reason = rejection_reason;
      if (rejection_notes) details.rejection_notes = rejection_notes;
    }

    const updated = await BranchDistribution.updateStatus(
      parseInt(id),
      status,
      details
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Distribution not found" });
    }

    res.json({ success: true, data: updated });
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
 * /api/branch-distributions/{id}/reject:
 *   post:
 *     summary: Reject a branch distribution and return quantities to main inventory
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
 *             required:
 *               - rejected_by
 *               - rejection_reason
 *             properties:
 *               rejected_by:
 *                 type: string
 *               rejection_reason:
 *                 type: string
 *               rejection_notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Distribution rejected successfully
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
 *         description: Invalid input or distribution cannot be rejected
 *       404:
 *         description: Distribution not found
 */
router.post("/:id/reject", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejected_by, rejection_reason, rejection_notes } = req.body;

    // Validation
    if (!rejected_by || !rejection_reason) {
      return res.status(400).json({
        success: false,
        message: "rejected_by and rejection_reason are required",
      });
    }

    const updated = await BranchDistribution.rejectDistribution(parseInt(id), {
      rejected_by,
      rejection_reason,
      rejection_notes: rejection_notes || null,
      performed_by_id: req.user?.id || null,
    });

    res.json({
      success: true,
      message:
        "Distribution rejected successfully and quantities returned to main inventory",
      data: updated,
    });
  } catch (error) {
    console.error("Error rejecting branch distribution:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject distribution",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/branch-distributions/{id}/complete:
 *   post:
 *     summary: Complete a branch distribution and add items to branch inventory
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
 *             required:
 *               - completed_by
 *             properties:
 *               completed_by:
 *                 type: string
 *     responses:
 *       200:
 *         description: Distribution completed successfully
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
 *         description: Invalid input or distribution cannot be completed
 *       404:
 *         description: Distribution not found
 */
router.post("/:id/complete", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { completed_by } = req.body;

    // Validation
    if (!completed_by) {
      return res.status(400).json({
        success: false,
        message: "completed_by is required",
      });
    }

    const updated = await BranchDistribution.completeDistribution(
      parseInt(id),
      {
        completed_by,
        performed_by_id: req.user?.id || null,
      }
    );

    res.json({
      success: true,
      message:
        "Distribution completed successfully and items added to branch inventory",
      data: updated,
    });
  } catch (error) {
    console.error("Error completing branch distribution:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete distribution",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/branch-distributions/{id}/acknowledge-rejection:
 *   post:
 *     summary: Acknowledge a rejected distribution
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - acknowledged_by
 *             properties:
 *               acknowledged_by:
 *                 type: string
 *                 description: User who acknowledged the rejection
 *               acknowledgment_notes:
 *                 type: string
 *                 description: Optional notes about the acknowledgment
 *     responses:
 *       200:
 *         description: Rejection acknowledged successfully
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
 *         description: Invalid input or distribution cannot be acknowledged
 *       404:
 *         description: Distribution not found
 */
router.post(
  "/:id/acknowledge-rejection",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { acknowledged_by, acknowledgment_notes } = req.body;

      // Validation
      if (!acknowledged_by) {
        return res.status(400).json({
          success: false,
          message: "acknowledged_by is required",
        });
      }

      const updated = await BranchDistribution.acknowledgeRejection(
        parseInt(id),
        {
          acknowledged_by,
          acknowledgment_notes: acknowledgment_notes || null,
        }
      );

      res.json({
        success: true,
        message: "Rejection acknowledged successfully",
        data: updated,
      });
    } catch (error) {
      console.error("Error acknowledging rejection:", error);
      res.status(500).json({
        success: false,
        message: "Failed to acknowledge rejection",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/branch-distributions/{id}/partial-accept-reject:
 *   post:
 *     summary: Partially accept/reject a distribution with item-level selection
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action_by
 *             properties:
 *               action_by:
 *                 type: string
 *                 description: User performing the action
 *               accepted_items:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of distribution item IDs to accept
 *               rejected_items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - item_id
 *                     - reason
 *                   properties:
 *                     item_id:
 *                       type: integer
 *                       description: Distribution item ID to reject
 *                     reason:
 *                       type: string
 *                       description: Reason for rejection
 *                     notes:
 *                       type: string
 *                       description: Optional additional notes
 *               notes:
 *                 type: string
 *                 description: Optional notes about the partial action
 *     responses:
 *       200:
 *         description: Distribution partially processed successfully
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
 *                   type: object
 *                   properties:
 *                     originalDistribution:
 *                       $ref: '#/components/schemas/BranchDistribution'
 *                     newDistribution:
 *                       $ref: '#/components/schemas/BranchDistribution'
 *                     rejectedItems:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Invalid input or distribution cannot be partially processed
 *       404:
 *         description: Distribution not found
 */
router.post(
  "/:id/partial-accept-reject",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { action_by, accepted_items, rejected_items, notes } = req.body;

      // Validation
      if (!action_by) {
        return res.status(400).json({
          success: false,
          message: "action_by is required",
        });
      }

      if (!accepted_items || !Array.isArray(accepted_items)) {
        return res.status(400).json({
          success: false,
          message: "accepted_items must be an array",
        });
      }

      if (!rejected_items || !Array.isArray(rejected_items)) {
        return res.status(400).json({
          success: false,
          message: "rejected_items must be an array",
        });
      }

      if (accepted_items.length === 0 && rejected_items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one item must be accepted or rejected",
        });
      }

      // Validate rejected items structure
      for (const item of rejected_items) {
        if (!item.item_id || !item.reason) {
          return res.status(400).json({
            success: false,
            message: "Each rejected item must have item_id and reason",
          });
        }
      }

      const result = await BranchDistribution.partialAcceptReject(
        parseInt(id),
        {
          action_by,
          accepted_items,
          rejected_items,
          notes: notes || null,
        }
      );

      res.json({
        success: true,
        message: "Distribution partially processed successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error partially processing distribution:", error);
      res.status(500).json({
        success: false,
        message: "Failed to partially process distribution",
        error: error.message,
      });
    }
  }
);

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
