const express = require("express");
const router = express.Router();
const Supplier = require("../models/Supplier");

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
    const { name, contact_person, email, phone, address, category, status } =
      req.body;

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
    };

    const supplierId = await Supplier.create(supplierData);
    const supplier = await Supplier.getById(supplierId);

    res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: supplier,
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

module.exports = router;
