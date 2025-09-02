// backend/routes/budgetReleases.js
const express = require("express");
const router = express.Router();
const BudgetRelease = require("../models/BudgetRelease");
const SupplyRequest = require("../models/SupplyRequest");

/**
 * @swagger
 * components:
 *   schemas:
 *     BudgetRelease:
 *       type: object
 *       required:
 *         - supply_request_id
 *         - released_amount
 *         - released_by
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated unique identifier
 *         release_id:
 *           type: string
 *           description: Unique release identifier (e.g., BR2025001)
 *         supply_request_id:
 *           type: integer
 *           description: Reference to supply request
 *         released_amount:
 *           type: number
 *           format: decimal
 *           description: Amount released
 *         released_by:
 *           type: string
 *           description: Finance user who released budget
 *         released_at:
 *           type: string
 *           format: date-time
 *           description: Budget release timestamp
 *         release_remarks:
 *           type: string
 *           description: Remarks for budget release
 *         receipt_confirmed:
 *           type: boolean
 *           description: Whether SCM confirmed receipt
 *         receipt_confirmed_by:
 *           type: string
 *           description: SCM user who confirmed receipt
 *         receipt_confirmed_at:
 *           type: string
 *           format: date-time
 *           description: Receipt confirmation timestamp
 */

/**
 * @swagger
 * /api/budget-releases:
 *   get:
 *     summary: Get all budget releases
 *     tags: [Budget Releases]
 *     parameters:
 *       - in: query
 *         name: receiptStatus
 *         schema:
 *           type: string
 *           enum: [confirmed, pending]
 *         description: Filter by receipt confirmation status
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
 *         description: Search in description, request_id, release_id, or requested_by
 *     responses:
 *       200:
 *         description: List of budget releases
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
 *                     $ref: '#/components/schemas/BudgetRelease'
 *       500:
 *         description: Server error
 */
router.get("/", async (req, res) => {
  try {
    const filters = {
      receiptStatus: req.query.receiptStatus,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      search: req.query.search,
    };

    const releases = await BudgetRelease.getAll(filters);

    res.json({
      success: true,
      data: releases,
      count: releases.length,
    });
  } catch (error) {
    console.error("Error fetching budget releases:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve budget releases",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/budget-releases/stats:
 *   get:
 *     summary: Get budget release statistics
 *     tags: [Budget Releases]
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
 *         description: Budget release statistics
 *       500:
 *         description: Server error
 */
router.get("/stats", async (req, res) => {
  try {
    const filters = {
      department: req.query.department,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    };

    const stats = await BudgetRelease.getStats(filters);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching budget release statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve budget release statistics",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/budget-releases/pending-receipts:
 *   get:
 *     summary: Get pending receipts (for SCM)
 *     tags: [Budget Releases]
 *     parameters:
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *     responses:
 *       200:
 *         description: List of pending receipts
 *       500:
 *         description: Server error
 */
router.get("/pending-receipts", async (req, res) => {
  try {
    const department = req.query.department;
    const pendingReceipts = await BudgetRelease.getPendingReceipts(department);

    res.json({
      success: true,
      data: pendingReceipts,
      count: pendingReceipts.length,
    });
  } catch (error) {
    console.error("Error fetching pending receipts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve pending receipts",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/budget-releases/{id}:
 *   get:
 *     summary: Get budget release by ID
 *     tags: [Budget Releases]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Budget release ID
 *     responses:
 *       200:
 *         description: Budget release details
 *       404:
 *         description: Budget release not found
 *       500:
 *         description: Server error
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const release = await BudgetRelease.getById(id);

    if (!release) {
      return res.status(404).json({
        success: false,
        message: "Budget release not found",
      });
    }

    res.json({
      success: true,
      data: release,
    });
  } catch (error) {
    console.error("Error fetching budget release:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve budget release",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/budget-releases:
 *   post:
 *     summary: Create a new budget release
 *     tags: [Budget Releases]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supply_request_id
 *               - released_amount
 *               - released_by
 *             properties:
 *               supply_request_id:
 *                 type: integer
 *               released_amount:
 *                 type: number
 *                 format: decimal
 *               released_by:
 *                 type: string
 *               release_remarks:
 *                 type: string
 *     responses:
 *       201:
 *         description: Budget release created successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post("/", async (req, res) => {
  try {
    const { supply_request_id, released_amount, released_by, release_remarks } =
      req.body;

    // Validation
    if (!supply_request_id || !released_amount || !released_by) {
      return res.status(400).json({
        success: false,
        message:
          "supply_request_id, released_amount, and released_by are required",
      });
    }

    // Check if supply request exists and is approved
    const supplyRequest = await SupplyRequest.getById(supply_request_id);
    if (!supplyRequest) {
      return res.status(400).json({
        success: false,
        message: "Supply request not found",
      });
    }

    if (supplyRequest.request_status !== "Approved") {
      return res.status(400).json({
        success: false,
        message: "Can only release budget for approved requests",
      });
    }

    const releaseData = {
      supply_request_id,
      released_amount,
      released_by,
      release_remarks,
    };

    const newRelease = await BudgetRelease.create(releaseData);

    res.status(201).json({
      success: true,
      message: "Budget release created successfully",
      data: newRelease,
    });
  } catch (error) {
    console.error("Error creating budget release:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create budget release",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/budget-releases/{id}/confirm-receipt:
 *   patch:
 *     summary: Confirm receipt of budget release
 *     tags: [Budget Releases]
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
 *               - confirmed_by
 *             properties:
 *               confirmed_by:
 *                 type: string
 *     responses:
 *       200:
 *         description: Receipt confirmed successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Budget release not found
 *       500:
 *         description: Server error
 */
router.patch("/:id/confirm-receipt", async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmed_by } = req.body;

    if (!confirmed_by) {
      return res.status(400).json({
        success: false,
        message: "confirmed_by is required",
      });
    }

    // Check if budget release exists
    const existingRelease = await BudgetRelease.getById(id);
    if (!existingRelease) {
      return res.status(404).json({
        success: false,
        message: "Budget release not found",
      });
    }

    if (existingRelease.receipt_confirmed) {
      return res.status(400).json({
        success: false,
        message: "Receipt already confirmed",
      });
    }

    const updatedRelease = await BudgetRelease.confirmReceipt(id, confirmed_by);

    res.json({
      success: true,
      message: "Receipt confirmed successfully",
      data: updatedRelease,
    });
  } catch (error) {
    console.error("Error confirming receipt:", error);
    res.status(500).json({
      success: false,
      message: "Failed to confirm receipt",
      error: error.message,
    });
  }
});

module.exports = router;
