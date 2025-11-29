const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/rbac");
const BranchRemittance = require("../models/BranchRemittance");
const CashMovement = require("../models/CashMovement");
const FinanceBalance = require("../models/FinanceBalance");
const POSOrder = require("../models/POSOrder");
const NotificationService = require("../services/NotificationService");
const { formatForDatabase } = require("../utils/timezoneUtils");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

// Multer setup for CSV uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const id = String(req.params.id || "general");
    const dir = path.join(__dirname, "..", "uploads", "remittance-csv", id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safe = (file.originalname || "remittance.csv").replace(
      /[^a-zA-Z0-9_.-]/g,
      "_"
    );
    const ts = Date.now();
    cb(null, `${ts}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["text/csv", "application/vnd.ms-excel", "application/csv"];
    if (
      allowed.includes(file.mimetype) ||
      (file.originalname || "").toLowerCase().endsWith(".csv")
    ) {
      return cb(null, true);
    }
    cb(new Error("Only CSV files are allowed"));
  },
});

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
      date_from: payload.date_from
        ? formatForDatabase(new Date(payload.date_from))
        : null,
      date_to: payload.date_to
        ? formatForDatabase(new Date(payload.date_to))
        : null,
      gross_sales: payload.gross_sales,
      net_sales: payload.net_sales,
      refunded_amount: payload.refunded_amount,
      voided_amount: voidedAmount,
      disposed: payload.disposed,
      remitted_amount: payload.remitted_amount,
      notes: payload.notes,
    });

    // Link completed, unremitted POS orders to this remittance
    try {
      await POSOrder.markOrdersRemitted({
        branchId: payload.branch_id,
        remittanceId: data.id,
        dateFrom: data.date_from,
        dateTo: data.date_to,
      });
    } catch (e) {
      console.warn("Failed to mark orders as remitted:", e?.message || e);
      // Non-blocking: remittance still created; orders can be re-linked later
    }

    // Create notification for Finance department
    try {
      await NotificationService.createRemittanceNotification(data.id);
    } catch (notificationError) {
      console.error(
        "Error creating remittance notification:",
        notificationError
      );
      // Don't fail the main request if notification fails
    }

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
      date_from: date_from ? formatForDatabase(new Date(date_from)) : null,
      date_to: date_to ? formatForDatabase(new Date(date_to)) : null,
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

    // Auto-record cash movement and update finance balance when remittance is approved
    try {
      await CashMovement.recordInflowFromRemittance(row);
      await FinanceBalance.updateFromRemittance(row);
    } catch (cashError) {
      console.warn(
        "Failed to record cash movement/balance for approved remittance:",
        cashError?.message || cashError
      );
      // Non-blocking: remittance still approved; records can be added manually
    }

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

// POST /api/finance/remittances/:id/csv - upload CSV and store URL on remittance
router.post(
  "/remittances/:id/csv",
  authenticateToken,
  upload.single("file"),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const remittance = await BranchRemittance.getById(id);
      if (!remittance) {
        return res
          .status(404)
          .json({ success: false, message: "Remittance not found" });
      }

      // Build URL to file via static /uploads path
      const relPath = path
        .relative(path.join(__dirname, ".."), req.file.path)
        .replace(/\\/g, "/");
      const url = `/api/uploads-proxy/${relPath}`; // proxy route added below for CORS headers

      const updated = await BranchRemittance.updateCsvMetadata(id, {
        url,
        filename: req.file.originalname,
        size: req.file.size,
        mime: req.file.mimetype,
        uploadedAt: new Date(),
      });

      return res.json({
        success: true,
        data: {
          csvUrl: url,
          filename: updated.csv_filename,
          size: updated.csv_size,
          uploadedAt: updated.csv_uploaded_at,
        },
      });
    } catch (error) {
      console.error("Upload remittance CSV failed:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to upload CSV",
      });
    }
  }
);

// GET /api/finance/remittances/:id/csv - stream CSV for download
router.get("/remittances/:id/csv", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const remittance = await BranchRemittance.getById(id);
    if (!remittance || !remittance.csv_url) {
      return res
        .status(404)
        .json({ success: false, message: "CSV not found for this remittance" });
    }

    // Resolve file path from stored relative URL
    const rel = remittance.csv_url.replace(/^\/api\/uploads-proxy\//, "");
    const abs = path.join(__dirname, "..", rel);
    if (!fs.existsSync(abs)) {
      return res
        .status(404)
        .json({ success: false, message: "CSV file missing" });
    }
    const filename = remittance.csv_filename || `remittance-${id}.csv`;
    res.setHeader("Content-Type", remittance.csv_mime || "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    fs.createReadStream(abs).pipe(res);
  } catch (error) {
    console.error("Download remittance CSV failed:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to download CSV",
    });
  }
});

module.exports = router;
