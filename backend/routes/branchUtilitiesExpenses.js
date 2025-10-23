const express = require("express");
const router = express.Router();
const { authenticateToken, requirePermission } = require("../middleware/rbac");
const BranchUtilitiesRemittance = require("../models/BranchUtilitiesRemittance");
const UtilitiesExpense = require("../models/UtilitiesExpense");
const CashMovement = require("../models/CashMovement");
const NotificationService = require("../services/NotificationService");
const FinanceBalance = require("../models/FinanceBalance");
const { formatForDatabase } = require("../utils/timezoneUtils");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

// Multer setup for receipt uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const branchId = String(req.body.branch_id || "general");
    const dir = path.join(
      __dirname,
      "..",
      "uploads",
      "utility-receipts",
      branchId
    );
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safe = (file.originalname || "receipt.jpg").replace(
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
    const allowed = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (allowed.includes(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error("Only image files (JPG, PNG) and PDF files are allowed"));
  },
});

// POST /api/branch-utilities-expenses - Branch submits new expense with receipt
router.post(
  "/",
  authenticateToken,
  upload.single("receipt"),
  async (req, res) => {
    try {
      const payload = req.body || {};

      if (
        !payload.branch_id ||
        !payload.expense_type ||
        !payload.amount ||
        !payload.expense_month ||
        !req.file
      ) {
        return res.status(400).json({
          success: false,
          message:
            "branch_id, expense_type, amount, expense_month, and receipt are required",
        });
      }

      // Validate expense type
      const validTypes = ["electricity", "water", "internet", "other"];
      if (!validTypes.includes(payload.expense_type)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid expense_type. Must be one of: " + validTypes.join(", "),
        });
      }

      // If expense_type is 'other', require description
      if (payload.expense_type === "other" && !payload.expense_description) {
        return res.status(400).json({
          success: false,
          message:
            "expense_description is required when expense_type is 'other'",
        });
      }

      const data = await BranchUtilitiesRemittance.create({
        branch_id: payload.branch_id,
        expense_type: payload.expense_type,
        expense_description: payload.expense_description || null,
        amount: payload.amount,
        expense_month: payload.expense_month,
        receipt_url: req.file.path
          .replace(path.join(__dirname, "..", "uploads"), "")
          .replace(/\\/g, "/"),
        notes: payload.notes || null,
        submitted_by: req.user.id,
      });

      console.log("Utilities remittance created successfully:", data.id);

      // Create notification for Finance
      try {
        await NotificationService.createUtilityExpenseNotification(data.id);
        console.log("Utilities expense notification created successfully");
      } catch (notificationError) {
        console.error(
          "Error creating utilities expense notification:",
          notificationError
        );
        // Don't fail the main request if notification fails
      }

      console.log("About to send response for utilities remittance:", data.id);
      res.status(201).json({ success: true, data });
    } catch (error) {
      console.error("Create utilities remittance failed:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create utilities remittance",
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
);

// GET /api/branch-utilities-expenses - List remittances (filter by branch/month/status)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { branch_id, expense_type, expense_month, status, limit, offset } =
      req.query;

    const result = await BranchUtilitiesRemittance.list({
      branch_id: branch_id ? parseInt(branch_id) : null,
      expense_type: expense_type || null,
      expense_month: expense_month || null,
      status: status || null,
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error("List utilities remittances failed:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to list utilities remittances",
    });
  }
});

// GET /api/branch-utilities-expenses/:id - Get single remittance details
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const remittance = await BranchUtilitiesRemittance.getById(id);

    if (!remittance) {
      return res.status(404).json({
        success: false,
        message: "Utilities remittance not found",
      });
    }

    res.json({ success: true, data: remittance });
  } catch (error) {
    console.error("Get utilities remittance failed:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get utilities remittance",
    });
  }
});

// PUT /api/branch-utilities-expenses/:id - Update pending remittance
router.put(
  "/:id",
  authenticateToken,
  upload.single("receipt"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body || {};

      // Check if remittance exists and is pending
      const existing = await BranchUtilitiesRemittance.getById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Utilities remittance not found",
        });
      }

      if (existing.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Cannot update non-pending remittance",
        });
      }

      // Check if user is the submitter or has permission
      if (
        existing.submitted_by !== req.user.id &&
        req.user.role !== "Super Admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this remittance",
        });
      }

      const updateData = {
        expense_type: payload.expense_type,
        expense_description: payload.expense_description,
        amount: payload.amount,
        expense_month: payload.expense_month,
        notes: payload.notes,
      };

      // If new receipt uploaded, update receipt_url
      if (req.file) {
        updateData.receipt_url = req.file.path
          .replace(path.join(__dirname, "..", "uploads"), "")
          .replace(/\\/g, "/");
      }

      const data = await BranchUtilitiesRemittance.update(id, updateData);
      res.json({ success: true, data });
    } catch (error) {
      console.error("Update utilities remittance failed:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update utilities remittance",
      });
    }
  }
);

// DELETE /api/branch-utilities-expenses/:id - Soft delete pending remittance
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if remittance exists and is pending
    const existing = await BranchUtilitiesRemittance.getById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Utilities remittance not found",
      });
    }

    if (existing.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete non-pending remittance",
      });
    }

    // Check if user is the submitter or has permission
    if (
      existing.submitted_by !== req.user.id &&
      req.user.role !== "Super Admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this remittance",
      });
    }

    const success = await BranchUtilitiesRemittance.softDelete(id);

    if (success) {
      res.json({
        success: true,
        message: "Utilities remittance deleted successfully",
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Failed to delete utilities remittance",
      });
    }
  } catch (error) {
    console.error("Delete utilities remittance failed:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete utilities remittance",
    });
  }
});

// POST /api/branch-utilities-expenses/:id/approve - Finance approves remittance
router.post(
  "/:id/approve",
  authenticateToken,
  requirePermission("Manage Finance Department"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const data = await BranchUtilitiesRemittance.approve(id, req.user.id);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Utilities remittance not found or not pending",
        });
      }

      // Create cash movement for the approved utilities expense
      try {
        await CashMovement.create({
          branch_id: data.branch_id,
          movement_type: "out",
          amount: parseFloat(data.amount),
          source: "utilities_expense",
          reference_id: data.id,
          reference_type: "branch_utilities_remittance",
          notes: `Branch utilities expense: ${data.expense_type}${data.expense_description ? ` - ${data.expense_description}` : ""} (${data.expense_month})`,
        });
      } catch (cashMovementError) {
        console.error(
          "Failed to create cash movement for approved utilities remittance:",
          cashMovementError
        );
        // Don't fail the main operation if cash movement creation fails
      }

      // Update finance balance to reflect the expense
      try {
        const currentBalance = await FinanceBalance.getLatestBalance();
        if (currentBalance) {
          // Deduct the expense amount from capital
          const newCapital =
            Number(currentBalance.capital || 0) - Number(data.amount || 0);
          await FinanceBalance.createOrUpdate({
            capital: newCapital,
            profit: Number(currentBalance.profit || 0),
            sales_remittances: Number(currentBalance.sales_remittances || 0),
          });
        }
      } catch (balanceError) {
        console.error(
          "Failed to update finance balance for approved utilities remittance:",
          balanceError
        );
        // Don't fail the main operation if balance update fails
      }

      // Create notification for branch
      try {
        await NotificationService.createUtilityExpenseApprovalNotification(
          id,
          "approved"
        );
      } catch (notificationError) {
        console.error(
          "Error creating utilities expense approval notification:",
          notificationError
        );
        // Don't fail the main request if notification fails
      }

      res.json({
        success: true,
        data,
        message: "Utilities remittance approved successfully",
      });
    } catch (error) {
      console.error("Approve utilities remittance failed:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to approve utilities remittance",
      });
    }
  }
);

// POST /api/branch-utilities-expenses/:id/reject - Finance rejects remittance
router.post(
  "/:id/reject",
  authenticateToken,
  requirePermission("Manage Finance Department"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || reason.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required",
        });
      }

      const data = await BranchUtilitiesRemittance.reject(
        id,
        req.user.id,
        reason
      );

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Utilities remittance not found or not pending",
        });
      }

      // Create notification for branch
      try {
        await NotificationService.createUtilityExpenseApprovalNotification(
          id,
          "rejected"
        );
      } catch (notificationError) {
        console.error(
          "Error creating utilities expense rejection notification:",
          notificationError
        );
        // Don't fail the main request if notification fails
      }

      res.json({
        success: true,
        data,
        message: "Utilities remittance rejected successfully",
      });
    } catch (error) {
      console.error("Reject utilities remittance failed:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to reject utilities remittance",
      });
    }
  }
);

module.exports = router;
