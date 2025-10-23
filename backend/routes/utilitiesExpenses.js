const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authenticateToken, requirePermission } = require("../middleware/rbac");
const UtilitiesExpense = require("../models/UtilitiesExpense");
const CashMovement = require("../models/CashMovement");
const FinanceBalance = require("../models/FinanceBalance");
const BranchUtilitiesRemittance = require("../models/BranchUtilitiesRemittance");
const { formatForDatabase } = require("../utils/timezoneUtils");

// Configure multer for receipt uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(
      __dirname,
      "..",
      "uploads",
      "utility-receipts",
      "main-office"
    );
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// POST /api/utilities-expenses - Finance creates expense entry
router.post(
  "/",
  authenticateToken,
  (req, res, next) => {
    // Allow board members, finance department, and super admin
    if (
      req.user.role === "Super Admin" ||
      req.user.role === "Chairman of the Board" ||
      req.user.role === "Board of Directors" ||
      req.user.position === "Chairman of the Board" ||
      req.user.position === "Board of Directors" ||
      req.user.user_type === "board_member" ||
      req.user.department === "Finance" ||
      req.user.department === "Administration" ||
      req.user.permissions?.includes("Manage Finance Department")
    ) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: "Insufficient permissions",
      code: "INSUFFICIENT_PERMISSIONS",
      required_permission: "Manage Finance Department",
    });
  },
  upload.single("receipt"),
  async (req, res) => {
    try {
      const payload = req.body || {};

      if (
        !payload.entity_type ||
        !payload.entity_name ||
        !payload.expense_type ||
        !payload.amount ||
        !payload.expense_month
      ) {
        return res.status(400).json({
          success: false,
          message:
            "entity_type, entity_name, expense_type, amount, and expense_month are required",
        });
      }

      // Validate entity_type
      const validEntityTypes = ["branch", "department"];
      if (!validEntityTypes.includes(payload.entity_type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid entity_type. Must be 'branch' or 'department'",
        });
      }

      // Validate expense_type
      const validExpenseTypes = ["electricity", "water", "internet", "other"];
      if (!validExpenseTypes.includes(payload.expense_type)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid expense_type. Must be one of: " +
            validExpenseTypes.join(", "),
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

      // Validate entity-specific requirements
      if (payload.entity_type === "branch" && !payload.entity_id) {
        return res.status(400).json({
          success: false,
          message: "entity_id is required when entity_type is 'branch'",
        });
      }

      if (payload.entity_type === "department" && !payload.department) {
        return res.status(400).json({
          success: false,
          message: "department is required when entity_type is 'department'",
        });
      }

      // Handle receipt URL if file was uploaded
      let receiptUrl = null;
      if (req.file) {
        receiptUrl = req.file.path
          .replace(path.join(__dirname, "..", "uploads"), "")
          .replace(/\\/g, "/");
      }

      const data = await UtilitiesExpense.create({
        entity_type: payload.entity_type,
        entity_id: payload.entity_id || null,
        department: payload.department || null,
        entity_name: payload.entity_name,
        expense_type: payload.expense_type,
        expense_description: payload.expense_description || null,
        amount: payload.amount,
        expense_month: payload.expense_month,
        notes: payload.notes || null,
        receipt_url: receiptUrl,
        recorded_by: req.user.id,
      });

      // Create cash movement for the expense
      try {
        await CashMovement.create({
          branch_id:
            payload.entity_type === "branch" ? payload.entity_id : null,
          movement_type: "out",
          amount: parseFloat(payload.amount),
          source: "utilities_expense",
          reference_id: data.id,
          reference_type: "utilities_expense",
          notes: `Utilities expense: ${payload.expense_type}${payload.expense_description ? ` - ${payload.expense_description}` : ""} (${payload.entity_name})`,
        });
      } catch (cashMovementError) {
        console.error(
          "Failed to create cash movement for utilities expense:",
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
            Number(currentBalance.capital || 0) - Number(payload.amount || 0);
          await FinanceBalance.createOrUpdate({
            capital: newCapital,
            profit: Number(currentBalance.profit || 0),
            sales_remittances: Number(currentBalance.sales_remittances || 0),
          });
        }
      } catch (balanceError) {
        console.error(
          "Failed to update finance balance for utilities expense:",
          balanceError
        );
        // Don't fail the main operation if balance update fails
      }

      res.status(201).json({ success: true, data });
    } catch (error) {
      console.error("Create utilities expense failed:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to create utilities expense",
      });
    }
  }
);

// GET /api/utilities-expenses - List expenses (Finance view)
router.get(
  "/",
  authenticateToken,
  (req, res, next) => {
    // Debug logging
    console.log("Utilities expenses permission check:", {
      userRole: req.user?.role,
      userPermissions: req.user?.permissions,
      userId: req.user?.id,
      userEmail: req.user?.email,
    });

    // Allow board members, finance department, and super admin
    if (
      req.user.role === "Super Admin" ||
      req.user.role === "Chairman of the Board" ||
      req.user.role === "Board of Directors" ||
      req.user.position === "Chairman of the Board" ||
      req.user.position === "Board of Directors" ||
      req.user.user_type === "board_member" ||
      req.user.department === "Finance" ||
      req.user.department === "Administration" ||
      req.user.permissions?.includes("Manage Finance Department")
    ) {
      console.log("Permission granted for utilities expenses");
      return next();
    }

    console.log("Permission denied for utilities expenses");
    return res.status(403).json({
      success: false,
      message: "Insufficient permissions",
      code: "INSUFFICIENT_PERMISSIONS",
      required_permission: "Manage Finance Department",
    });
  },
  async (req, res) => {
    try {
      const {
        entity_type,
        entity_id,
        department,
        expense_type,
        expense_month,
        limit,
        offset,
      } = req.query;

      const result = await UtilitiesExpense.list({
        entity_type: entity_type || null,
        entity_id: entity_id ? parseInt(entity_id) : null,
        department: department || null,
        expense_type: expense_type || null,
        expense_month: expense_month || null,
        limit: limit ? parseInt(limit) : 20,
        offset: offset ? parseInt(offset) : 0,
      });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error("List utilities expenses failed:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to list utilities expenses",
      });
    }
  }
);

// GET /api/utilities-expenses/:id - Get single expense details
router.get(
  "/:id",
  authenticateToken,
  requirePermission("Manage Finance Department"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const expense = await UtilitiesExpense.getById(id);

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: "Utilities expense not found",
        });
      }

      res.json({ success: true, data: expense });
    } catch (error) {
      console.error("Get utilities expense failed:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get utilities expense",
      });
    }
  }
);

// PUT /api/utilities-expenses/:id - Update expense entry
router.put(
  "/:id",
  authenticateToken,
  requirePermission("Manage Finance Department"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const payload = req.body || {};

      // Check if expense exists
      const existing = await UtilitiesExpense.getById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Utilities expense not found",
        });
      }

      const updateData = {
        entity_name: payload.entity_name,
        expense_type: payload.expense_type,
        expense_description: payload.expense_description,
        amount: payload.amount,
        expense_month: payload.expense_month,
        notes: payload.notes,
      };

      const data = await UtilitiesExpense.update(id, updateData);
      res.json({ success: true, data });
    } catch (error) {
      console.error("Update utilities expense failed:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update utilities expense",
      });
    }
  }
);

// DELETE /api/utilities-expenses/:id - Soft delete expense
router.delete(
  "/:id",
  authenticateToken,
  requirePermission("Manage Finance Department"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const success = await UtilitiesExpense.softDelete(id);

      if (success) {
        res.json({
          success: true,
          message: "Utilities expense deleted successfully",
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Utilities expense not found",
        });
      }
    } catch (error) {
      console.error("Delete utilities expense failed:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete utilities expense",
      });
    }
  }
);

// GET /api/utilities-expenses/totals - Get aggregated totals
router.get(
  "/totals",
  authenticateToken,
  requirePermission("Manage Finance Department"),
  async (req, res) => {
    try {
      const { date_from, date_to, entity_type, entity_id, department } =
        req.query;

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: "date_from and date_to are required",
        });
      }

      const result = await UtilitiesExpense.getTotalsByPeriod(
        date_from,
        date_to,
        {
          entity_type: entity_type || null,
          entity_id: entity_id ? parseInt(entity_id) : null,
          department: department || null,
        }
      );

      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Get utilities expense totals failed:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to get utilities expense totals",
      });
    }
  }
);

module.exports = router;
