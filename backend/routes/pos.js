const express = require("express");
const router = express.Router();
const POSModel = require("../models/POS");
const { authenticateToken } = require("../middleware/rbac");

// GET /api/pos/menu-items
router.get("/menu-items", authenticateToken, async (req, res) => {
  try {
    const filters = {
      branch_id: req.query.branch_id ? parseInt(req.query.branch_id) : null,
      menu_id: req.query.menu_id ? parseInt(req.query.menu_id) : null,
      item_codes: req.query.item_codes
        ? String(req.query.item_codes)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      is_available:
        req.query.is_available === undefined
          ? true
          : req.query.is_available === "true",
      search: req.query.search || null,
      category: req.query.category || null,
      limit: req.query.limit ? parseInt(req.query.limit) : 24,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
    };

    const { rows, total } = await POSModel.getMenuItemsForPOS(filters);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
      },
    });
  } catch (error) {
    console.error("Error in POS menu-items:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch POS items",
    });
  }
});

module.exports = router;
