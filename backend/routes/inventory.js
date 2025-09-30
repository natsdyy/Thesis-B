const express = require("express");
const router = express.Router();
const Inventory = require("../models/Inventory");
const { db } = require("../config/database");
const {
  getCurrentPhilippineTime,
  getCurrentPhilippineDate,
} = require("../utils/timezoneUtils");

// Get all inventory categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await Inventory.getCategories();
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch categories",
    });
  }
});

// Get inventory statistics
router.get("/stats", async (req, res) => {
  try {
    const stats = await Inventory.getInventoryStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching inventory stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch inventory stats",
    });
  }
});

// Get draft item types (pending approval)
router.get("/item-types/draft", async (req, res) => {
  try {
    const draftItems = await Inventory.getDraftItemTypes();
    res.json({
      success: true,
      data: draftItems,
    });
  } catch (error) {
    console.error("Error fetching draft item types:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch draft item types",
    });
  }
});

// Approve item type
router.patch("/item-types/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { approved_by, notes } = req.body;

    if (!approved_by) {
      return res.status(400).json({
        success: false,
        message: "approved_by is required",
      });
    }

    const approvedItem = await Inventory.approveItemType(
      id,
      approved_by,
      notes
    );
    res.json({
      success: true,
      data: approvedItem,
      message: "Item type approved successfully",
    });
  } catch (error) {
    console.error("Error approving item type:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to approve item type",
    });
  }
});

// Reject item type
router.patch("/item-types/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { rejected_by, notes } = req.body;

    if (!rejected_by) {
      return res.status(400).json({
        success: false,
        message: "rejected_by is required",
      });
    }

    const rejectedItem = await Inventory.rejectItemType(id, rejected_by, notes);
    res.json({
      success: true,
      data: rejectedItem,
      message: "Item type rejected successfully",
    });
  } catch (error) {
    console.error("Error rejecting item type:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to reject item type",
    });
  }
});

// Get item types by category
router.get("/categories/:categoryId/item-types", async (req, res) => {
  try {
    const { categoryId } = req.params;
    const itemTypes = await Inventory.getItemTypesByCategory(categoryId);
    res.json({
      success: true,
      data: itemTypes,
    });
  } catch (error) {
    console.error("Error fetching item types:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch item types",
    });
  }
});

// Get all item types with category info
router.get("/item-types", async (req, res) => {
  try {
    const itemTypes = await Inventory.getAllItemTypes();
    res.json({
      success: true,
      data: itemTypes,
    });
  } catch (error) {
    console.error("Error fetching all item types:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch item types",
    });
  }
});

// Get current inventory with optional filters
router.get("/current", async (req, res) => {
  try {
    const filters = {
      category_id: req.query.category_id,
      item_type_id: req.query.item_type_id,
      supplier_id: req.query.supplier_id,
      expiry_within_days: req.query.expiry_within_days,
    };

    // Remove undefined filters
    Object.keys(filters).forEach((key) => {
      if (filters[key] === undefined || filters[key] === "") {
        delete filters[key];
      }
    });

    const inventory = await Inventory.getCurrentInventory(filters);
    res.json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    console.error("Error fetching current inventory:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch current inventory",
    });
  }
});

// Get inventory summary by category
router.get("/summary", async (req, res) => {
  try {
    const summary = await Inventory.getInventorySummary();
    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching inventory summary:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch inventory summary",
    });
  }
});

// Add inventory item (manual entry or from PO)
router.post("/items", async (req, res) => {
  try {
    const itemData = {
      item_type_id: req.body.item_type_id,
      item_name: req.body.item_name || null, // Add this line
      supplier_id: req.body.supplier_id || null,
      purchase_order_id: req.body.purchase_order_id || null,
      unit_of_measure: req.body.unit_of_measure || null,
      batch_number: req.body.batch_number || null,
      quantity: parseFloat(req.body.quantity),
      unit_cost: parseFloat(req.body.unit_cost),
      expiry_date: req.body.expiry_date || null,
      received_date: req.body.received_date || getCurrentPhilippineTime(),
      notes: req.body.notes || null,
      received_by: req.body.received_by || "System",
      reference_number: req.body.reference_number || null,
    };

    // Validation
    if (!itemData.item_type_id || !itemData.quantity || !itemData.unit_cost) {
      return res.status(400).json({
        success: false,
        message: "Item type, quantity, and unit cost are required",
      });
    }

    const newItem = await Inventory.addInventoryItem(itemData);
    res.status(201).json({
      success: true,
      data: newItem,
      message: "Inventory item added successfully",
    });
  } catch (error) {
    console.error("Error adding inventory item:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to add inventory item",
    });
  }
});

// Get specific inventory item
router.get("/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Inventory.getInventoryItemById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch inventory item",
    });
  }
});

// Update inventory quantity (consumption, adjustment, etc.)
router.patch("/items/:id/quantity", async (req, res) => {
  try {
    const { id } = req.params;
    const transactionData = {
      transaction_type: req.body.transaction_type, // 'consumption', 'adjustment', etc.
      quantity: parseFloat(req.body.quantity),
      reference_number: req.body.reference_number || null,
      reason: req.body.reason || null,
      notes: req.body.notes || null,
      performed_by: req.body.performed_by || "System",
      transaction_date: req.body.transaction_date || getCurrentPhilippineTime(),
    };

    // Validation
    if (!transactionData.transaction_type || !transactionData.quantity) {
      return res.status(400).json({
        success: false,
        message: "Transaction type and quantity are required",
      });
    }

    const updatedItem = await Inventory.updateInventoryQuantity(
      id,
      transactionData
    );
    res.json({
      success: true,
      data: updatedItem,
      message: "Inventory quantity updated successfully",
    });
  } catch (error) {
    console.error("Error updating inventory quantity:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update inventory quantity",
    });
  }
});

// Get transaction history for an item
router.get("/items/:id/transactions", async (req, res) => {
  try {
    const { id } = req.params;
    const transactions = await Inventory.getTransactionHistory(id);
    res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch transaction history",
    });
  }
});

// Get recent activity
router.get("/recent-activity", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const recentActivity = await Inventory.getRecentActivity(limit);

    res.json({
      success: true,
      data: recentActivity,
    });
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch recent activity",
    });
  }
});

// Get all transactions with filters and pagination
router.get("/transactions", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const filters = {
      search: req.query.search || "",
      transaction_type: req.query.transaction_type || "",
      date_from: req.query.date_from || "",
      date_to: req.query.date_to || "",
      category_id: req.query.category_id || "",
      item_type_id: req.query.item_type_id || "",
    };

    const result = await Inventory.getAllTransactions(filters, limit, offset);

    res.json({
      success: true,
      data: result.transactions,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch transactions",
    });
  }
});

// Get expiring items
router.get("/alerts/expiring", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const expiringItems = await Inventory.getExpiringItems(days);
    res.json({
      success: true,
      data: expiringItems,
    });
  } catch (error) {
    console.error("Error fetching expiring items:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch expiring items",
    });
  }
});

// Get low stock items
router.get("/alerts/low-stock", async (req, res) => {
  try {
    const lowStockItems = await Inventory.getLowStockItems();
    res.json({
      success: true,
      data: lowStockItems,
    });
  } catch (error) {
    console.error("Error fetching low stock items:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch low stock items",
    });
  }
});

// Per-batch low stock alerts (excludes Equipment)
router.get("/alerts/low-stock-batches", async (req, res) => {
  try {
    const lowStockBatches = await Inventory.getLowStockItemsPerBatch();
    res.json({ success: true, data: lowStockBatches });
  } catch (error) {
    console.error("Error fetching per-batch low stock alerts:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch low stock batches" });
  }
});

// Get disposed items
router.get("/disposed", async (req, res) => {
  try {
    const filters = {
      category_id: req.query.category_id || "",
      item_type_id: req.query.item_type_id || "",
      disposed_from: req.query.disposed_from || "",
      disposed_to: req.query.disposed_to || "",
    };

    const disposedItems = await Inventory.getDisposedItems(filters);
    res.json({
      success: true,
      data: disposedItems,
    });
  } catch (error) {
    console.error("Error fetching disposed items:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch disposed items",
    });
  }
});

// Single item consumption
router.post("/consumption/single", async (req, res) => {
  try {
    const {
      inventory_item_id,
      quantity,
      reason,
      reference_number,
      notes,
      performed_by,
    } = req.body;

    // Validation
    if (!inventory_item_id || !quantity || !reason) {
      return res.status(400).json({
        success: false,
        message: "Inventory item ID, quantity, and reason are required",
      });
    }

    // Block consuming expired items
    const item = await Inventory.getInventoryItemById(inventory_item_id);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Inventory item not found" });
    }
    if (item.status === "expired") {
      return res.status(400).json({
        success: false,
        message: "Cannot consume an expired item",
      });
    }

    // Auto-block if expiry_date is today or earlier
    if (item.expiry_date) {
      const today = getCurrentPhilippineTime();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(item.expiry_date);
      expiry.setHours(0, 0, 0, 0);
      if (expiry.getTime() <= today.getTime()) {
        return res.status(400).json({
          success: false,
          message: "Cannot consume item past its expiry date",
        });
      }
    }

    const transactionData = {
      transaction_type: "consumption",
      quantity: parseFloat(quantity),
      reference_number: reference_number || null,
      reason: reason,
      notes: notes || null,
      performed_by: performed_by || "System",
      transaction_date: getCurrentPhilippineTime(),
    };

    const updatedItem = await Inventory.updateInventoryQuantity(
      inventory_item_id,
      transactionData
    );

    res.json({
      success: true,
      data: updatedItem,
      message: "Consumption recorded successfully",
    });
  } catch (error) {
    console.error("Error recording consumption:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to record consumption",
    });
  }
});

// Enhanced bulk consumption with better error handling
router.post("/consumption/bulk", async (req, res) => {
  try {
    const { items, performed_by, reference_number, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items array is required",
      });
    }

    const results = [];
    const errors = [];

    // Process items in a transaction
    const trx = await db.transaction();

    try {
      for (const item of items) {
        try {
          // Block consuming expired items
          const current = await Inventory.getInventoryItemById(
            item.inventory_item_id
          );
          if (!current) {
            throw new Error("Inventory item not found");
          }
          if (current.status === "expired") {
            throw new Error("Cannot consume an expired item");
          }

          // Auto-block if expiry_date is today or earlier
          if (current.expiry_date) {
            const today = getCurrentPhilippineTime();
            today.setHours(0, 0, 0, 0);
            const expiry = new Date(current.expiry_date);
            expiry.setHours(0, 0, 0, 0);
            if (expiry.getTime() <= today.getTime()) {
              throw new Error("Cannot consume item past its expiry date");
            }
          }

          const transactionData = {
            transaction_type: "consumption",
            quantity: parseFloat(item.quantity),
            reference_number: reference_number || null,
            reason: item.reason || "Kitchen usage",
            notes: notes || item.notes || null,
            performed_by: performed_by || "System",
            transaction_date: getCurrentPhilippineTime(),
          };

          const updatedItem = await Inventory.updateInventoryQuantity(
            item.inventory_item_id,
            transactionData,
            trx
          );
          results.push(updatedItem);
        } catch (error) {
          errors.push({
            inventory_item_id: item.inventory_item_id,
            error: error.message,
          });
        }
      }

      if (errors.length === 0) {
        await trx.commit();
      } else {
        await trx.rollback();
      }

      res.json({
        success: errors.length === 0,
        data: results,
        errors: errors.length > 0 ? errors : undefined,
        message:
          errors.length === 0
            ? "Bulk consumption recorded successfully"
            : `${results.length} items processed, ${errors.length} errors occurred`,
      });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Error processing bulk consumption:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to process bulk consumption",
    });
  }
});

// Stock adjustment with enhanced validation
router.post("/adjustment", async (req, res) => {
  try {
    const {
      inventory_item_id,
      adjustment_type,
      new_quantity,
      reason,
      reference_number,
      notes,
      performed_by,
      new_expiry_date,
      disposal_cost,
    } = req.body;

    // Validation
    if (!inventory_item_id || !adjustment_type || !reason) {
      return res.status(400).json({
        success: false,
        message: "Inventory item ID, adjustment type, and reason are required",
      });
    }

    // Validate adjustment type
    const validAdjustmentTypes = [
      "set_quantity",
      "add_quantity",
      "reduce_quantity",
      "mark_expired",
      "mark_damaged",
      "set_expiry_date",
      "disposal",
    ];

    if (!validAdjustmentTypes.includes(adjustment_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid adjustment type",
      });
    }

    // For quantity adjustments, validate new quantity
    // For quantity adjustments, validate new quantity
    if (
      ["set_quantity", "add_quantity", "reduce_quantity"].includes(
        adjustment_type
      )
    ) {
      if (new_quantity === undefined || new_quantity === null) {
        return res.status(400).json({
          success: false,
          message: "New quantity is required for quantity adjustments",
        });
      }
    }

    // For expiry date adjustment, validate new_expiry_date
    if (adjustment_type === "set_expiry_date") {
      if (!new_expiry_date) {
        return res.status(400).json({
          success: false,
          message: "new_expiry_date is required for set_expiry_date",
        });
      }
    }

    // For disposal adjustment, validate disposal_cost
    if (adjustment_type === "disposal") {
      if (
        disposal_cost === undefined ||
        disposal_cost === null ||
        disposal_cost < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Disposal cost is required and must be non-negative for disposal adjustments",
        });
      }
    }

    const transactionData = {
      transaction_type: "adjustment",
      quantity: parseFloat(new_quantity || 0),
      reference_number: reference_number || null,
      reason: reason,
      notes: notes || null,
      performed_by: performed_by || "System",
      transaction_date: getCurrentPhilippineTime(),
      adjustment_type: adjustment_type,
      new_expiry_date: new_expiry_date || null,
      disposal_cost:
        disposal_cost !== undefined ? parseFloat(disposal_cost) : null,
    };

    const updatedItem = await Inventory.updateInventoryQuantity(
      inventory_item_id,
      transactionData
    );

    res.json({
      success: true,
      data: updatedItem,
      message: "Stock adjustment recorded successfully",
    });
  } catch (error) {
    console.error("Error recording stock adjustment:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to record stock adjustment",
    });
  }
});

// Bulk stock adjustment
router.post("/adjustment/bulk", async (req, res) => {
  try {
    const { items, performed_by, reference_number, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items array is required",
      });
    }

    const results = [];
    const errors = [];

    // Process items in a transaction
    const trx = await db.transaction();

    try {
      for (const item of items) {
        try {
          const transactionData = {
            transaction_type: "adjustment",
            quantity: parseFloat(item.new_quantity || 0),
            reference_number: reference_number || null,
            reason: item.reason || "Bulk adjustment",
            notes: notes || item.notes || null,
            performed_by: performed_by || "System",
            transaction_date: getCurrentPhilippineTime(),
            adjustment_type: item.adjustment_type,
          };

          const updatedItem = await Inventory.updateInventoryQuantity(
            item.inventory_item_id,
            transactionData,
            trx
          );
          results.push(updatedItem);
        } catch (error) {
          errors.push({
            inventory_item_id: item.inventory_item_id,
            error: error.message,
          });
        }
      }

      if (errors.length === 0) {
        await trx.commit();
      } else {
        await trx.rollback();
      }

      res.json({
        success: errors.length === 0,
        data: results,
        errors: errors.length > 0 ? errors : undefined,
        message:
          errors.length === 0
            ? "Bulk adjustment recorded successfully"
            : `${results.length} items processed, ${errors.length} errors occurred`,
      });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Error processing bulk adjustment:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to process bulk adjustment",
    });
  }
});

// Bulk distribution adjustment (optimized for branch distributions)
router.post("/adjustment/bulk-distribution", async (req, res) => {
  try {
    const { items, performed_by, reference_number, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items array is required",
      });
    }

    // Validate all items first
    for (const item of items) {
      if (
        !item.inventory_item_id ||
        item.current_quantity === undefined ||
        item.current_quantity === null ||
        item.new_quantity === undefined ||
        item.new_quantity === null
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Each item must have inventory_item_id, current_quantity, and new_quantity",
        });
      }
    }

    const results = [];
    const errors = [];

    // Process all items in a single transaction
    const trx = await db.transaction();

    try {
      for (const item of items) {
        try {
          const transactionData = {
            transaction_type: "adjustment",
            quantity: parseFloat(item.new_quantity || 0),
            reference_number: reference_number || null,
            reason: item.reason || "Branch Distribution",
            notes: notes || item.notes || null,
            performed_by: performed_by || "System",
            transaction_date: getCurrentPhilippineTime(),
            adjustment_type: "reduce_quantity",
            audit_action: "transfer_out",
          };

          const updatedItem = await Inventory.updateInventoryQuantity(
            item.inventory_item_id,
            transactionData,
            trx
          );
          results.push(updatedItem);
        } catch (error) {
          errors.push({
            inventory_item_id: item.inventory_item_id,
            error: error.message,
          });
        }
      }

      if (errors.length === 0) {
        await trx.commit();
      } else {
        await trx.rollback();
      }

      res.json({
        success: errors.length === 0,
        data: results,
        errors: errors.length > 0 ? errors : undefined,
        message:
          errors.length === 0
            ? "Bulk distribution adjustment recorded successfully"
            : `${results.length} items processed, ${errors.length} errors occurred`,
      });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Error processing bulk distribution adjustment:", error);
    res.status(500).json({
      success: false,
      message:
        error.message || "Failed to process bulk distribution adjustment",
    });
  }
});

// Configure alerts for item types
router.post("/alerts/configure", async (req, res) => {
  try {
    const {
      item_type_id,
      min_stock_level,
      max_stock_level,
      expiry_warning_days,
      is_active,
    } = req.body;

    if (!item_type_id) {
      return res.status(400).json({
        success: false,
        message: "Item type ID is required",
      });
    }

    const alertConfig = await Inventory.configureAlert({
      item_type_id,
      min_stock_level: parseFloat(min_stock_level || 0),
      max_stock_level: max_stock_level ? parseFloat(max_stock_level) : null,
      expiry_warning_days: parseInt(expiry_warning_days || 7),
      is_active: is_active !== false, // Default to true
    });

    res.json({
      success: true,
      data: alertConfig,
      message: "Alert configuration saved successfully",
    });
  } catch (error) {
    console.error("Error configuring alert:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to configure alert",
    });
  }
});

// Get alert configuration for item type
router.get("/alerts/configure/:itemTypeId", async (req, res) => {
  try {
    const { itemTypeId } = req.params;
    const alertConfig = await Inventory.getAlertConfiguration(itemTypeId);

    res.json({
      success: true,
      data: alertConfig,
    });
  } catch (error) {
    console.error("Error fetching alert configuration:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch alert configuration",
    });
  }
});

// Get all active alerts
router.get("/alerts/active", async (req, res) => {
  try {
    const alerts = await Inventory.getActiveAlerts();
    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error("Error fetching active alerts:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch active alerts",
    });
  }
});

// Acknowledge alert
router.post("/alerts/:alertId/acknowledge", async (req, res) => {
  try {
    const { alertId } = req.params;
    const { acknowledged_by, notes } = req.body;

    const acknowledgedAlert = await Inventory.acknowledgeAlert(
      alertId,
      acknowledged_by || "System",
      notes
    );

    res.json({
      success: true,
      data: acknowledgedAlert,
      message: "Alert acknowledged successfully",
    });
  } catch (error) {
    console.error("Error acknowledging alert:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to acknowledge alert",
    });
  }
});

// Get centralized categories for request supply integration
router.get("/categories/for-requests", async (req, res) => {
  try {
    const CategoryMappingService = require("../services/categoryMappingService");
    const categories = await CategoryMappingService.getInventoryCategories();

    res.json({
      success: true,
      data: categories,
      message: "Inventory categories retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching categories for requests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve inventory categories",
      error: error.message,
    });
  }
});

// Get item types by category
router.get("/categories/:categoryId/item-types", async (req, res) => {
  try {
    const { categoryId } = req.params;
    const CategoryMappingService = require("../services/categoryMappingService");
    const itemTypes =
      await CategoryMappingService.getItemTypesByCategory(categoryId);

    res.json({
      success: true,
      data: itemTypes,
      message: "Item types retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching item types:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve item types",
      error: error.message,
    });
  }
});

// ========================================
// ANALYTICS & FORECASTING ENDPOINTS
// ========================================

// Get comprehensive analytics dashboard
router.get("/analytics/dashboard", async (req, res) => {
  try {
    const timeframe = req.query.timeframe || "month";
    const dashboard = await Inventory.getAnalyticsDashboard(timeframe);

    res.json({
      success: true,
      data: dashboard,
      message: "Analytics dashboard retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching analytics dashboard:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch analytics dashboard",
    });
  }
});

// Get most used items ranking
router.get("/analytics/most-used", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const timeframe = req.query.timeframe || "month";
    const mostUsed = await Inventory.getMostUsedItems(limit, timeframe);

    res.json({
      success: true,
      data: mostUsed,
      message: "Most used items retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching most used items:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch most used items",
    });
  }
});

// Get least used items (slow movers)
router.get("/analytics/least-used", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const timeframe = req.query.timeframe || "month";
    const leastUsed = await Inventory.getLeastUsedItems(limit, timeframe);

    res.json({
      success: true,
      data: leastUsed,
      message: "Least used items retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching least used items:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch least used items",
    });
  }
});

// Get consumption forecast for specific item
router.get("/analytics/forecast/:itemName", async (req, res) => {
  try {
    const { itemName } = req.params;
    const periods = parseInt(req.query.periods) || 3;
    const forecast = await Inventory.getForecast(itemName, periods);

    res.json({
      success: true,
      data: forecast,
      message: "Forecast retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching forecast:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch forecast",
    });
  }
});

// Get seasonal consumption patterns
router.get("/analytics/seasonal/:itemName", async (req, res) => {
  try {
    const { itemName } = req.params;
    const patterns = await Inventory.getSeasonalPatterns(itemName);

    res.json({
      success: true,
      data: patterns,
      message: "Seasonal patterns retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching seasonal patterns:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch seasonal patterns",
    });
  }
});

// Get usage analytics by timeframe
router.get("/analytics/usage", async (req, res) => {
  try {
    const timeframe = req.query.timeframe || "month";
    const analytics = await Inventory.getUsageAnalytics(timeframe);

    res.json({
      success: true,
      data: analytics,
      message: "Usage analytics retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching usage analytics:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch usage analytics",
    });
  }
});

// Get inventory turnover analysis
router.get("/analytics/turnover", async (req, res) => {
  try {
    const timeframe = req.query.timeframe || "month";
    const turnover = await Inventory.getInventoryTurnover(timeframe);

    res.json({
      success: true,
      data: turnover,
      message: "Inventory turnover analysis retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching inventory turnover:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch inventory turnover",
    });
  }
});

// Get category breakdown
router.get("/analytics/category-breakdown", async (req, res) => {
  try {
    const timeframe = req.query.timeframe || "month";
    const breakdown = await Inventory.getCategoryBreakdown(timeframe);

    res.json({
      success: true,
      data: breakdown,
      message: "Category breakdown retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching category breakdown:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch category breakdown",
    });
  }
});

module.exports = router;
