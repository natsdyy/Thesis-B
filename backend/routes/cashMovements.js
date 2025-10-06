const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/rbac");
const CashMovement = require("../models/CashMovement");

// GET /api/cash-movements - list cash movements with filters
router.get("/", authenticateToken, async (req, res) => {
  try {
    const {
      branch_id,
      movement_type,
      date_from,
      date_to,
      limit = 20,
      offset = 0,
      include_non_branch, // Optional: include movements without branch_id (HQ/SCM)
    } = req.query;

    const filters = {
      branch_id: branch_id ? parseInt(branch_id) : null,
      movement_type: movement_type || null,
      date_from: date_from || null,
      date_to: date_to || null,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include_non_branch: include_non_branch === "true",
    };

    const result = await CashMovement.list(filters);

    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        limit: filters.limit,
        offset: filters.offset,
        pages: Math.ceil(result.total / filters.limit),
      },
    });
  } catch (error) {
    console.error("Error fetching cash movements:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cash movements",
      error: error.message,
    });
  }
});

// POST /api/cash-movements - create a new cash movement
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      branch_id,
      movement_type,
      amount,
      source,
      reference_id,
      reference_type,
      notes,
      occurred_at,
    } = req.body;

    // Validate required fields (branch_id is optional for HQ/SCM movements)
    if (!movement_type || amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        message: "movement_type and amount are required",
      });
    }

    if (!["in", "out"].includes(movement_type)) {
      return res.status(400).json({
        success: false,
        message: 'movement_type must be "in" or "out"',
      });
    }

    const data = await CashMovement.create({
      branch_id: branch_id ? parseInt(branch_id) : null,
      movement_type,
      amount: parseFloat(amount),
      source: source || null,
      reference_id: reference_id || null,
      reference_type: reference_type || null,
      notes: notes || null,
      occurred_at: occurred_at || null,
    });

    res.status(201).json({
      success: true,
      data,
      message: "Cash movement created successfully",
    });
  } catch (error) {
    console.error("Error creating cash movement:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create cash movement",
      error: error.message,
    });
  }
});

// GET /api/cash-movements/summary - get summary by branch
router.get("/summary", authenticateToken, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;

    const result = await CashMovement.summarizeByBranch({
      date_from: date_from || null,
      date_to: date_to || null,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching cash movement summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cash movement summary",
      error: error.message,
    });
  }
});

module.exports = router;
