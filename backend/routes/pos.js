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
    };

    const items = await POSModel.getMenuItemsForPOS(filters);

    res.json({ success: true, data: items });
  } catch (error) {
    console.error("Error in POS menu-items:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch POS items",
    });
  }
});

module.exports = router;
