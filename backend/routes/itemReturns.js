const express = require("express");
const router = express.Router();
const ItemReturn = require("../models/ItemReturn");
const CashMovement = require("../models/CashMovement");

// GET /api/item-returns - Get all item returns
router.get("/", async (req, res) => {
  try {
    const filters = {
      purchase_order_id: req.query.purchase_order_id,
      status: req.query.status,
      return_reason: req.query.return_reason,
      logged_by: req.query.logged_by,
    };

    const itemReturns = await ItemReturn.getAll(filters);

    res.json({
      success: true,
      data: itemReturns,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching item returns",
      error: error.message,
    });
  }
});

// GET /api/item-returns/stats - Get return statistics
router.get("/stats", async (req, res) => {
  try {
    const filters = {
      purchase_order_id: req.query.purchase_order_id,
    };

    const stats = await ItemReturn.getStats(filters);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching return statistics",
      error: error.message,
    });
  }
});

// POST /api/item-returns - Create new item return
router.post("/", async (req, res) => {
  try {
    const {
      purchase_order_id,
      purchase_order_item_id,
      return_quantity,
      return_reason,
      notes,
    } = req.body;

    if (
      !purchase_order_id ||
      !purchase_order_item_id ||
      !return_quantity ||
      !return_reason
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Purchase order ID, item ID, quantity, and reason are required",
      });
    }

    const returnData = {
      purchase_order_id,
      purchase_order_item_id,
      return_quantity,
      return_reason,
      notes,
      logged_by: req.body.logged_by || req.user?.username || "SCM User",
    };

    const itemReturn = await ItemReturn.create(returnData);

    res.status(201).json({
      success: true,
      message: "Item return created successfully",
      data: itemReturn,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating item return",
      error: error.message,
    });
  }
});

// PUT /api/item-returns/:id/process - Process item return (for suppliers to accept)
router.put("/:id/process", async (req, res) => {
  try {
    const requestBody = req.body || {};
    const processedBy =
      requestBody.processed_by || req.user?.username || "Supplier";

    // Update status to "Processed"
    const itemReturn = await ItemReturn.update(req.params.id, {
      status: "Processed",
      processed_at: new Date(),
      processed_by: processedBy,
    });

    if (!itemReturn) {
      return res.status(404).json({
        success: false,
        message: "Item return not found",
      });
    }

    // Record cash inflow when supplier accepts the return
    try {
      const fresh = await ItemReturn.getById(itemReturn.id);
      const amount = Number(fresh?.return_value || 0);
      if (amount > 0) {
        await CashMovement.recordInflowForBudgetReturn({
          branch_id: null, // HQ/SCM
          amount,
          purchase_order_id: fresh.purchase_order_id,
          notes: `Supplier accepted return #${fresh.id} for PO ${fresh.po_number} - Refund: ₱${amount.toFixed(2)}`,
          occurred_at: new Date(),
        });
      }
    } catch (cmErr) {
      console.error("Failed to record supplier return refund inflow:", cmErr);
      // Do not fail the main operation
    }

    res.json({
      success: true,
      message: "Return processed successfully",
      data: itemReturn,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error processing item return",
      error: error.message,
    });
  }
});

// PUT /api/item-returns/:id/complete - Complete item return
router.put("/:id/complete", async (req, res) => {
  try {
    console.log("Completing item return:", req.params.id);
    console.log("Request body:", req.body);

    // Handle case where req.body might be undefined
    const requestBody = req.body || {};

    const processedBy =
      requestBody.processed_by ||
      requestBody.completed_by ||
      req.user?.username ||
      "SCM User";

    console.log("Processed by:", processedBy);

    const itemReturn = await ItemReturn.complete(req.params.id, processedBy);

    console.log("Item return result:", itemReturn);

    if (!itemReturn) {
      return res.status(404).json({
        success: false,
        message: "Item return not found",
      });
    }

    // Note: Cash movement is already created when supplier accepts the return (status: Processed)
    // No need to create duplicate cash movement on completion

    res.json({
      success: true,
      message: "Item return completed successfully",
      data: itemReturn,
    });
  } catch (error) {
    console.error("Error in complete route:", error);

    // Handle specific error messages from the model
    if (error.message.includes("cannot be completed")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error completing item return",
      error: error.message,
    });
  }
});

// PUT /api/item-returns/:id/cancel - Cancel item return
router.put("/:id/cancel", async (req, res) => {
  try {
    const requestBody = req.body || {};

    const cancelledBy =
      requestBody.cancelled_by || req.user?.username || "SCM User";

    const itemReturn = await ItemReturn.cancel(req.params.id, cancelledBy);

    if (!itemReturn) {
      return res.status(404).json({
        success: false,
        message: "Item return not found",
      });
    }

    res.json({
      success: true,
      message: "Item return cancelled successfully",
      data: itemReturn,
    });
  } catch (error) {
    // Handle specific error messages from the model
    if (error.message.includes("can be cancelled")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error cancelling item return",
      error: error.message,
    });
  }
});

// PUT /api/item-returns/:id - Update item return
router.put("/:id", async (req, res) => {
  try {
    const { return_quantity, return_reason, notes } = req.body;

    const updateData = {};
    if (return_quantity !== undefined)
      updateData.return_quantity = return_quantity;
    if (return_reason !== undefined) updateData.return_reason = return_reason;
    if (notes !== undefined) updateData.notes = notes;

    const itemReturn = await ItemReturn.update(req.params.id, updateData);

    if (!itemReturn) {
      return res.status(404).json({
        success: false,
        message: "Item return not found",
      });
    }

    res.json({
      success: true,
      message: "Item return updated successfully",
      data: itemReturn,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating item return",
      error: error.message,
    });
  }
});

// GET /api/item-returns/:id - Get item return by ID (MOVE THIS TO THE END)
router.get("/:id", async (req, res) => {
  try {
    const itemReturn = await ItemReturn.getById(req.params.id);

    if (!itemReturn) {
      return res.status(404).json({
        success: false,
        message: "Item return not found",
      });
    }

    res.json({
      success: true,
      data: itemReturn,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching item return",
      error: error.message,
    });
  }
});

// DELETE /api/item-returns/:id - Delete item return
router.delete("/:id", async (req, res) => {
  try {
    const deletedItemReturn = await ItemReturn.delete(req.params.id);

    if (!deletedItemReturn) {
      return res.status(404).json({
        success: false,
        message: "Item return not found",
      });
    }

    res.json({
      success: true,
      message: "Item return deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting item return",
      error: error.message,
    });
  }
});

module.exports = router;
