const express = require("express");
const router = express.Router();
const BranchInventory = require("../models/BranchInventory");
const BranchInventoryTransaction = require("../models/BranchInventoryTransaction");
const { authenticateToken, requirePermission } = require("../middleware/rbac");

// Get branch inventory
router.get(
  "/:branchId",
  authenticateToken,
  requirePermission("Manage Inventory"),
  async (req, res) => {
    try {
      const { branchId } = req.params;
      const filters = {
        item_type: req.query.item_type,
        category: req.query.category,
        status: req.query.status,
        search: req.query.search,
      };

      // Remove undefined filters
      Object.keys(filters).forEach((key) => {
        if (filters[key] === undefined || filters[key] === "") {
          delete filters[key];
        }
      });

      const inventory = await BranchInventory.getByBranch(branchId, filters);

      res.json({
        success: true,
        data: inventory,
      });
    } catch (error) {
      console.error("Error fetching branch inventory:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch branch inventory",
      });
    }
  }
);

// Update item expiry date
router.put(
  "/items/:itemId/expiry",
  authenticateToken,
  requirePermission("Manage Inventory"),
  async (req, res) => {
    try {
      const { itemId } = req.params;
      const { expiry_date, reference_number, notes } = req.body;

      // Get current item for logging context
      const current = await require("../config/database")
        .db("branch_inventory")
        .where("id", itemId)
        .whereNull("deleted_at")
        .first();

      if (!current) {
        return res.status(404).json({
          success: false,
          message: "Item not found",
        });
      }

      const updatedItem = await BranchInventory.updateExpiryDate(
        itemId,
        expiry_date
      );

      // Log as adjustment transaction
      try {
        await BranchInventoryTransaction.create({
          branch_id: current.branch_id,
          inventory_item_id: Number(itemId),
          item_name: updatedItem?.item_name || current.item_name,
          item_type: updatedItem?.item_type || current.item_type,
          transaction_type: "adjustment",
          quantity: 0,
          unit_of_measure: updatedItem?.unit || current?.unit,
          reference_number: reference_number || null,
          notes: notes || "Updated expiry date",
          adjustment_type: "set_expiry_date",
          new_expiry_date: expiry_date || null,
          performed_by: req.user?.id || null,
        });
      } catch (e) {
        console.warn("Failed to log branch expiry update:", e?.message || e);
      }

      res.json({
        success: true,
        data: updatedItem,
        message: "Item expiry date updated successfully",
      });
    } catch (error) {
      console.error("Error updating item expiry date:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update item expiry date",
      });
    }
  }
);

// Get branch inventory stats
router.get(
  "/:branchId/stats",
  authenticateToken,
  requirePermission("Manage Inventory"),
  async (req, res) => {
    try {
      const { branchId } = req.params;
      const stats = await BranchInventory.getBranchStats(branchId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error fetching branch stats:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch branch stats",
      });
    }
  }
);

// Get low stock items
router.get(
  "/:branchId/low-stock",
  authenticateToken,
  requirePermission("Manage Inventory"),
  async (req, res) => {
    try {
      const { branchId } = req.params;
      const items = await BranchInventory.getLowStockItems(branchId);

      res.json({
        success: true,
        data: items,
      });
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch low stock items",
      });
    }
  }
);

// Get expiring items
router.get(
  "/:branchId/expiring",
  authenticateToken,
  requirePermission("Manage Inventory"),
  async (req, res) => {
    try {
      const { branchId } = req.params;
      const days = parseInt(req.query.days) || 7;
      const items = await BranchInventory.getExpiringItems(branchId, days);

      res.json({
        success: true,
        data: items,
      });
    } catch (error) {
      console.error("Error fetching expiring items:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch expiring items",
      });
    }
  }
);

// Get recent activity
router.get(
  "/:branchId/activity",
  authenticateToken,
  requirePermission("Manage Inventory"),
  async (req, res) => {
    try {
      const { branchId } = req.params;
      const limit = parseInt(req.query.limit) || 10;
      const activity = await BranchInventory.getRecentActivity(branchId, limit);

      res.json({
        success: true,
        data: activity,
      });
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch recent activity",
      });
    }
  }
);

// List branch inventory transactions (distribution, consumption, adjustment)
router.get(
  "/:branchId/transactions",
  authenticateToken,
  requirePermission("Manage Inventory"),
  async (req, res) => {
    try {
      const { branchId } = req.params;
      const {
        page = 1,
        limit = 10,
        search = "",
        transaction_type = "",
        date_from = "",
        date_to = "",
      } = req.query;

      const result = await BranchInventoryTransaction.list(
        branchId,
        { search, transaction_type, date_from, date_to },
        { page, limit }
      );

      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Error fetching branch inventory transactions:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch transactions",
      });
    }
  }
);

// Add item to branch inventory (from distribution)
router.post(
  "/:branchId/items",
  authenticateToken,
  requirePermission("Manage Inventory"),
  async (req, res) => {
    try {
      const { branchId } = req.params;
      const itemData = req.body;

      const item = await BranchInventory.addItem(branchId, itemData);

      // Record transaction for distribution/receipt into branch inventory
      try {
        await BranchInventoryTransaction.create({
          branch_id: Number(branchId),
          inventory_item_id: item?.id || null,
          item_name: item?.item_name || itemData?.name,
          item_type: item?.item_type || itemData?.type,
          transaction_type: "distribution",
          quantity: parseFloat(item?.quantity || itemData?.quantity || 0),
          unit_of_measure: item?.unit || itemData?.unit,
          reference_number: itemData?.distribution_reference || null,
          notes: itemData?.notes || "Distributed to branch",
          performed_by: req.user?.id || null,
        });
      } catch (e) {
        console.warn(
          "Failed to log branch distribution transaction:",
          e?.message || e
        );
      }

      res.json({
        success: true,
        data: item,
        message: "Item added to branch inventory successfully",
      });
    } catch (error) {
      console.error("Error adding item to branch inventory:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to add item to branch inventory",
      });
    }
  }
);

// Update item quantity
router.put(
  "/items/:itemId/quantity",
  authenticateToken,
  requirePermission("Manage Inventory"),
  async (req, res) => {
    try {
      const { itemId } = req.params;
      const { quantity, reason } = req.body;

      // Fetch current to compute delta and determine tx type
      const current = await require("../config/database")
        .db("branch_inventory")
        .where("id", itemId)
        .whereNull("deleted_at")
        .first();

      const updatedItem = await BranchInventory.updateQuantity(
        itemId,
        quantity,
        reason
      );

      // Record transaction
      try {
        const beforeQty = parseFloat(current?.quantity || 0);
        const afterQty = parseFloat(updatedItem?.quantity || quantity || 0);
        const delta = afterQty - beforeQty;
        const txType =
          reason === "disposal"
            ? "disposal"
            : delta < 0
              ? "consumption"
              : "adjustment";

        await BranchInventoryTransaction.create({
          branch_id: current?.branch_id || updatedItem?.branch_id,
          inventory_item_id: Number(itemId),
          item_name: updatedItem?.item_name || current?.item_name,
          item_type: updatedItem?.item_type || current?.item_type,
          transaction_type: txType,
          quantity: Math.abs(delta),
          unit_of_measure:
            updatedItem?.unit ||
            current?.unit ||
            updatedItem?.unit_of_measure ||
            current?.unit_of_measure,
          reference_number: req.body?.reference_number || null,
          notes: req.body?.notes || reason || null,
          performed_by: req.user?.id || null,
        });
      } catch (e) {
        console.warn("Failed to log branch quantity change:", e?.message || e);
      }

      res.json({
        success: true,
        data: updatedItem,
        message: "Item quantity updated successfully",
      });
    } catch (error) {
      console.error("Error updating item quantity:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update item quantity",
      });
    }
  }
);

// Update item status
router.put(
  "/items/:itemId/status",
  authenticateToken,
  requirePermission("Manage Inventory"),
  async (req, res) => {
    try {
      const { itemId } = req.params;
      const { status } = req.body;

      const updatedItem = await BranchInventory.updateStatus(itemId, status);

      res.json({
        success: true,
        data: updatedItem,
        message: "Item status updated successfully",
      });
    } catch (error) {
      console.error("Error updating item status:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update item status",
      });
    }
  }
);

// Delete item (soft delete)
router.delete(
  "/items/:itemId",
  authenticateToken,
  requirePermission("Manage Inventory"),
  async (req, res) => {
    try {
      const { itemId } = req.params;

      await BranchInventory.deleteItem(itemId);

      res.json({
        success: true,
        message: "Item deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting item:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete item",
      });
    }
  }
);

module.exports = router;
