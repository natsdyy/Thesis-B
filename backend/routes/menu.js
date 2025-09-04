const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const Menu = require("../models/Menu");
const MenuItem = require("../models/MenuItem");
const SampleProduction = require("../models/SampleProduction");
const QualityInspection = require("../models/QualityInspection");
const ProductionInventory = require("../models/ProductionInventory");
const AuditLogger = require("../models/AuditLogger");
const InventoryService = require("../services/InventoryService");
const { authenticateToken } = require("../middleware/rbac");

// ==================== MENU ROUTES ====================

/**
 * @swagger
 * /api/menu/menus:
 *   get:
 *     summary: Get all menus
 *     tags: [Menu Management]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of menus
 */
router.get("/menus", authenticateToken, async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      is_active:
        req.query.is_active === "true"
          ? true
          : req.query.is_active === "false"
            ? false
            : undefined,
      search: req.query.search,
    };

    const menus = await Menu.getAll(filters);
    res.json({
      success: true,
      data: menus,
    });
  } catch (error) {
    console.error("Error fetching menus:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch menus",
    });
  }
});

/**
 * @swagger
 * /api/menu/menus:
 *   post:
 *     summary: Create a new menu
 *     tags: [Menu Management]
 */
router.post("/menus", authenticateToken, async (req, res) => {
  try {
    const menuData = {
      ...req.body,
      created_by: req.user.id,
    };

    const menu = await Menu.create(menuData);
    res.status(201).json({
      success: true,
      data: menu,
      message: "Menu created successfully",
    });
  } catch (error) {
    console.error("Error creating menu:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create menu",
    });
  }
});

/**
 * @swagger
 * /api/menu/menus/categories:
 *   get:
 *     summary: Get menu categories
 *     tags: [Menu Management]
 */
router.get("/menus/categories", authenticateToken, async (req, res) => {
  try {
    const categories = await Menu.getCategories();
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching menu categories:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch menu categories",
    });
  }
});

/**
 * @swagger
 * /api/menu/menus/by-category/:category:
 *   get:
 *     summary: Get menus by category (for hybrid approach)
 *     tags: [Menu Management]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of menus for the specified category
 */
router.get(
  "/menus/by-category/:category",
  authenticateToken,
  async (req, res) => {
    try {
      const { category } = req.params;
      const menus = await Menu.getByCategory(category);
      res.json({ success: true, data: menus });
    } catch (error) {
      console.error("Error fetching menus by category:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch menus by category",
      });
    }
  }
);

/**
 * @swagger
 * /api/menu/menus/stats:
 *   get:
 *     summary: Get menu statistics
 *     tags: [Menu Management]
 */
router.get("/menus/stats", authenticateToken, async (req, res) => {
  try {
    const stats = await Menu.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching menu stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch menu statistics",
    });
  }
});

/**
 * @swagger
 * /api/menu/menus/{id}:
 *   get:
 *     summary: Get menu by ID
 *     tags: [Menu Management]
 */
router.get("/menus/:id", authenticateToken, async (req, res) => {
  try {
    const menu = await Menu.getById(req.params.id);
    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found",
      });
    }

    res.json({
      success: true,
      data: menu,
    });
  } catch (error) {
    console.error("Error fetching menu:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch menu",
    });
  }
});

/**
 * @swagger
 * /api/menu/menus/{id}:
 *   put:
 *     summary: Update menu
 *     tags: [Menu Management]
 */
router.put("/menus/:id", authenticateToken, async (req, res) => {
  try {
    const menu = await Menu.update(req.params.id, req.body);
    res.json({
      success: true,
      data: menu,
      message: "Menu updated successfully",
    });
  } catch (error) {
    console.error("Error updating menu:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update menu",
    });
  }
});

/**
 * @swagger
 * /api/menu/menus/{id}:
 *   delete:
 *     summary: Delete menu
 *     tags: [Menu Management]
 */
router.delete("/menus/:id", authenticateToken, async (req, res) => {
  try {
    await Menu.delete(req.params.id);
    res.json({
      success: true,
      message: "Menu deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting menu:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete menu",
    });
  }
});

// ==================== MENU ITEMS ROUTES ====================

/**
 * @swagger
 * /api/menu/items:
 *   get:
 *     summary: Get all menu items
 *     tags: [Menu Items]
 */
router.get("/items", authenticateToken, async (req, res) => {
  try {
    const filters = {
      menu_id: req.query.menu_id,
      is_available:
        req.query.is_available === "true"
          ? true
          : req.query.is_available === "false"
            ? false
            : undefined,
      only_deleted: req.query.only_deleted === "true" ? true : undefined,
      category: req.query.category,
      search: req.query.search,
    };

    console.log("Menu items route called with filters:", filters);
    const menuItems = await MenuItem.getAll(filters);
    console.log("Menu items returned:", menuItems.length, "items");
    res.json({
      success: true,
      data: menuItems,
    });
  } catch (error) {
    console.error("Error fetching menu items:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch menu items",
    });
  }
});

/**
 * @swagger
 * /api/menu/items:
 *   post:
 *     summary: Create a new menu item
 *     tags: [Menu Items]
 */
router.post("/items", authenticateToken, async (req, res) => {
  try {
    const menuItemData = {
      ...req.body,
      created_by: req.user.id,
    };

    const menuItem = await MenuItem.create(menuItemData);
    res.status(201).json({
      success: true,
      data: menuItem,
      message: "Menu item created successfully",
    });
  } catch (error) {
    console.error("Error creating menu item:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create menu item",
    });
  }
});

// Image upload setup
const uploadsDir = path.join(__dirname, "..", "uploads", "menu-images");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "");
    cb(null, `menu-${timestamp}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  },
});

/**
 * @swagger
 * /api/menu/items/upload:
 *   post:
 *     summary: Upload image and create a new menu item
 *     consumes:
 *       - multipart/form-data
 *     tags: [Menu Items]
 */
router.post(
  "/items/upload",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    try {
      const imageUrl = req.file
        ? `/uploads/menu-images/${req.file.filename}`
        : null;

      const payload = req.body || {};

      const menuItemData = {
        ...payload,
        image_url: imageUrl,
        created_by: req.user.id,
      };

      const menuItem = await MenuItem.create(menuItemData);
      res.status(201).json({
        success: true,
        data: menuItem,
        message: "Menu item created with image successfully",
      });
    } catch (error) {
      console.error("Error uploading image or creating menu item:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to upload image/create menu item",
      });
    }
  }
);

/**
 * @swagger
 * /api/menu/items/stats:
 *   get:
 *     summary: Get menu item statistics
 *     tags: [Menu Items]
 */
router.get("/items/stats", authenticateToken, async (req, res) => {
  try {
    const stats = await MenuItem.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching menu item stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch menu item statistics",
    });
  }
});

/**
 * @swagger
 * /api/menu/items/available-recipes:
 *   get:
 *     summary: Get available recipes for menu creation
 *     tags: [Menu Items]
 */
router.get("/items/available-recipes", authenticateToken, async (req, res) => {
  try {
    const recipes = await MenuItem.getAvailableRecipes();
    res.json({
      success: true,
      data: recipes,
    });
  } catch (error) {
    console.error("Error fetching available recipes:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch available recipes",
    });
  }
});

/**
 * @swagger
 * /api/menu/items/{id}:
 *   get:
 *     summary: Get menu item by ID
 *     tags: [Menu Items]
 */
router.get("/items/:id", authenticateToken, async (req, res) => {
  try {
    const menuItem = await MenuItem.getById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    res.json({
      success: true,
      data: menuItem,
    });
  } catch (error) {
    console.error("Error fetching menu item:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch menu item",
    });
  }
});

/**
 * @swagger
 * /api/menu/items/{id}:
 *   put:
 *     summary: Update menu item
 *     tags: [Menu Items]
 */
router.put("/items/:id", authenticateToken, async (req, res) => {
  try {
    const menuItem = await MenuItem.update(
      req.params.id,
      req.body,
      req.user.id
    );
    res.json({
      success: true,
      data: menuItem,
      message: "Menu item updated successfully",
    });
  } catch (error) {
    console.error("Error updating menu item:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update menu item",
    });
  }
});

/**
 * @swagger
 * /api/menu/items/{id}/approve:
 *   post:
 *     summary: Approve menu item for production
 *     tags: [Menu Items]
 */
router.post("/items/:id/approve", authenticateToken, async (req, res) => {
  try {
    const menuItem = await MenuItem.approveForProduction(
      req.params.id,
      req.user.id
    );
    res.json({
      success: true,
      data: menuItem,
      message: "Menu item approved for production",
    });
  } catch (error) {
    console.error("Error approving menu item:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to approve menu item",
    });
  }
});

/**
 * @swagger
 * /api/menu/items/{id}:
 *   delete:
 *     summary: Delete menu item
 *     tags: [Menu Items]
 */
router.delete("/items/:id", authenticateToken, async (req, res) => {
  try {
    await MenuItem.delete(req.params.id, req.user.id);
    res.json({
      success: true,
      message: "Menu item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete menu item",
    });
  }
});

/**
 * @swagger
 * /api/menu/items/{id}/restore:
 *   post:
 *     summary: Restore a soft-deleted menu item
 *     tags: [Menu Items]
 */
router.post("/items/:id/restore", authenticateToken, async (req, res) => {
  try {
    await MenuItem.restore(req.params.id, req.user.id);
    res.json({
      success: true,
      message: "Menu item restored successfully",
    });
  } catch (error) {
    console.error("Error restoring menu item:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to restore menu item",
    });
  }
});

// ==================== SAMPLE PRODUCTION ROUTES ====================

/**
 * @swagger
 * /api/menu/sample-production:
 *   get:
 *     summary: Get all sample productions
 *     tags: [Sample Production]
 */
router.get("/sample-production", authenticateToken, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      menu_item_id: req.query.menu_item_id,
      assigned_to: req.query.assigned_to,
      scheduled_date: req.query.scheduled_date,
      search: req.query.search,
    };

    const sampleProductions = await SampleProduction.getAll(filters);
    res.json({
      success: true,
      data: sampleProductions,
    });
  } catch (error) {
    console.error("Error fetching sample productions:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch sample productions",
    });
  }
});

/**
 * @swagger
 * /api/menu/sample-production:
 *   post:
 *     summary: Create a new sample production
 *     tags: [Sample Production]
 */
router.post("/sample-production", authenticateToken, async (req, res) => {
  try {
    const sampleData = {
      ...req.body,
      created_by: req.user.id,
    };

    const sampleProduction = await SampleProduction.create(sampleData);
    res.status(201).json({
      success: true,
      data: sampleProduction,
      message: "Sample production created successfully",
    });
  } catch (error) {
    console.error("Error creating sample production:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create sample production",
    });
  }
});

/**
 * @swagger
 * /api/menu/sample-production/stats:
 *   get:
 *     summary: Get sample production statistics
 *     tags: [Sample Production]
 */
router.get("/sample-production/stats", authenticateToken, async (req, res) => {
  try {
    const stats = await SampleProduction.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching sample production stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch sample production statistics",
    });
  }
});

/**
 * @swagger
 * /api/menu/sample-production/{id}:
 *   get:
 *     summary: Get sample production by ID
 *     tags: [Sample Production]
 */
router.get("/sample-production/:id", authenticateToken, async (req, res) => {
  try {
    const sampleProduction = await SampleProduction.getById(req.params.id);
    if (!sampleProduction) {
      return res.status(404).json({
        success: false,
        message: "Sample production not found",
      });
    }

    res.json({
      success: true,
      data: sampleProduction,
    });
  } catch (error) {
    console.error("Error fetching sample production:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch sample production",
    });
  }
});

/**
 * @swagger
 * /api/menu/sample-production/{id}/start:
 *   post:
 *     summary: Start sample production
 *     tags: [Sample Production]
 */
router.post(
  "/sample-production/:id/start",
  authenticateToken,
  async (req, res) => {
    try {
      const sampleProduction = await SampleProduction.startProduction(
        req.params.id,
        req.user.id
      );
      res.json({
        success: true,
        data: sampleProduction,
        message: "Sample production started",
      });
    } catch (error) {
      console.error("Error starting sample production:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to start sample production",
      });
    }
  }
);

/**
 * @swagger
 * /api/menu/sample-production/{id}/complete:
 *   post:
 *     summary: Complete sample production
 *     tags: [Sample Production]
 */
router.post(
  "/sample-production/:id/complete",
  authenticateToken,
  async (req, res) => {
    try {
      const { quantity_produced, production_cost, notes } = req.body;
      const sampleProduction = await SampleProduction.completeProduction(
        req.params.id,
        quantity_produced,
        production_cost,
        notes,
        req.user.id
      );
      res.json({
        success: true,
        data: sampleProduction,
        message: "Sample production completed",
      });
    } catch (error) {
      console.error("Error completing sample production:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to complete sample production",
      });
    }
  }
);

/**
 * @swagger
 * /api/menu/sample-production/{id}/cancel:
 *   post:
 *     summary: Cancel sample production
 *     tags: [Sample Production]
 */
router.post(
  "/sample-production/:id/cancel",
  authenticateToken,
  async (req, res) => {
    try {
      const sampleProduction = await SampleProduction.cancelProduction(
        req.params.id,
        req.user.id
      );
      res.json({
        success: true,
        data: sampleProduction,
        message: "Sample production cancelled",
      });
    } catch (error) {
      console.error("Error cancelling sample production:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to cancel sample production",
      });
    }
  }
);

// ==================== QUALITY INSPECTION ROUTES ====================

/**
 * @swagger
 * /api/menu/quality-inspection:
 *   get:
 *     summary: Get all quality inspections
 *     tags: [Quality Inspection]
 */
router.get("/quality-inspection", authenticateToken, async (req, res) => {
  try {
    const filters = {
      result: req.query.result,
      inspection_type: req.query.inspection_type,
      menu_item_id: req.query.menu_item_id,
      inspector_id: req.query.inspector_id,
      inspection_date: req.query.inspection_date,
      search: req.query.search,
    };

    const inspections = await QualityInspection.getAll(filters);
    res.json({
      success: true,
      data: inspections,
    });
  } catch (error) {
    console.error("Error fetching quality inspections:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch quality inspections",
    });
  }
});

/**
 * @swagger
 * /api/menu/quality-inspection:
 *   post:
 *     summary: Create a new quality inspection
 *     tags: [Quality Inspection]
 */
router.post("/quality-inspection", authenticateToken, async (req, res) => {
  try {
    const inspectionData = {
      ...req.body,
      inspector_id: req.user.id,
    };

    const inspection = await QualityInspection.create(inspectionData);
    res.status(201).json({
      success: true,
      data: inspection,
      message: "Quality inspection created successfully",
    });
  } catch (error) {
    console.error("Error creating quality inspection:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create quality inspection",
    });
  }
});

/**
 * @swagger
 * /api/menu/quality-inspection/{id}/approve:
 *   post:
 *     summary: Approve inspection for production
 *     tags: [Quality Inspection]
 */
router.post(
  "/quality-inspection/:id/approve",
  authenticateToken,
  async (req, res) => {
    try {
      const inspection = await QualityInspection.approveForProduction(
        req.params.id,
        req.user.id
      );
      res.json({
        success: true,
        data: inspection,
        message: "Menu item approved for production",
      });
    } catch (error) {
      console.error("Error approving for production:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to approve for production",
      });
    }
  }
);

/**
 * @swagger
 * /api/menu/quality-inspection/{id}/fail:
 *   post:
 *     summary: Fail inspection with findings
 *     tags: [Quality Inspection]
 */
router.post(
  "/quality-inspection/:id/fail",
  authenticateToken,
  async (req, res) => {
    try {
      const { findings, corrective_actions, requires_retest, retest_date } =
        req.body;
      const inspection = await QualityInspection.failInspection(
        req.params.id,
        findings,
        corrective_actions,
        requires_retest,
        retest_date,
        req.user.id
      );
      res.json({
        success: true,
        data: inspection,
        message: "Inspection failed with findings recorded",
      });
    } catch (error) {
      console.error("Error failing inspection:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fail inspection",
      });
    }
  }
);

/**
 * @swagger
 * /api/menu/quality-inspection/pending:
 *   get:
 *     summary: Get pending inspections
 *     tags: [Quality Inspection]
 */
router.get(
  "/quality-inspection/pending",
  authenticateToken,
  async (req, res) => {
    try {
      const inspections = await QualityInspection.getPendingInspections();
      res.json({
        success: true,
        data: inspections,
      });
    } catch (error) {
      console.error("Error fetching pending inspections:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch pending inspections",
      });
    }
  }
);

/**
 * @swagger
 * /api/menu/quality-inspection/stats:
 *   get:
 *     summary: Get quality inspection statistics
 *     tags: [Quality Inspection]
 */
router.get("/quality-inspection/stats", authenticateToken, async (req, res) => {
  try {
    const stats = await QualityInspection.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching quality inspection stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch quality inspection statistics",
    });
  }
});

// ==================== PRODUCTION INVENTORY ROUTES ====================

/**
 * @swagger
 * /api/menu/production-inventory:
 *   get:
 *     summary: Get all production inventory items
 *     tags: [Production Inventory]
 */
router.get("/production-inventory", authenticateToken, async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      is_featured:
        req.query.is_featured === "true"
          ? true
          : req.query.is_featured === "false"
            ? false
            : undefined,
      low_stock: req.query.low_stock === "true",
      search: req.query.search,
    };

    const inventory = await ProductionInventory.getAll(filters);
    res.json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    console.error("Error fetching production inventory:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch production inventory",
    });
  }
});

/**
 * @swagger
 * /api/menu/production-inventory/stats:
 *   get:
 *     summary: Get production inventory statistics
 *     tags: [Production Inventory]
 */
router.get(
  "/production-inventory/stats",
  authenticateToken,
  async (req, res) => {
    try {
      const stats = await ProductionInventory.getStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error fetching production inventory stats:", error);
      res.status(500).json({
        success: false,
        message:
          error.message || "Failed to fetch production inventory statistics",
      });
    }
  }
);

/**
 * @swagger
 * /api/menu/production-inventory/{id}:
 *   get:
 *     summary: Get production inventory item by ID
 *     tags: [Production Inventory]
 */
router.get("/production-inventory/:id", authenticateToken, async (req, res) => {
  try {
    const inventoryItem = await ProductionInventory.getById(req.params.id);
    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: "Production inventory item not found",
      });
    }

    res.json({
      success: true,
      data: inventoryItem,
    });
  } catch (error) {
    console.error("Error fetching production inventory item:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch production inventory item",
    });
  }
});

/**
 * @swagger
 * /api/menu/production-inventory/{id}/stock:
 *   put:
 *     summary: Update stock levels
 *     tags: [Production Inventory]
 */
router.put(
  "/production-inventory/:id/stock",
  authenticateToken,
  async (req, res) => {
    try {
      const { quantity, notes } = req.body;
      const inventoryItem = await ProductionInventory.updateStock(
        req.params.id,
        quantity,
        req.user.id,
        notes
      );
      res.json({
        success: true,
        data: inventoryItem,
        message: "Stock updated successfully",
      });
    } catch (error) {
      console.error("Error updating stock:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update stock",
      });
    }
  }
);

/**
 * @swagger
 * /api/menu/production-inventory/{id}/pricing:
 *   put:
 *     summary: Update pricing
 *     tags: [Production Inventory]
 */
router.put(
  "/production-inventory/:id/pricing",
  authenticateToken,
  async (req, res) => {
    try {
      const { selling_price } = req.body;
      const inventoryItem = await ProductionInventory.updatePricing(
        req.params.id,
        selling_price,
        req.user.id
      );
      res.json({
        success: true,
        data: inventoryItem,
        message: "Pricing updated successfully",
      });
    } catch (error) {
      console.error("Error updating pricing:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update pricing",
      });
    }
  }
);

/**
 * @swagger
 * /api/menu/production-inventory/low-stock:
 *   get:
 *     summary: Get low stock items
 *     tags: [Production Inventory]
 */
router.get(
  "/production-inventory/low-stock",
  authenticateToken,
  async (req, res) => {
    try {
      const lowStockItems = await ProductionInventory.getLowStockItems();
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
  }
);

// ==================== INVENTORY INTEGRATION ROUTES ====================

/**
 * @swagger
 * /api/menu/inventory/check-recipe-availability:
 *   get:
 *     summary: Check ingredient availability for a recipe
 *     tags: [Menu Management]
 *     parameters:
 *       - in: query
 *         name: recipe_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: batch_size
 *         schema:
 *           type: number
 *           default: 1
 */
router.get(
  "/inventory/check-recipe-availability",
  authenticateToken,
  async (req, res) => {
    try {
      const { recipe_id, batch_size } = req.query;

      if (!recipe_id) {
        return res.status(400).json({
          success: false,
          message: "Recipe ID is required",
        });
      }

      const availability =
        await InventoryService.checkRecipeIngredientsAvailability(
          parseInt(recipe_id),
          parseFloat(batch_size) || 1
        );

      res.json({
        success: true,
        data: availability,
      });
    } catch (error) {
      console.error("Error checking recipe availability:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to check ingredient availability",
      });
    }
  }
);

/**
 * @swagger
 * /api/menu/inventory/check-sample-availability/{sampleId}:
 *   get:
 *     summary: Check ingredient availability for a sample production
 *     tags: [Menu Management]
 */
router.get(
  "/inventory/check-sample-availability/:sampleId",
  authenticateToken,
  async (req, res) => {
    try {
      const { sampleId } = req.params;
      const availability =
        await SampleProduction.getIngredientAvailability(sampleId);

      res.json({
        success: true,
        data: availability,
      });
    } catch (error) {
      console.error("Error checking sample availability:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to check sample availability",
      });
    }
  }
);

/**
 * @swagger
 * /api/menu/inventory/low-stock-alerts:
 *   get:
 *     summary: Get low stock alerts for ingredients
 *     tags: [Menu Management]
 */
router.get(
  "/inventory/low-stock-alerts",
  authenticateToken,
  async (req, res) => {
    try {
      const alerts = await InventoryService.getLowStockAlerts();

      res.json({
        success: true,
        data: alerts,
        count: alerts.length,
      });
    } catch (error) {
      console.error("Error fetching low stock alerts:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch low stock alerts",
      });
    }
  }
);

/**
 * @swagger
 * /api/menu/inventory/expiring-soon:
 *   get:
 *     summary: Get items expiring soon
 *     tags: [Menu Management]
 *     parameters:
 *       - in: query
 *         name: days_ahead
 *         schema:
 *           type: integer
 *           default: 30
 */
router.get("/inventory/expiring-soon", authenticateToken, async (req, res) => {
  try {
    const { days_ahead } = req.query;
    const expiringItems = await InventoryService.getExpiringSoon(
      parseInt(days_ahead) || 30
    );

    res.json({
      success: true,
      data: expiringItems,
      count: expiringItems.length,
    });
  } catch (error) {
    console.error("Error fetching expiring items:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch expiring items",
    });
  }
});

/**
 * @swagger
 * /api/menu/inventory/stats:
 *   get:
 *     summary: Get inventory statistics
 *     tags: [Menu Management]
 */
router.get("/inventory/stats", authenticateToken, async (req, res) => {
  try {
    const stats = await InventoryService.getInventoryStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching inventory stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch inventory statistics",
    });
  }
});

// ==================== AUDIT LOGGING ROUTES ====================

/**
 * @swagger
 * /api/menu/audit/menu-items/{menuItemId}:
 *   get:
 *     summary: Get audit logs for a specific menu item
 *     tags: [Menu Management]
 *     parameters:
 *       - in: path
 *         name: menuItemId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Audit logs for the menu item
 */
router.get(
  "/audit/menu-items/:menuItemId",
  authenticateToken,
  async (req, res) => {
    try {
      const { menuItemId } = req.params;
      const { limit, action_type, date_from, date_to } = req.query;

      const logs = await AuditLogger.getLogsForMenuItem(menuItemId, {
        limit: limit ? parseInt(limit) : undefined,
        action_type,
        date_from,
        date_to,
      });

      res.json({
        success: true,
        data: logs,
        count: logs.length,
      });
    } catch (error) {
      console.error("Error fetching audit logs for menu item:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch audit logs",
      });
    }
  }
);

/**
 * @swagger
 * /api/menu/audit/sample-productions/{sampleProductionId}:
 *   get:
 *     summary: Get audit logs for a specific sample production
 *     tags: [Menu Management]
 */
router.get(
  "/audit/sample-productions/:sampleProductionId",
  authenticateToken,
  async (req, res) => {
    try {
      const { sampleProductionId } = req.params;
      const logs =
        await AuditLogger.getLogsForSampleProduction(sampleProductionId);

      res.json({
        success: true,
        data: logs,
        count: logs.length,
      });
    } catch (error) {
      console.error("Error fetching audit logs for sample production:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch audit logs",
      });
    }
  }
);

/**
 * @swagger
 * /api/menu/audit/quality-inspections/{qualityInspectionId}:
 *   get:
 *     summary: Get audit logs for a specific quality inspection
 *     tags: [Menu Management]
 */
router.get(
  "/audit/quality-inspections/:qualityInspectionId",
  authenticateToken,
  async (req, res) => {
    try {
      const { qualityInspectionId } = req.params;
      const logs =
        await AuditLogger.getLogsForQualityInspection(qualityInspectionId);

      res.json({
        success: true,
        data: logs,
        count: logs.length,
      });
    } catch (error) {
      console.error("Error fetching audit logs for quality inspection:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch audit logs",
      });
    }
  }
);

/**
 * @swagger
 * /api/menu/audit:
 *   get:
 *     summary: Get all audit logs with filtering
 *     tags: [Menu Management]
 *     parameters:
 *       - in: query
 *         name: menu_item_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: action_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 */
router.get("/audit", authenticateToken, async (req, res) => {
  try {
    const { menu_item_id, user_id, action_type, date_from, date_to, limit } =
      req.query;

    const filters = {
      menu_item_id: menu_item_id ? parseInt(menu_item_id) : undefined,
      user_id: user_id ? parseInt(user_id) : undefined,
      action_type,
      date_from,
      date_to,
      limit: limit ? parseInt(limit) : undefined,
    };

    // Remove undefined filters
    Object.keys(filters).forEach((key) => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const logs = await AuditLogger.getAllLogs(filters);

    res.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (error) {
    console.error("Error fetching all audit logs:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch audit logs",
    });
  }
});

/**
 * @swagger
 * /api/menu/audit/stats:
 *   get:
 *     summary: Get audit statistics
 *     tags: [Menu Management]
 */
router.get("/audit/stats", authenticateToken, async (req, res) => {
  try {
    const stats = await AuditLogger.getAuditStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching audit stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch audit statistics",
    });
  }
});

module.exports = router;
