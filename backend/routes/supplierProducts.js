const express = require("express");
const router = express.Router();
const SupplierProduct = require("../models/SupplierProduct");
const { formatForDatabaseWithTimezone } = require("../utils/timezoneUtils");

/**
 * @swagger
 * tags:
 *   name: Supplier Products
 *   description: Supplier product management endpoints
 */

/**
 * @swagger
 * /api/supplier-products:
 *   get:
 *     summary: Get all products for a supplier
 *     tags: [Supplier Products]
 *     parameters:
 *       - in: query
 *         name: supplier_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 */
router.get("/", async (req, res) => {
  try {
    const { supplier_id, search, item_type_id } = req.query;

    if (!supplier_id) {
      return res.status(400).json({
        success: false,
        message: "Supplier ID is required",
      });
    }

    let products;

    if (search) {
      products = await SupplierProduct.searchBySupplier(supplier_id, search);
    } else if (item_type_id) {
      products = await SupplierProduct.getByItemType(supplier_id, item_type_id);
    } else {
      products = await SupplierProduct.getAllBySupplier(supplier_id);
    }

    res.json({
      success: true,
      message: "Products retrieved successfully",
      data: products,
    });
  } catch (error) {
    console.error("Get supplier products error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve products",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/supplier-products/available:
 *   get:
 *     summary: Get all available products for a supplier
 *     tags: [Supplier Products]
 */
router.get("/available", async (req, res) => {
  try {
    const { supplier_id } = req.query;

    if (!supplier_id) {
      return res.status(400).json({
        success: false,
        message: "Supplier ID is required",
      });
    }

    const products = await SupplierProduct.getAvailableBySupplier(supplier_id);

    res.json({
      success: true,
      message: "Available products retrieved successfully",
      data: products,
    });
  } catch (error) {
    console.error("Get available products error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve available products",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/supplier-products/all-item-types:
 *   get:
 *     summary: Get all available item types from the system
 *     tags: [Supplier Products]
 */
router.get("/all-item-types", async (req, res) => {
  try {
    const { db } = require("../config/database");

    const itemTypes = await db("inventory_item_types as it")
      .leftJoin("inventory_categories as c", "it.category_id", "c.id")
      .where("it.is_active", true)
      .select(
        "it.id",
        "it.name",
        "it.category_id",
        "it.unit_of_measure",
        "c.name as category_name"
      )
      .orderBy("c.name", "asc")
      .orderBy("it.name", "asc");

    res.json({
      success: true,
      message: "All item types retrieved successfully",
      data: itemTypes,
    });
  } catch (error) {
    console.error("Get all item types error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve item types",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/supplier-products/item-types:
 *   get:
 *     summary: Get all item types used by a supplier
 *     tags: [Supplier Products]
 */
router.get("/item-types", async (req, res) => {
  try {
    const { supplier_id } = req.query;

    if (!supplier_id) {
      return res.status(400).json({
        success: false,
        message: "Supplier ID is required",
      });
    }

    const itemTypes = await SupplierProduct.getItemTypesBySupplier(supplier_id);

    res.json({
      success: true,
      message: "Item types retrieved successfully",
      data: itemTypes,
    });
  } catch (error) {
    console.error("Get item types error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve item types",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/supplier-products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Supplier Products]
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await SupplierProduct.getByIdWithSupplier(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      message: "Product retrieved successfully",
      data: product,
    });
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve product",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/supplier-products:
 *   post:
 *     summary: Create new product
 *     tags: [Supplier Products]
 */
router.post("/", async (req, res) => {
  try {
    const {
      supplier_id,
      product_name,
      description,
      item_type_id,
      unit,
      unit_price,
      minimum_order_quantity,
      is_available,
      sku,
      image_url,
      // Promo discount fields
      has_promo_discount,
      promo_minimum_quantity,
      promo_discount_percentage,
      promo_discount_amount,
      promo_discount_type,
      promo_description,
      promo_start_date,
      promo_end_date,
    } = req.body;

    // Validation
    if (!supplier_id || !product_name || !unit_price) {
      return res.status(400).json({
        success: false,
        message: "Supplier ID, product name, and unit price are required",
      });
    }

    if (unit_price < 0) {
      return res.status(400).json({
        success: false,
        message: "Unit price cannot be negative",
      });
    }

    const productData = {
      supplier_id,
      product_name,
      description: description || null,
      item_type_id: item_type_id || null,
      unit: unit || "pcs",
      unit_price,
      minimum_order_quantity: minimum_order_quantity || 1,
      is_available: is_available !== undefined ? is_available : true,
      sku: sku || null,
      image_url: image_url || null,
      // Promo discount fields
      has_promo_discount: has_promo_discount || false,
      promo_minimum_quantity: promo_minimum_quantity || null,
      promo_discount_percentage: promo_discount_percentage || null,
      promo_discount_amount: promo_discount_amount || null,
      promo_discount_type: promo_discount_type || "percentage",
      promo_description: promo_description || null,
      promo_start_date: promo_start_date
        ? formatForDatabaseWithTimezone(new Date(promo_start_date))
        : null,
      promo_end_date: promo_end_date
        ? formatForDatabaseWithTimezone(new Date(promo_end_date))
        : null,
    };

    const product = await SupplierProduct.create(productData);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/supplier-products/{id}:
 *   put:
 *     summary: Update product
 *     tags: [Supplier Products]
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      supplier_id,
      product_name,
      description,
      item_type_id,
      unit,
      unit_price,
      minimum_order_quantity,
      is_available,
      sku,
      image_url,
      // Promo discount fields
      has_promo_discount,
      promo_minimum_quantity,
      promo_discount_percentage,
      promo_discount_amount,
      promo_discount_type,
      promo_description,
      promo_start_date,
      promo_end_date,
    } = req.body;

    if (!supplier_id) {
      return res.status(400).json({
        success: false,
        message: "Supplier ID is required",
      });
    }

    if (unit_price !== undefined && unit_price < 0) {
      return res.status(400).json({
        success: false,
        message: "Unit price cannot be negative",
      });
    }

    const updateData = {};
    if (product_name !== undefined) updateData.product_name = product_name;
    if (description !== undefined) updateData.description = description;
    if (item_type_id !== undefined) updateData.item_type_id = item_type_id;
    if (unit !== undefined) updateData.unit = unit;
    if (unit_price !== undefined) updateData.unit_price = unit_price;
    if (minimum_order_quantity !== undefined)
      updateData.minimum_order_quantity = minimum_order_quantity;
    if (is_available !== undefined) updateData.is_available = is_available;
    if (sku !== undefined) updateData.sku = sku;
    if (image_url !== undefined) updateData.image_url = image_url;
    // Promo discount fields
    if (has_promo_discount !== undefined)
      updateData.has_promo_discount = has_promo_discount;
    if (promo_minimum_quantity !== undefined)
      updateData.promo_minimum_quantity = promo_minimum_quantity;
    if (promo_discount_percentage !== undefined)
      updateData.promo_discount_percentage = promo_discount_percentage;
    if (promo_discount_amount !== undefined)
      updateData.promo_discount_amount = promo_discount_amount;
    if (promo_discount_type !== undefined)
      updateData.promo_discount_type = promo_discount_type;
    if (promo_description !== undefined)
      updateData.promo_description = promo_description;
    if (promo_start_date !== undefined)
      updateData.promo_start_date = promo_start_date
        ? formatForDatabaseWithTimezone(new Date(promo_start_date))
        : null;
    if (promo_end_date !== undefined)
      updateData.promo_end_date = promo_end_date
        ? formatForDatabaseWithTimezone(new Date(promo_end_date))
        : null;

    const product = await SupplierProduct.update(id, supplier_id, updateData);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or you don't have permission to update it",
      });
    }

    res.json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/supplier-products/{id}/toggle-availability:
 *   patch:
 *     summary: Toggle product availability
 *     tags: [Supplier Products]
 */
router.patch("/:id/toggle-availability", async (req, res) => {
  try {
    const { id } = req.params;
    const { supplier_id } = req.body;

    if (!supplier_id) {
      return res.status(400).json({
        success: false,
        message: "Supplier ID is required",
      });
    }

    const product = await SupplierProduct.toggleAvailability(id, supplier_id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or you don't have permission to update it",
      });
    }

    res.json({
      success: true,
      message: `Product ${product.is_available ? "enabled" : "disabled"} successfully`,
      data: product,
    });
  } catch (error) {
    console.error("Toggle availability error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle availability",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/supplier-products/{id}:
 *   delete:
 *     summary: Delete product (soft delete)
 *     tags: [Supplier Products]
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { supplier_id } = req.body;

    if (!supplier_id) {
      return res.status(400).json({
        success: false,
        message: "Supplier ID is required",
      });
    }

    const product = await SupplierProduct.delete(id, supplier_id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or you don't have permission to delete it",
      });
    }

    res.json({
      success: true,
      message: "Product deleted successfully",
      data: product,
    });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/supplier-products/{id}/toggle-promo:
 *   patch:
 *     summary: Toggle or update promo discount for a product
 *     tags: [Supplier Products]
 */
router.patch("/:id/toggle-promo", async (req, res) => {
  try {
    const { id } = req.params;
    const { supplier_id, ...promoData } = req.body;

    if (!supplier_id) {
      return res.status(400).json({
        success: false,
        message: "Supplier ID is required",
      });
    }

    const product = await SupplierProduct.togglePromoDiscount(
      id,
      supplier_id,
      promoData
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or you don't have permission to update it",
      });
    }

    res.json({
      success: true,
      message: `Product promo discount ${product.has_promo_discount ? "enabled" : "disabled"} successfully`,
      data: product,
    });
  } catch (error) {
    console.error("Toggle promo discount error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle promo discount",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/supplier-products/promotions:
 *   get:
 *     summary: Get products with active promotions for a supplier
 *     tags: [Supplier Products]
 */
router.get("/promotions", async (req, res) => {
  try {
    const { supplier_id } = req.query;

    if (!supplier_id) {
      return res.status(400).json({
        success: false,
        message: "Supplier ID is required",
      });
    }

    const products =
      await SupplierProduct.getProductsWithActivePromotions(supplier_id);

    res.json({
      success: true,
      message: "Products with active promotions retrieved successfully",
      data: products,
    });
  } catch (error) {
    console.error("Get promotions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve promotions",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/supplier-products/{id}/calculate-price:
 *   post:
 *     summary: Calculate discounted price for a product based on quantity
 *     tags: [Supplier Products]
 */
router.post("/:id/calculate-price", async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Valid quantity is required",
      });
    }

    const product = await SupplierProduct.getById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const priceInfo = SupplierProduct.calculateDiscountedPrice(
      product,
      quantity
    );

    res.json({
      success: true,
      message: "Price calculated successfully",
      data: {
        product_id: id,
        quantity,
        ...priceInfo,
      },
    });
  } catch (error) {
    console.error("Calculate price error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate price",
      error: error.message,
    });
  }
});

module.exports = router;
