const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const Menu = require("../models/Menu");
const MenuItem = require("../models/MenuItem");
const QualityInspection = require("../models/QualityInspection");
const ProductionInventory = require("../models/ProductionInventory");
const BranchDistribution = require("../models/BranchDistribution");
const Branch = require("../models/Branch");
const AuditLogger = require("../models/AuditLogger");
const InventoryService = require("../services/InventoryService");
const { authenticateToken } = require("../middleware/rbac");

// ==================== PUBLIC ROUTES (NO AUTHENTICATION REQUIRED) ====================

/**
 * @swagger
 * /api/menu/public/items:
 *   get:
 *     summary: Get all available menu items for public display
 *     tags: [Menu Items]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit number of results
 *     responses:
 *       200:
 *         description: List of available menu items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       price:
 *                         type: number
 *                       category:
 *                         type: string
 *                       image_url:
 *                         type: string
 *                       is_available:
 *                         type: boolean
 */
router.get("/public/items", async (req, res) => {
  try {
    const filters = {
      is_available: true,
      category: req.query.category,
      limit: req.query.limit ? parseInt(req.query.limit) : 12,
    };

    const menuItems = await MenuItem.getAll(filters);

    res.json({
      success: true,
      data: menuItems,
    });
  } catch (error) {
    console.error("Error fetching public menu items:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch menu items",
    });
  }
});

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

    const menuItems = await MenuItem.getAll(filters);

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
 * /api/menu/items/{id}/upload:
 *   put:
 *     summary: Update menu item with image
 *     consumes:
 *       - multipart/form-data
 *     tags: [Menu Items]
 */
router.put(
  "/items/:id/upload",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    try {
      const imageUrl = req.file
        ? `/uploads/menu-images/${req.file.filename}`
        : null;

      const payload = req.body || {};

      // If image was uploaded, add image_url to the payload
      if (imageUrl) {
        payload.image_url = imageUrl;
      }

      const menuItem = await MenuItem.update(
        req.params.id,
        payload,
        req.user.id
      );

      res.json({
        success: true,
        data: menuItem,
        message: "Menu item updated successfully",
      });
    } catch (error) {
      console.error("Error updating menu item with image:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update menu item",
      });
    }
  }
);

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
 * /api/menu/quality-inspection/types:
 *   get:
 *     summary: Get available inspection types and requirements
 *     tags: [Quality Inspection]
 */
router.get("/quality-inspection/types", async (req, res) => {
  try {
    const inspectionTypes = QualityInspection.getInspectionTypes();
    res.json({
      success: true,
      data: inspectionTypes,
    });
  } catch (error) {
    console.error("Error fetching inspection types:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch inspection types",
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
 * /api/menu/quality-inspection/{id}:
 *   put:
 *     summary: Update quality inspection status
 *     tags: [Quality Inspection]
 */
router.put("/quality-inspection/:id", authenticateToken, async (req, res) => {
  try {
    const { result, notes } = req.body;
    const inspection = await QualityInspection.updateStatus(req.params.id, {
      result,
      notes,
      updated_by: req.user.id,
    });
    res.json({
      success: true,
      data: inspection,
      message: "Quality inspection updated successfully",
    });
  } catch (error) {
    console.error("Error updating quality inspection:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update quality inspection",
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
 * /api/menu/production-inventory:
 *   post:
 *     summary: Create production inventory entry for approved menu item
 *     tags: [Production Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - menu_item_id
 *             properties:
 *               menu_item_id:
 *                 type: integer
 *                 description: ID of the menu item to create production inventory for
 *               reorder_point:
 *                 type: integer
 *                 description: Minimum stock level before reordering
 *                 default: 20
 *               maximum_stock:
 *                 type: integer
 *                 description: Maximum stock level
 *                 default: 0
 *     responses:
 *       201:
 *         description: Production inventory created successfully
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: Production inventory already exists for this menu item
 *       500:
 *         description: Server error
 */
router.post("/production-inventory", authenticateToken, async (req, res) => {
  try {
    const { menu_item_id, reorder_point, maximum_stock } = req.body;

    // Validation
    if (!menu_item_id) {
      return res.status(400).json({
        success: false,
        message: "Menu item ID is required",
      });
    }

    const additionalData = {
      reorder_point: reorder_point || null, // Will use dynamic calculation in model
      maximum_stock: maximum_stock || 0,
    };

    const productionInventory = await ProductionInventory.create(
      menu_item_id,
      req.user.id,
      additionalData
    );

    res.status(201).json({
      success: true,
      data: productionInventory,
      message: "Production inventory created successfully with 0 initial stock",
    });
  } catch (error) {
    console.error("Error creating production inventory:", error);

    if (error.message.includes("already exists")) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to create production inventory",
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
 * /api/menu/production-inventory/recent-activity:
 *   get:
 *     summary: Get recent production inventory activity
 *     tags: [Production Inventory]
 */
router.get(
  "/production-inventory/recent-activity",
  authenticateToken,
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const recentActivity = await ProductionInventory.getRecentActivity(limit);
      res.json({
        success: true,
        data: recentActivity,
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

/**
 * @swagger
 * /api/menu/production-inventory/audit-logs:
 *   get:
 *     summary: Get production inventory audit logs with filters and pagination
 *     tags: [Production Inventory]
 */
router.get(
  "/production-inventory/audit-logs",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        action_type = "",
        date_from = "",
        date_to = "",
        menu_item_id = "",
      } = req.query;

      const filters = {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        action_type,
        date_from,
        date_to,
        menu_item_id: menu_item_id ? parseInt(menu_item_id) : null,
      };

      const result = await ProductionInventory.getAuditLogs(filters);
      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      });
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch audit logs",
      });
    }
  }
);

/**
 * @swagger
 * /api/menu/production-inventory/branches:
 *   get:
 *     summary: Get active branches for distribution
 *     tags: [Production Inventory]
 */
router.get(
  "/production-inventory/branches",
  authenticateToken,
  async (req, res) => {
    try {
      const branches = await Branch.getActiveBranches();
      res.json(branches);
    } catch (error) {
      console.error("Error fetching branches for distribution:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch branches",
      });
    }
  }
);

/**
 * @swagger
 * /api/menu/production-inventory/distributions:
 *   get:
 *     summary: Get all branch distributions with filters
 *     tags: [Production Inventory]
 */
router.get(
  "/production-inventory/distributions",
  authenticateToken,
  async (req, res) => {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        branch_id: req.query.branch_id,
        startDate: req.query.date_from,
        endDate: req.query.date_to,
        search: req.query.search,
      };

      const result = await BranchDistribution.getAllDistributionItems(options);

      res.json({
        success: true,
        data: result.distributions,
        pagination: {
          page: result.pagination.page,
          pages: result.pagination.pages,
          total: result.pagination.total,
        },
      });
    } catch (error) {
      console.error("Error fetching distributions:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch distributions",
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
      const {
        quantity,
        notes,
        // Enhanced stock update data
        new_quantity,
        previous_quantity,
        quantity_change,
        adjustment_type,
        adjustment_category,
        reason,
        reference_number,
        counted_by,
        verified_by,
        requires_approval,
        change_percentage,
        cost_impact,
        cost_impact_type,
        cost_description,
        revenue_impact,
        cost_impact_percentage,
        unit_cost,
        total_item_value,
        is_significant_cost_impact,
        timestamp,
      } = req.body;

      // Use new_quantity if provided, otherwise fall back to quantity
      const finalQuantity = new_quantity || quantity;

      // Prepare comprehensive notes including all adjustment details
      const comprehensiveNotes = {
        basic_notes: notes,
        adjustment_details: {
          adjustment_type,
          adjustment_category,
          reason,
          reference_number,
          counted_by,
          verified_by,
          requires_approval,
          change_percentage,
          cost_impact,
          cost_impact_type,
          cost_description,
          revenue_impact,
          cost_impact_percentage,
          unit_cost,
          total_item_value,
          is_significant_cost_impact,
          timestamp,
        },
      };

      const inventoryItem = await ProductionInventory.updateStock(
        req.params.id,
        finalQuantity,
        req.user.id,
        JSON.stringify(comprehensiveNotes)
      );

      // Determine response message based on approval requirement
      const message = requires_approval
        ? "Stock adjustment submitted for approval"
        : "Stock updated successfully";

      res.json({
        success: true,
        data: inventoryItem,
        message: message,
        requires_approval: requires_approval || false,
        cost_impact: cost_impact || 0,
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

/**
 * @swagger
 * /api/menu/production-inventory/{id}/update-reorder-point:
 *   put:
 *     summary: Update reorder point dynamically based on current stock
 *     tags: [Production Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Production inventory ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               percentage:
 *                 type: integer
 *                 minimum: 10
 *                 maximum: 20
 *                 description: Percentage of stock for reorder point (default 15%)
 *     responses:
 *       200:
 *         description: Reorder point updated successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.put(
  "/production-inventory/:id/update-reorder-point",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { percentage } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Production inventory ID is required",
        });
      }

      // Get current inventory item
      const inventory = await db("production_inventory")
        .where("id", id)
        .where("is_active", true)
        .first();

      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: "Production inventory item not found",
        });
      }

      // Calculate new reorder point
      const currentStock = inventory.available_quantity || 0;
      const newReorderPoint = ProductionInventory.calculateDynamicReorderPoint(
        currentStock,
        percentage
      );

      // Update the reorder point
      await db("production_inventory").where("id", id).update({
        reorder_point: newReorderPoint,
        updated_at: db.fn.now(),
      });

      res.json({
        success: true,
        data: {
          id: parseInt(id),
          current_stock: currentStock,
          new_reorder_point: newReorderPoint,
          percentage_used: percentage || 15,
        },
        message: `Reorder point updated to ${newReorderPoint} (${percentage || 15}% of current stock)`,
      });
    } catch (error) {
      console.error("Error updating reorder point:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update reorder point",
      });
    }
  }
);

// ==================== DISTRIBUTION ROUTES ====================

/**
 * @swagger
 * /api/menu/production-inventory/{id}/distribute:
 *   post:
 *     summary: Record distribution to branch
 *     tags: [Production Inventory]
 */
router.post(
  "/production-inventory/:id/distribute",
  authenticateToken,
  async (req, res) => {
    try {
      const { quantity, branch_id, notes } = req.body;

      if (!quantity || !branch_id) {
        return res.status(400).json({
          success: false,
          message: "Quantity and branch_id are required",
        });
      }

      const inventoryItem = await ProductionInventory.recordDistribution(
        req.params.id,
        quantity,
        branch_id,
        req.user.id,
        notes
      );

      res.json({
        success: true,
        data: inventoryItem,
        message: "Distribution recorded successfully",
      });
    } catch (error) {
      console.error("Error recording distribution:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to record distribution",
      });
    }
  }
);

/**
 * @swagger
 * /api/menu/production-inventory/bulk-distribute:
 *   post:
 *     summary: Record multiple distributions to branches in bulk (optimized for performance)
 *     tags: [Production Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - distributions
 *             properties:
 *               distributions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - menu_item_id
 *                     - quantity
 *                     - branch_id
 *                   properties:
 *                     menu_item_id:
 *                       type: integer
 *                     quantity:
 *                       type: number
 *                     branch_id:
 *                       type: integer
 *                     notes:
 *                       type: string
 *     responses:
 *       200:
 *         description: Distributions recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post(
  "/production-inventory/bulk-distribute",
  authenticateToken,
  async (req, res) => {
    try {
      const { distributions } = req.body;

      if (
        !distributions ||
        !Array.isArray(distributions) ||
        distributions.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Distributions array is required and must not be empty",
        });
      }

      // Validate each distribution
      for (const distribution of distributions) {
        if (
          !distribution.menu_item_id ||
          !distribution.quantity ||
          !distribution.branch_id
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Each distribution must have menu_item_id, quantity, and branch_id",
          });
        }
      }

      const results = await ProductionInventory.recordBulkDistributions(
        distributions,
        req.user.id
      );

      res.json({
        success: true,
        message: `${results.length} distributions recorded successfully`,
        data: results,
      });
    } catch (error) {
      console.error("Error recording bulk distributions:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to record bulk distributions",
      });
    }
  }
);

/**
 * @swagger
 * /api/menu/production-inventory/{id}/distribution-history:
 *   get:
 *     summary: Get distribution history for a menu item
 *     tags: [Production Inventory]
 */
router.get(
  "/production-inventory/:id/distribution-history",
  authenticateToken,
  async (req, res) => {
    try {
      const filters = {
        branch_id: req.query.branch_id,
        date_from: req.query.date_from,
        date_to: req.query.date_to,
      };

      const distributionHistory =
        await ProductionInventory.getDistributionHistory(
          req.params.id,
          filters
        );

      res.json({
        success: true,
        data: distributionHistory,
      });
    } catch (error) {
      console.error("Error fetching distribution history:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch distribution history",
      });
    }
  }
);

/**
 * @swagger
 * /api/menu/production-inventory/{id}/check-availability:
 *   post:
 *     summary: Check distribution availability
 *     tags: [Production Inventory]
 */
router.post(
  "/production-inventory/:id/check-availability",
  authenticateToken,
  async (req, res) => {
    try {
      const { quantity } = req.body;

      if (!quantity) {
        return res.status(400).json({
          success: false,
          message: "Quantity is required",
        });
      }

      const availability =
        await ProductionInventory.checkDistributionAvailability(
          req.params.id,
          quantity
        );

      res.json({
        success: true,
        data: availability,
      });
    } catch (error) {
      console.error("Error checking distribution availability:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to check distribution availability",
      });
    }
  }
);

/**
 * @swagger
 * /api/menu/production-inventory/{id}/update-initial-stock:
 *   post:
 *     summary: Update initial stock from recipe batch size
 *     tags: [Production Inventory]
 */
router.post(
  "/production-inventory/:id/update-initial-stock",
  authenticateToken,
  async (req, res) => {
    try {
      const inventoryItem =
        await ProductionInventory.updateInitialStockFromRecipe(
          req.params.id,
          req.user.id
        );

      res.json({
        success: true,
        data: inventoryItem,
        message: "Initial stock updated from recipe batch size",
      });
    } catch (error) {
      console.error("Error updating initial stock:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update initial stock",
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
