const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/rbac");
const BranchRemittance = require("../models/BranchRemittance");

// POST /api/finance/remittances - branch manager submits a remittance
router.post("/remittances", authenticateToken, async (req, res) => {
  try {
    const payload = req.body || {};

    if (
      !payload.branch_id ||
      !payload.period_type ||
      !payload.date_from ||
      !payload.date_to
    ) {
      return res.status(400).json({
        success: false,
        message: "branch_id, period_type, date_from, date_to are required",
      });
    }

    // Derive voided amount when not explicitly provided
    const gross = parseFloat(payload.gross_sales ?? 0) || 0;
    const net = parseFloat(payload.net_sales ?? 0) || 0;
    const refunds = parseFloat(payload.refunded_amount ?? 0) || 0;
    const providedVoided = payload.voided_amount;
    const voidedAmount =
      providedVoided === undefined || providedVoided === null
        ? Math.max(0, gross - refunds - net)
        : parseFloat(providedVoided) || 0;

    const data = await BranchRemittance.create({
      branch_id: payload.branch_id,
      submitted_by: req.user.id,
      period_type: payload.period_type,
      date_from: payload.date_from,
      date_to: payload.date_to,
      gross_sales: payload.gross_sales,
      net_sales: payload.net_sales,
      refunded_amount: payload.refunded_amount,
      voided_amount: voidedAmount,
      disposed: payload.disposed,
      remitted_amount: payload.remitted_amount,
      notes: payload.notes,
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error("Create remittance failed:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create remittance",
    });
  }
});

// GET /api/finance/remittances - list remittances (finance can filter)
router.get("/remittances", authenticateToken, async (req, res) => {
  try {
    const { branch_id, status, date_from, date_to, limit, offset } = req.query;
    const result = await BranchRemittance.list({
      branch_id: branch_id ? parseInt(branch_id) : null,
      status: status || null,
      date_from: date_from || null,
      date_to: date_to || null,
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("List remittances failed:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to list remittances",
    });
  }
});

// POST /api/finance/remittances/:id/approve
router.post("/remittances/:id/approve", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const row = await BranchRemittance.approve(id, req.user.id);
    res.json({ success: true, data: row });
  } catch (error) {
    console.error("Approve remittance failed:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to approve remittance",
    });
  }
});

// POST /api/finance/remittances/:id/reject
router.post("/remittances/:id/reject", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const row = await BranchRemittance.reject(
      id,
      req.user.id,
      req.body?.notes || null
    );
    res.json({ success: true, data: row });
  } catch (error) {
    console.error("Reject remittance failed:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to reject remittance",
    });
  }
});

module.exports = router;
