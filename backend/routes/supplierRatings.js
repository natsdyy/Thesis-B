const express = require("express");
const router = express.Router();
const SupplierRating = require("../models/SupplierRating");

// Create a new rating
router.post("/", async (req, res) => {
  try {
    const { supplier_id, purchase_order_id, rating, comment, rated_by } =
      req.body;

    // Validate required fields
    if (!supplier_id || !purchase_order_id || !rating || !rated_by) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // Check if rating already exists for this purchase order
    const existingRating =
      await SupplierRating.getByPurchaseOrderId(purchase_order_id);
    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: "Purchase order has already been rated",
      });
    }

    const newRating = await SupplierRating.create({
      supplier_id,
      purchase_order_id,
      rating,
      comment,
      rated_by,
    });

    res.status(201).json({
      success: true,
      message: "Rating submitted successfully",
      data: newRating,
    });
  } catch (error) {
    console.error("Error creating rating:", error);
    res.status(500).json({
      success: false,
      message: "Error creating rating",
      error: error.message,
    });
  }
});

// Get rating by purchase order ID
router.get("/purchase-order/:id", async (req, res) => {
  try {
    const rating = await SupplierRating.getByPurchaseOrderId(req.params.id);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: "Rating not found for this purchase order",
      });
    }

    res.json({
      success: true,
      data: rating,
    });
  } catch (error) {
    console.error("Error getting rating:", error);
    res.status(500).json({
      success: false,
      message: "Error getting rating",
      error: error.message,
    });
  }
});

// Get all ratings for a supplier
router.get("/supplier/:id", async (req, res) => {
  try {
    const ratings = await SupplierRating.getBySupplierId(req.params.id);

    res.json({
      success: true,
      data: ratings,
    });
  } catch (error) {
    console.error("Error getting supplier ratings:", error);
    res.status(500).json({
      success: false,
      message: "Error getting supplier ratings",
      error: error.message,
    });
  }
});

// Update a rating
router.put("/purchase-order/:id", async (req, res) => {
  try {
    const { rating, comment, rated_by } = req.body;

    // Validate required fields
    if (!rating || !rated_by) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    const updatedRating = await SupplierRating.update(req.params.id, {
      rating,
      comment,
      rated_by,
    });

    res.json({
      success: true,
      message: "Rating updated successfully",
      data: updatedRating,
    });
  } catch (error) {
    console.error("Error updating rating:", error);
    res.status(500).json({
      success: false,
      message: "Error updating rating",
      error: error.message,
    });
  }
});

module.exports = router;
