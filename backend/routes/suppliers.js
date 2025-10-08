const express = require("express");
const router = express.Router();
const Supplier = require("../models/Supplier");
const EmailService = require("../services/emailService");
const { db } = require("../config/database");

// GET /api/suppliers - Get all suppliers
router.get("/", async (req, res) => {
  try {
    const includeDeleted = req.query.includeDeleted === "true";
    const suppliers = await Supplier.getAll(includeDeleted);

    res.json({
      success: true,
      data: suppliers,
      count: suppliers.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching suppliers",
      error: error.message,
    });
  }
});

// GET /api/suppliers/stats - Get suppliers with statistics
router.get("/stats", async (req, res) => {
  try {
    const suppliers = await Supplier.getSuppliersWithStats();

    res.json({
      success: true,
      data: suppliers,
      count: suppliers.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching supplier statistics",
      error: error.message,
    });
  }
});

// GET /api/suppliers/active - Get only active suppliers for PO creation
router.get("/active", async (req, res) => {
  try {
    const suppliers = await Supplier.getActiveSuppliers();

    res.json({
      success: true,
      data: suppliers,
      count: suppliers.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching active suppliers",
      error: error.message,
    });
  }
});

// GET /api/suppliers/deleted - Get deleted suppliers (MOVE THIS BEFORE /:id route)
router.get("/deleted", async (req, res) => {
  try {
    const suppliers = await Supplier.getDeletedSuppliers();

    res.json({
      success: true,
      data: suppliers,
      count: suppliers.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching deleted suppliers",
      error: error.message,
    });
  }
});

// GET /api/suppliers/:id - Get supplier by ID (MOVE THIS AFTER /deleted)
router.get("/:id", async (req, res) => {
  try {
    const supplier = await Supplier.getById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    res.json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching supplier",
      error: error.message,
    });
  }
});

// POST /api/suppliers - Create supplier
router.post("/", async (req, res) => {
  try {
    const {
      name,
      contact_person,
      email,
      phone,
      address,
      category,
      status,
      notes,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required",
      });
    }

    const supplierData = {
      name,
      contact_person,
      email,
      phone,
      address,
      category,
      status: status || "Active",
      notes,
    };

    // Create supplier with authentication (default password: supplier123)
    const defaultPassword = "supplier123";
    const supplier = await Supplier.createWithAuth(
      supplierData,
      defaultPassword
    );

    // Attempt to send welcome email to supplier
    let emailStatus = { sent: false };
    try {
      if (supplier?.email) {
        const contactName =
          supplier.contact_person || supplier.name || "Supplier";
        const emailResult = await EmailService.sendSupplierWelcomeEmail(
          supplier.email,
          contactName,
          supplier.email,
          defaultPassword
        );
        emailStatus = {
          sent: !!emailResult?.success,
          provider: emailResult?.provider || "SMTP",
          messageId: emailResult?.messageId,
          error: emailResult?.error || null,
        };
      }
    } catch (e) {
      emailStatus = { sent: false, error: e.message };
    }

    res.status(201).json({
      success: true,
      message: "Supplier created successfully with default login credentials",
      data: {
        ...supplier,
        login_info: {
          email: supplier.email,
          default_password: defaultPassword,
          note: "Supplier should change password on first login",
        },
      },
      emailStatus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating supplier",
      error: error.message,
    });
  }
});

// PUT /api/suppliers/:id - Update supplier
router.put("/:id", async (req, res) => {
  try {
    const { name, contact_person, email, phone, address, category, status } =
      req.body;

    const supplierData = {
      name,
      contact_person,
      email,
      phone,
      address,
      category,
      status,
    };

    const updated = await Supplier.update(req.params.id, supplierData);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    const supplier = await Supplier.getById(req.params.id);

    res.json({
      success: true,
      message: "Supplier updated successfully",
      data: supplier,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating supplier",
      error: error.message,
    });
  }
});

// DELETE /api/suppliers/:id - Delete supplier
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Supplier.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    res.json({
      success: true,
      message: "Supplier deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting supplier",
      error: error.message,
    });
  }
});

// PATCH /api/suppliers/:id/restore - Restore soft deleted supplier
router.patch("/:id/restore", async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.restore(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    res.json({
      success: true,
      data: supplier,
      message: "Supplier restored successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error restoring supplier",
      error: error.message,
    });
  }
});

// GET /api/suppliers/:id/transactions - Get supplier transaction history
router.get("/:id/transactions", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status = "all",
      page = 1,
      limit = 5,
      month = null,
      year = null,
    } = req.query;

    // Verify supplier exists
    const supplier = await Supplier.getById(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    // Build the query for purchase orders
    let query = db("purchase_orders as po")
      .select(
        "po.id",
        "po.supplier_id",
        "po.po_number as transaction_id",
        db.raw("'Purchase Order' as type"),
        "po.status",
        "po.total_amount as amount",
        "po.order_date as date",
        "po.notes as description",
        "po.created_at",
        "po.updated_at"
      )
      .where("po.supplier_id", id)
      .whereNull("po.deleted_at");

    // Filter by status if provided
    if (status && status !== "all") {
      if (status === "completed") {
        query = query.where("po.status", "Completed");
      } else if (status === "returned") {
        // For returned status, we need to check if there are any item returns
        query = query.whereExists(function () {
          this.select("*")
            .from("item_returns as ir")
            .whereRaw("ir.purchase_order_id = po.id")
            .whereNull("ir.deleted_at");
        });
      } else if (status === "pending") {
        query = query.whereIn("po.status", [
          "Draft",
          "Sent",
          "Confirmed",
          "In Progress",
        ]);
      }
    }

    // Filter by month and year if provided
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      query = query.whereBetween("po.order_date", [startDate, endDate]);
    }

    // Get purchase orders
    const purchaseOrders = await query.orderBy("po.order_date", "desc");

    // Get item returns for this supplier
    let itemReturnsQuery = db("item_returns as ir")
      .join("purchase_orders as po", "ir.purchase_order_id", "po.id")
      .select(
        "ir.id",
        "po.supplier_id",
        "ir.id as transaction_id",
        db.raw("'Item Return' as type"),
        "ir.status",
        db.raw("ir.return_quantity * poi.unit_price as amount"),
        "ir.created_at as date",
        "ir.return_reason as description",
        "ir.created_at",
        "ir.updated_at"
      )
      .join(
        "purchase_order_items as poi",
        "ir.purchase_order_item_id",
        "poi.id"
      )
      .where("po.supplier_id", id)
      .whereNull("ir.deleted_at")
      .whereNull("po.deleted_at");

    // Apply month filter to item returns if provided
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      itemReturnsQuery = itemReturnsQuery.whereBetween("ir.created_at", [
        startDate,
        endDate,
      ]);
    }

    const itemReturns = await itemReturnsQuery;

    // Combine and sort all transactions
    const allTransactions = [...purchaseOrders, ...itemReturns]
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        return dateB - dateA;
      })
      .map((transaction, index) => {
        let formattedDate = null;

        try {
          if (transaction.date) {
            if (typeof transaction.date === "string") {
              formattedDate = transaction.date.split("T")[0];
            } else {
              formattedDate = new Date(transaction.date)
                .toISOString()
                .split("T")[0];
            }
          }
        } catch (dateError) {
          console.error(
            "Error formatting date for transaction:",
            transaction.id,
            dateError
          );
          formattedDate = null;
        }

        return {
          ...transaction,
          // Keep original ID for fetching details
          // id: index + 1, // Sequential ID for frontend - REMOVED
          display_order: index + 1, // Sequential display order for frontend
          amount: parseFloat(transaction.amount || 0),
          date: formattedDate,
        };
      });

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const totalCount = allTransactions.length;
    const totalPages = Math.ceil(totalCount / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedTransactions = allTransactions.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedTransactions,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching supplier transactions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching supplier transactions",
      error: error.message,
    });
  }
});

// GET /api/suppliers/:id/product-performance - Get product performance metrics
router.get("/:id/product-performance", async (req, res) => {
  try {
    const { id } = req.params;

    // Verify supplier exists
    const supplier = await Supplier.getById(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    const performance = await Supplier.getProductPerformance(id);

    res.json({
      success: true,
      data: performance,
      count: performance.length,
    });
  } catch (error) {
    console.error("Error fetching product performance:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching product performance",
      error: error.message,
    });
  }
});

// GET /api/suppliers/:id/order-history - Get order history with received vs ordered
router.get("/:id/order-history", async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10 } = req.query;

    // Verify supplier exists
    const supplier = await Supplier.getById(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    const orderHistory = await Supplier.getOrderHistory(id, parseInt(limit));

    res.json({
      success: true,
      data: orderHistory,
      count: orderHistory.length,
    });
  } catch (error) {
    console.error("Error fetching order history:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching order history",
      error: error.message,
    });
  }
});

module.exports = router;
