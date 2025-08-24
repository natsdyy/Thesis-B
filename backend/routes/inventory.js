const express = require("express");
const router = express.Router();
const Inventory = require("../models/Inventory");

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
      supplier_id: req.body.supplier_id || null,
      purchase_order_id: req.body.purchase_order_id || null,
      batch_number: req.body.batch_number || null,
      quantity: parseFloat(req.body.quantity),
      unit_cost: parseFloat(req.body.unit_cost),
      expiry_date: req.body.expiry_date || null,
      received_date: req.body.received_date || new Date(),
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
      transaction_date: req.body.transaction_date || new Date(),
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

// Bulk consumption (for kitchen usage)
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

    for (const item of items) {
      try {
        const transactionData = {
          transaction_type: "consumption",
          quantity: parseFloat(item.quantity),
          reference_number: reference_number || null,
          reason: item.reason || "Kitchen usage",
          notes: notes || null,
          performed_by: performed_by || "System",
          transaction_date: new Date(),
        };

        const updatedItem = await Inventory.updateInventoryQuantity(
          item.inventory_item_id,
          transactionData
        );
        results.push(updatedItem);
      } catch (error) {
        errors.push({
          inventory_item_id: item.inventory_item_id,
          error: error.message,
        });
      }
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
    console.error("Error processing bulk consumption:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to process bulk consumption",
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

module.exports = router;
