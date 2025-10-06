const express = require("express");
const router = express.Router();
const PurchaseOrder = require("../models/PurchaseOrder");
const Supplier = require("../models/Supplier");
const { db } = require("../config/database");

// GET /api/purchase-orders - Get all purchase orders (supports supplier_id filter)
router.get("/", async (req, res) => {
  try {
    const includeDeleted = req.query.includeDeleted === "true";
    const supplierId = req.query.supplier_id
      ? Number(req.query.supplier_id)
      : null;

    const purchaseOrders = await PurchaseOrder.getAll(includeDeleted, {
      supplierId,
    });

    res.json({
      success: true,
      data: purchaseOrders,
      count: purchaseOrders.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching purchase orders",
      error: error.message,
    });
  }
});

// GET /api/purchase-orders/stats - Get purchase order statistics
router.get("/stats", async (req, res) => {
  try {
    // Get purchase order stats
    const poStats = await db("purchase_orders")
      .select(
        db.raw("COUNT(*) as total"),
        db.raw("COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed"),
        db.raw(
          "COUNT(CASE WHEN status IN ('Draft', 'Sent', 'Confirmed', 'In Progress') THEN 1 END) as pending"
        ),
        db.raw(
          "COALESCE(SUM(CASE WHEN status NOT IN ('Cancelled', 'Completed') THEN total_amount ELSE 0 END), 0) as total_value"
        )
      )
      .whereNull("deleted_at")
      .first();

    // Get return stats
    const returnStats = await PurchaseOrder.getReturnStats();

    const stats = {
      total: parseInt(poStats.total) || 0,
      completed: parseInt(poStats.completed) || 0,
      pending: parseInt(poStats.pending) || 0,
      returns: parseInt(returnStats.total_returns) || 0,
      totalValue: parseFloat(poStats.total_value) || 0,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching purchase order statistics",
      error: error.message,
    });
  }
});

// GET /api/purchase-orders/approved-supply-requests - Get approved supply requests
router.get("/approved-supply-requests", async (req, res) => {
  try {
    const supplyRequests = await PurchaseOrder.getApprovedSupplyRequests();

    res.json({
      success: true,
      data: supplyRequests,
      count: supplyRequests.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching approved supply requests",
      error: error.message,
    });
  }
});

// GET /api/purchase-orders/supply-request/:id/items - Get supply request items
router.get("/supply-request/:id/items", async (req, res) => {
  try {
    const items = await PurchaseOrder.getSupplyRequestItems(req.params.id);

    res.json({
      success: true,
      data: items,
      count: items.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching supply request items",
      error: error.message,
    });
  }
});

// POST /api/purchase-orders - Create purchase order from supply request
router.post("/from-supply-request", async (req, res) => {
  try {
    const { supplyRequestId, supplierId, poData } = req.body;

    if (!supplyRequestId || !supplierId || !poData) {
      return res.status(400).json({
        success: false,
        message: "Supply request ID, supplier ID, and PO data are required",
      });
    }

    const poId = await PurchaseOrder.createFromSupplyRequest(
      supplyRequestId,
      supplierId,
      poData
    );

    const purchaseOrder = await PurchaseOrder.getById(poId);

    res.status(201).json({
      success: true,
      message: "Purchase order created successfully from supply request",
      data: purchaseOrder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating purchase order",
      error: error.message,
    });
  }
});

// POST /api/purchase-orders/from-supply-request-with-items - Create purchase order from supply request with selected items
router.post("/from-supply-request-with-items", async (req, res) => {
  try {
    const { supplyRequestId, supplierId, poData, selectedItems } = req.body;

    if (
      !supplyRequestId ||
      !supplierId ||
      !poData ||
      !selectedItems ||
      selectedItems.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Supply request ID, supplier ID, PO data, and selected items are required",
      });
    }

    const poId = await PurchaseOrder.createFromSupplyRequestWithItems(
      supplyRequestId,
      supplierId,
      poData,
      selectedItems
    );

    const purchaseOrder = await PurchaseOrder.getById(poId);

    res.status(201).json({
      success: true,
      message:
        "Purchase order created successfully from supply request with selected items",
      data: purchaseOrder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating purchase order",
      error: error.message,
    });
  }
});

// GET /api/purchase-orders/supply-request/:id/available-items - Get available items from supply request
router.get("/supply-request/:id/available-items", async (req, res) => {
  try {
    const items = await PurchaseOrder.getAvailableSupplyRequestItems(
      req.params.id
    );

    res.json({
      success: true,
      data: items,
      count: items.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching available supply request items",
      error: error.message,
    });
  }
});

// POST /api/purchase-orders - Create manual purchase order
router.post("/", async (req, res) => {
  try {
    const { poData, items } = req.body;

    if (!poData || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "PO data and items are required",
      });
    }

    const poId = await PurchaseOrder.create(poData, items);
    const purchaseOrder = await PurchaseOrder.getById(poId);

    res.status(201).json({
      success: true,
      message: "Purchase order created successfully",
      data: purchaseOrder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating purchase order",
      error: error.message,
    });
  }
});

// PUT /api/purchase-orders/:id - Update purchase order
router.put("/:id", async (req, res) => {
  try {
    const { poData, items } = req.body;

    const updated = await PurchaseOrder.update(req.params.id, poData, items);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    const purchaseOrder = await PurchaseOrder.getById(req.params.id);

    res.json({
      success: true,
      message: "Purchase order updated successfully",
      data: purchaseOrder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating purchase order",
      error: error.message,
    });
  }
});

// PUT /api/purchase-orders/:id/cancel - Cancel purchase order
router.put("/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body || {}; // Make it optional

    const cancelledOrder = await PurchaseOrder.cancel(id, cancellationReason);

    res.json({
      success: true,
      message: "Purchase order cancelled successfully",
      data: cancelledOrder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error cancelling purchase order",
      error: error.message,
    });
  }
});

// DELETE /api/purchase-orders/:id - Delete purchase order
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await PurchaseOrder.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    res.json({
      success: true,
      message: "Purchase order deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting purchase order",
      error: error.message,
    });
  }
});

// POST /api/purchase-orders/:id/returns - Log item return
router.post("/:id/returns", async (req, res) => {
  try {
    const { purchase_order_item_id, return_quantity, return_reason, notes } =
      req.body;

    if (!purchase_order_item_id || !return_quantity || !return_reason) {
      return res.status(400).json({
        success: false,
        message: "Item ID, quantity, and reason are required",
      });
    }

    const returnData = {
      purchase_order_id: req.params.id,
      purchase_order_item_id,
      return_quantity,
      return_reason,
      notes,
      logged_by: req.body.logged_by || "SCM User",
    };

    const returnId = await PurchaseOrder.logReturn(returnData);

    res.status(201).json({
      success: true,
      message: "Return logged successfully in system",
      data: { return_id: returnId },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error logging return",
      error: error.message,
    });
  }
});

// GET /api/purchase-orders/:id - Get purchase order by ID (MOVE THIS TO THE END)
router.get("/:id", async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.getById(req.params.id);

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    res.json({
      success: true,
      data: purchaseOrder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching purchase order",
      error: error.message,
    });
  }
});

router.get("/:id/can-create-grn", async (req, res) => {
  try {
    const { id } = req.params;

    const eligibility = await PurchaseOrder.canCreateNewGRN(id);

    res.json({
      success: true,
      data: eligibility,
    });
  } catch (error) {
    console.error("Error checking GRN creation eligibility:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check GRN creation eligibility",
    });
  }
});
module.exports = router;
