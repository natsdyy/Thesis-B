const express = require("express");
const router = express.Router();
const GoodsReceiptNote = require("../models/GoodsReceiptNote");

// Get all GRNs with optional filters
router.get("/", async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      supplier_id: req.query.supplier_id,
      purchase_order_id: req.query.purchase_order_id,
    };

    // Remove undefined filters
    Object.keys(filters).forEach((key) => {
      if (filters[key] === undefined || filters[key] === "") {
        delete filters[key];
      }
    });

    const grns = await GoodsReceiptNote.getAll(filters);
    res.json({
      success: true,
      data: grns,
    });
  } catch (error) {
    console.error("Error fetching GRNs:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch GRNs",
    });
  }
});

// Get GRN by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const grn = await GoodsReceiptNote.getById(id);

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: "GRN not found",
      });
    }

    res.json({
      success: true,
      data: grn,
    });
  } catch (error) {
    console.error("Error fetching GRN:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch GRN",
    });
  }
});

// Create GRN from PO
router.post("/from-po/:poId", async (req, res) => {
  try {
    const { poId } = req.params;
    const grnData = {
      received_by: req.body.received_by,
      received_date: req.body.received_date,
      notes: req.body.notes,
      is_partial: req.body.is_partial || false,
    };

    const grnId = await GoodsReceiptNote.createFromPO(poId, grnData);
    const grn = await GoodsReceiptNote.getById(grnId);

    res.status(201).json({
      success: true,
      data: grn,
      message: "GRN created successfully",
    });
  } catch (error) {
    console.error("Error creating GRN:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create GRN",
    });
  }
});

// Update GRN status
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, updated_by, notes } = req.body;

    if (!status || !updated_by) {
      return res.status(400).json({
        success: false,
        message: "Status and updated_by are required",
      });
    }

    const updatedGRN = await GoodsReceiptNote.updateStatus(
      id,
      status,
      updated_by,
      notes
    );
    res.json({
      success: true,
      data: updatedGRN,
      message: "GRN status updated successfully",
    });
  } catch (error) {
    console.error("Error updating GRN status:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update GRN status",
    });
  }
});

// Get GRN items
router.get("/:id/items", async (req, res) => {
  try {
    const { id } = req.params;
    const items = await GoodsReceiptNote.getItems(id);

    res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error("Error fetching GRN items:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch GRN items",
    });
  }
});

// List active inventory item types
router.get("/meta/active-item-types", async (_req, res) => {
  try {
    const types = await GoodsReceiptNote.getActiveItemTypes();
    res.json({ success: true, data: types });
  } catch (error) {
    console.error("Error fetching item types:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch item types" });
  }
});

// Map a GRN item to an inventory item type
router.post("/:id/items/:itemId/map-item-type", async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { item_type_id } = req.body;
    if (!item_type_id) {
      return res
        .status(400)
        .json({ success: false, message: "item_type_id is required" });
    }
    const updated = await GoodsReceiptNote.mapItemType(
      parseInt(id),
      parseInt(itemId),
      parseInt(item_type_id),
      req.user?.id || null
    );
    res.json({
      success: true,
      message: "Item type mapped successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error mapping GRN item type:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to map item type",
    });
  }
});

// Perform quality inspection on a specific GRN item
router.post("/:id/items/:itemId/inspect", async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { result, notes, inspection_criteria } = req.body;
    const inspectorId = req.body.inspector_id || req.user?.id; // Fallback for testing

    if (!result || !["passed", "failed", "conditional"].includes(result)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid inspection result. Must be 'passed', 'failed', or 'conditional'",
      });
    }

    const updatedGRN = await GoodsReceiptNote.performQualityInspection(
      parseInt(id),
      parseInt(itemId),
      inspectorId,
      result,
      notes,
      inspection_criteria
    );

    res.json({
      success: true,
      message: "Quality inspection completed successfully",
      data: updatedGRN,
    });
  } catch (error) {
    console.error("Error performing quality inspection:", error);
    res.status(500).json({
      success: false,
      message: "Failed to perform quality inspection",
      error: error.message,
    });
  }
});

// Perform bulk quality inspection on all items in a GRN
router.post("/:id/bulk-inspect", async (req, res) => {
  try {
    const { id } = req.params;
    const { result, notes } = req.body;
    const inspectorId = req.body.inspector_id || req.user?.id; // Fallback for testing

    if (!result || !["passed", "failed", "conditional"].includes(result)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid inspection result. Must be 'passed', 'failed', or 'conditional'",
      });
    }

    const updatedGRN = await GoodsReceiptNote.performBulkQualityInspection(
      parseInt(id),
      inspectorId,
      result,
      notes
    );

    res.json({
      success: true,
      message: "Bulk quality inspection completed successfully",
      data: updatedGRN,
    });
  } catch (error) {
    console.error("Error performing bulk quality inspection:", error);
    res.status(500).json({
      success: false,
      message: "Failed to perform bulk quality inspection",
      error: error.message,
    });
  }
});

module.exports = router;
