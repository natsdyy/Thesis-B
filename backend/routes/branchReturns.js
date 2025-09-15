const express = require("express");
const router = express.Router();
const BranchReturn = require("../models/BranchReturn");
const { authenticateToken, requirePermission } = require("../middleware/rbac");

// Create a branch return request
router.post(
  "/",
  authenticateToken,
  requirePermission("Manage Inventory"),
  async (req, res) => {
    try {
      const { branch_id, return_type, items, notes } = req.body;
      const created_by = req.user?.id || null;
      const created = await BranchReturn.createReturn({
        branch_id,
        return_type,
        items,
        notes,
        created_by,
      });
      res.status(201).json({
        success: true,
        message: "Branch return created",
        data: created,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create return",
      });
    }
  }
);

// List branch returns
router.get(
  "/",
  authenticateToken,
  requirePermission("Manage Inventory"),
  async (req, res) => {
    try {
      const { branch_id, status, return_type, page, limit } = req.query;
      const result = await BranchReturn.list({
        branch_id,
        status,
        return_type,
        page,
        limit,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch returns",
      });
    }
  }
);

// Get single branch return
router.get(
  "/:id",
  authenticateToken,
  requirePermission("Manage Inventory"),
  async (req, res) => {
    try {
      const data = await BranchReturn.getById(req.params.id);
      if (!data)
        return res
          .status(404)
          .json({ success: false, message: "Return not found" });
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch return",
      });
    }
  }
);

// Approve branch return (credit main inventory and decrement branch)
router.post(
  "/:id/approve",
  authenticateToken,
  requirePermission("Manage Inventory"),
  async (req, res) => {
    try {
      const approved_by = req.user?.id || null;
      const approved = await BranchReturn.approve(req.params.id, approved_by);
      res.json({ success: true, message: "Return approved", data: approved });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to approve return",
      });
    }
  }
);

// Reject branch return (no inventory changes)
router.post(
  "/:id/reject",
  authenticateToken,
  requirePermission("Manage Inventory"),
  async (req, res) => {
    try {
      const rejected_by = req.user?.id || null;
      const { reason } = req.body || {};
      const rejected = await BranchReturn.reject(
        req.params.id,
        rejected_by,
        reason || null
      );
      if (!rejected)
        return res
          .status(404)
          .json({ success: false, message: "Return not found or not pending" });
      res.json({ success: true, message: "Return rejected", data: rejected });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to reject return",
      });
    }
  }
);

// Acknowledge branch return (branch confirms receipt of approval)
router.post("/:id/acknowledge", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { notes } = req.body || {};
    const updated = await BranchReturn.acknowledge(
      req.params.id,
      userId,
      notes || null
    );
    res.json({ success: true, message: "Return acknowledged", data: updated });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to acknowledge return",
    });
  }
});

module.exports = router;
