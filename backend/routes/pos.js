const express = require("express");
const router = express.Router();
const POSModel = require("../models/POS");
const POSOrder = require("../models/POSOrder");
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
      category: req.query.category || null,
      limit: req.query.limit ? parseInt(req.query.limit) : 24,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
    };

    const { rows, total } = await POSModel.getMenuItemsForPOS(filters);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
      },
    });
  } catch (error) {
    console.error("Error in POS menu-items:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch POS items",
    });
  }
});

// POST /api/pos/orders - Create new POS order
router.post("/orders", authenticateToken, async (req, res) => {
  try {
    const orderData = {
      branch_id: req.body.branch_id,
      cashier_id: req.user.id,
      manager_id: req.body.manager_id || null,
      order_type: req.body.order_type || "Dine In",
      subtotal: parseFloat(req.body.subtotal),
      tax_amount: parseFloat(req.body.tax_amount) || 0,
      total_amount: parseFloat(req.body.total_amount),
      amount_paid: parseFloat(req.body.amount_paid),
      change_amount: parseFloat(req.body.change_amount),
      items: req.body.items || [],
      notes: req.body.notes || null,
    };

    // Validation
    if (!orderData.branch_id || !orderData.items.length) {
      return res.status(400).json({
        success: false,
        message: "Branch ID and items are required",
      });
    }

    if (orderData.total_amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Total amount must be greater than 0",
      });
    }

    const order = await POSOrder.create(orderData);

    res.status(201).json({
      success: true,
      data: order,
      message: "POS order created successfully",
    });
  } catch (error) {
    console.error("Error creating POS order:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create POS order",
    });
  }
});

// GET /api/pos/orders - Get all POS orders
router.get("/orders", authenticateToken, async (req, res) => {
  try {
    const filters = {
      branch_id: req.query.branch_id ? parseInt(req.query.branch_id) : null,
      cashier_id: req.query.cashier_id ? parseInt(req.query.cashier_id) : null,
      status: req.query.status || null,
      order_type: req.query.order_type || null,
      date_from: req.query.date_from || null,
      date_to: req.query.date_to || null,
      remittance_id: req.query.remittance_id
        ? parseInt(req.query.remittance_id)
        : null,
      limit: req.query.limit ? parseInt(req.query.limit) : 20,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
    };

    const { orders, total } = await POSOrder.getAll(filters);

    res.json({
      success: true,
      data: orders,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
      },
    });
  } catch (error) {
    console.error("Error fetching POS orders:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch POS orders",
    });
  }
});

// GET /api/pos/orders/:id - Get specific POS order
router.get("/orders/:id", authenticateToken, async (req, res) => {
  try {
    const order = await POSOrder.getById(req.params.id);

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Error fetching POS order:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch POS order",
    });
  }
});

// GET /api/pos/orders/public/:orderNumber - Get order details for rating (public)
router.get("/orders/public/:orderNumber", async (req, res) => {
  try {
    const orderNumber = req.params.orderNumber;
    console.log("Fetching order details for order number:", orderNumber);

    // Get order by order number (not ID)
    const order = await POSOrder.getByOrderNumber(orderNumber);

    if (!order) {
      console.log("Order not found:", orderNumber);
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Return only the data needed for rating (no sensitive info)
    const ratingData = {
      order_number: order.order_number,
      total_amount: order.total_amount,
      created_at: order.created_at,
      branch: order.branch ? { name: order.branch.name } : null,
      cashier: order.cashier ? { name: order.cashier.name } : null,
      items: order.items || [],
    };

    res.json({
      success: true,
      data: ratingData,
    });
  } catch (error) {
    console.error("Error fetching public order:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch order details",
    });
  }
});

// POST /api/pos/orders/:id/process - Process order (pending -> processing)
router.post("/orders/:id/process", authenticateToken, async (req, res) => {
  try {
    const order = await POSOrder.processOrder(req.params.id, req.user.id);

    res.json({
      success: true,
      data: order,
      message: "Order processed successfully",
    });
  } catch (error) {
    console.error("Error processing POS order:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to process order",
    });
  }
});

// POST /api/pos/orders/:id/complete - Complete order (processing -> completed)
router.post("/orders/:id/complete", authenticateToken, async (req, res) => {
  try {
    const order = await POSOrder.completeOrder(req.params.id);

    res.json({
      success: true,
      data: order,
      message: "Order completed successfully",
    });
  } catch (error) {
    console.error("Error completing POS order:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to complete order",
    });
  }
});

// POST /api/pos/orders/:id/void - Void order (cancel)
router.post("/orders/:id/void", authenticateToken, async (req, res) => {
  try {
    const {
      void_reason,
      loss_amount = 0,
      refund_on_completed = false,
    } = req.body;

    if (!void_reason) {
      return res.status(400).json({
        success: false,
        message: "Void reason is required",
      });
    }

    const order = await POSOrder.voidOrder(
      req.params.id,
      void_reason,
      req.user.id,
      parseFloat(loss_amount) || 0,
      Boolean(refund_on_completed)
    );

    res.json({
      success: true,
      data: order,
      message: "Order voided successfully",
    });
  } catch (error) {
    console.error("Error voiding POS order:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to void order",
    });
  }
});

// GET /api/pos/sales-stats - Get sales statistics
router.get("/sales-stats", authenticateToken, async (req, res) => {
  try {
    const { branch_id, date_from, date_to } = req.query;

    if (!branch_id) {
      return res.status(400).json({
        success: false,
        message: "Branch ID is required",
      });
    }

    const stats = await POSOrder.getSalesStats(
      parseInt(branch_id),
      date_from,
      date_to
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching sales stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch sales statistics",
    });
  }
});

// GET /api/pos/daily-summary - Get daily sales summary
router.get("/daily-summary", authenticateToken, async (req, res) => {
  try {
    const { branch_id, date } = req.query;

    if (!branch_id || !date) {
      return res.status(400).json({
        success: false,
        message: "Branch ID and date are required",
      });
    }

    const summary = await POSOrder.getDailySummary(parseInt(branch_id), date);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching daily summary:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch daily summary",
    });
  }
});

// GET /api/pos/loss-trends - Get bucketed loss/disposed trends
router.get("/loss-trends", authenticateToken, async (req, res) => {
  try {
    const { branch_id, date_from, date_to, bucket = "auto" } = req.query;

    if (!branch_id) {
      return res.status(400).json({
        success: false,
        message: "Branch ID is required",
      });
    }

    const start = date_from ? new Date(date_from) : null;
    const end = date_to ? new Date(date_to) : null;

    // Decide bucket: hour for same-day; else day
    let bucketType = bucket;
    if (bucket === "auto") {
      if (start && end) {
        const sameDay =
          start.getFullYear() === end.getFullYear() &&
          start.getMonth() === end.getMonth() &&
          start.getDate() === end.getDate();
        bucketType = sameDay ? "hour" : "day";
      } else {
        bucketType = "day";
      }
    }

    const results = await POSOrder.getLossTrends(
      parseInt(branch_id),
      date_from || null,
      date_to || null,
      bucketType
    );

    res.json({ success: true, data: results });
  } catch (error) {
    console.error("Error fetching loss trends:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch loss trends",
    });
  }
});

// GET /api/pos/sales-trends - bucketed sales aggregates
router.get("/sales-trends", authenticateToken, async (req, res) => {
  try {
    const {
      branch_id,
      date_from,
      date_to,
      bucket = "auto",
      period = null,
    } = req.query;

    if (!branch_id) {
      return res.status(400).json({
        success: false,
        message: "Branch ID is required",
      });
    }

    // Auto bucket: hour for same-day; month for ~year; else day
    let bucketType = bucket;
    if (bucket === "auto") {
      if (period === "year") bucketType = "month";
      else if (date_from && date_to) {
        const s = new Date(date_from);
        const e = new Date(date_to);
        const sameDay =
          s.getFullYear() === e.getFullYear() &&
          s.getMonth() === e.getMonth() &&
          s.getDate() === e.getDate();
        bucketType = sameDay ? "hour" : "day";
      } else bucketType = "day";
    }

    const data = await POSOrder.getSalesTrends(
      parseInt(branch_id),
      date_from || null,
      date_to || null,
      bucketType
    );

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching sales trends:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch sales trends",
    });
  }
});

module.exports = router;
