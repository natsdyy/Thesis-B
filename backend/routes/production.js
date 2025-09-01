const express = require("express");
const router = express.Router();
const ProductionOrder = require("../models/ProductionOrder");
const Recipe = require("../models/Recipe");
const WorkOrder = require("../models/WorkOrder");
const QualityInspection = require("../models/QualityInspection");
const ProductionWaste = require("../models/ProductionWaste");
const Equipment = require("../models/Equipment");
const MaintenanceSchedule = require("../models/MaintenanceSchedule");

/**
 * @swagger
 * components:
 *   schemas:
 *     ProductionOrder:
 *       type: object
 *       required:
 *         - product_name
 *         - quantity_planned
 *         - unit_of_measure
 *         - planned_start_date
 *         - planned_end_date
 *         - created_by
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated unique identifier
 *         order_number:
 *           type: string
 *           description: Unique order number
 *         product_name:
 *           type: string
 *           description: Name of the product to be produced
 *         recipe_id:
 *           type: integer
 *           description: Recipe to use for production
 *         quantity_planned:
 *           type: integer
 *           description: Planned quantity to produce
 *         quantity_produced:
 *           type: integer
 *           description: Actual quantity produced
 *         unit_of_measure:
 *           type: string
 *           description: Unit of measurement
 *         priority:
 *           type: string
 *           enum: [Low, Normal, High, Urgent]
 *           description: Production priority
 *         status:
 *           type: string
 *           enum: [Draft, Scheduled, In Progress, Completed, Cancelled]
 *           description: Current production status
 *         planned_start_date:
 *           type: string
 *           format: date
 *           description: Planned start date
 *         planned_end_date:
 *           type: string
 *           format: date
 *           description: Planned end date
 *         assigned_to:
 *           type: integer
 *           description: User assigned to manage production
 *         created_by:
 *           type: integer
 *           description: User who created the order
 *         notes:
 *           type: string
 *           description: Additional notes
 *         estimated_cost:
 *           type: number
 *           format: decimal
 *           description: Estimated production cost
 *         actual_cost:
 *           type: number
 *           format: decimal
 *           description: Actual production cost
 *
 *     Recipe:
 *       type: object
 *       required:
 *         - recipe_name
 *         - category
 *         - batch_size
 *         - batch_unit
 *         - created_by
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated unique identifier
 *         recipe_code:
 *           type: string
 *           description: Unique recipe code
 *         recipe_name:
 *           type: string
 *           description: Name of the recipe
 *         description:
 *           type: string
 *           description: Recipe description
 *         category:
 *           type: string
 *           description: Recipe category
 *         batch_size:
 *           type: integer
 *           description: Standard batch size
 *         batch_unit:
 *           type: string
 *           description: Batch unit of measure
 *         instructions:
 *           type: string
 *           description: Cooking instructions
 *         prep_time_minutes:
 *           type: integer
 *           description: Preparation time in minutes
 *         cooking_time_minutes:
 *           type: integer
 *           description: Cooking time in minutes
 *         total_time_minutes:
 *           type: integer
 *           description: Total time in minutes
 *         cost_per_batch:
 *           type: number
 *           format: decimal
 *           description: Cost per batch
 *         is_active:
 *           type: boolean
 *           description: Whether recipe is active
 *         difficulty_level:
 *           type: string
 *           enum: [Easy, Medium, Hard]
 *           description: Recipe difficulty
 *         created_by:
 *           type: integer
 *           description: User who created the recipe
 */

// ==================== PRODUCTION ORDERS ====================

/**
 * @swagger
 * /api/production/orders:
 *   get:
 *     summary: Get all production orders
 *     tags: [Production Orders]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: Filter by priority
 *       - in: query
 *         name: assigned_to
 *         schema:
 *           type: integer
 *         description: Filter by assigned user
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in order number, product name, or recipe name
 *     responses:
 *       200:
 *         description: List of production orders
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
 *                     $ref: '#/components/schemas/ProductionOrder'
 *       500:
 *         description: Server error
 */
router.get("/orders", async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      assigned_to: req.query.assigned_to,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      search: req.query.search,
    };

    const orders = await ProductionOrder.getAll(filters);

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching production orders:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch production orders",
    });
  }
});

/**
 * @swagger
 * /api/production/orders/{id}:
 *   get:
 *     summary: Get production order by ID
 *     tags: [Production Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Production order details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ProductionOrder'
 *       404:
 *         description: Production order not found
 *       500:
 *         description: Server error
 */
router.get("/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const order = await ProductionOrder.getById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Production order not found",
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Error fetching production order:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch production order",
    });
  }
});

/**
 * @swagger
 * /api/production/orders:
 *   post:
 *     summary: Create new production order
 *     tags: [Production Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductionOrder'
 *     responses:
 *       201:
 *         description: Production order created successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post("/orders", async (req, res) => {
  try {
    const orderData = req.body;

    // Validation
    if (
      !orderData.product_name ||
      !orderData.quantity_planned ||
      !orderData.unit_of_measure ||
      !orderData.planned_start_date ||
      !orderData.planned_end_date ||
      !orderData.created_by
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const newOrder = await ProductionOrder.create(orderData);

    res.status(201).json({
      success: true,
      message: "Production order created successfully",
      data: newOrder,
    });
  } catch (error) {
    console.error("Error creating production order:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create production order",
    });
  }
});

/**
 * @swagger
 * /api/production/orders/{id}:
 *   put:
 *     summary: Update production order
 *     tags: [Production Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductionOrder'
 *     responses:
 *       200:
 *         description: Production order updated successfully
 *       404:
 *         description: Production order not found
 *       500:
 *         description: Server error
 */
router.put("/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedOrder = await ProductionOrder.update(id, updateData);

    res.json({
      success: true,
      message: "Production order updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating production order:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update production order",
    });
  }
});

/**
 * @swagger
 * /api/production/orders/{id}/status:
 *   patch:
 *     summary: Update production order status
 *     tags: [Production Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Draft, Scheduled, In Progress, Completed, Cancelled]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Production order not found
 *       500:
 *         description: Server error
 */
router.patch("/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const validStatuses = [
      "Draft",
      "Scheduled",
      "In Progress",
      "Completed",
      "Cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const updatedOrder = await ProductionOrder.updateStatus(
      id,
      status,
      "System",
      notes
    );

    res.json({
      success: true,
      message: `Production order ${status.toLowerCase()} successfully`,
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating production order status:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update production order status",
    });
  }
});

/**
 * @swagger
 * /api/production/dashboard/stats:
 *   get:
 *     summary: Get production dashboard statistics
 *     tags: [Production Dashboard]
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_orders:
 *                       type: integer
 *                     draft_orders:
 *                       type: integer
 *                     scheduled_orders:
 *                       type: integer
 *                     in_progress_orders:
 *                       type: integer
 *                     completed_orders:
 *                       type: integer
 *                     total_planned_quantity:
 *                       type: number
 *                     total_produced_quantity:
 *                       type: number
 *                     today_orders:
 *                       type: integer
 *                     today_planned:
 *                       type: number
 *                     today_produced:
 *                       type: number
 *       500:
 *         description: Server error
 */
router.get("/dashboard/stats", async (req, res) => {
  try {
    const stats = await ProductionOrder.getDashboardStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch dashboard statistics",
    });
  }
});

// ==================== RECIPES ====================

/**
 * @swagger
 * /api/production/recipes:
 *   get:
 *     summary: Get all recipes
 *     tags: [Recipes]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in recipe name, code, or description
 *     responses:
 *       200:
 *         description: List of recipes
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
 *                     $ref: '#/components/schemas/Recipe'
 *       500:
 *         description: Server error
 */
router.get("/recipes", async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      is_active:
        req.query.is_active !== undefined
          ? req.query.is_active === "true"
          : undefined,
      search: req.query.search,
    };

    const recipes = await Recipe.getAll(filters);

    res.json({
      success: true,
      data: recipes,
    });
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch recipes",
    });
  }
});

/**
 * @swagger
 * /api/production/recipes/{id}:
 *   get:
 *     summary: Get recipe by ID
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Recipe details with ingredients
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Recipe'
 *       404:
 *         description: Recipe not found
 *       500:
 *         description: Server error
 */
router.get("/recipes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await Recipe.getById(id);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: "Recipe not found",
      });
    }

    res.json({
      success: true,
      data: recipe,
    });
  } catch (error) {
    console.error("Error fetching recipe:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch recipe",
    });
  }
});

/**
 * @swagger
 * /api/production/recipes:
 *   post:
 *     summary: Create new recipe
 *     tags: [Recipes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             allOf:
 *               - $ref: '#/components/schemas/Recipe'
 *               - type: object
 *                 properties:
 *                   ingredients:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         inventory_item_type_id:
 *                           type: integer
 *                         quantity_required:
 *                           type: number
 *                         unit:
 *                           type: string
 *                         cost_per_unit:
 *                           type: number
 *                         preparation_notes:
 *                           type: string
 *                         is_optional:
 *                           type: boolean
 *                         sequence_order:
 *                           type: integer
 *     responses:
 *       201:
 *         description: Recipe created successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post("/recipes", async (req, res) => {
  try {
    const { ingredients, ...recipeData } = req.body;

    // Validation
    if (
      !recipeData.recipe_name ||
      !recipeData.category ||
      !recipeData.batch_size ||
      !recipeData.batch_unit ||
      !recipeData.created_by
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const newRecipe = await Recipe.create(recipeData, ingredients || []);

    res.status(201).json({
      success: true,
      message: "Recipe created successfully",
      data: newRecipe,
    });
  } catch (error) {
    console.error("Error creating recipe:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create recipe",
    });
  }
});

/**
 * @swagger
 * /api/production/recipes/{id}:
 *   put:
 *     summary: Update recipe
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             allOf:
 *               - $ref: '#/components/schemas/Recipe'
 *               - type: object
 *                 properties:
 *                   ingredients:
 *                     type: array
 *                     items:
 *                       type: object
 *     responses:
 *       200:
 *         description: Recipe updated successfully
 *       404:
 *         description: Recipe not found
 *       500:
 *         description: Server error
 */
router.put("/recipes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { ingredients, ...recipeData } = req.body;

    const updatedRecipe = await Recipe.update(id, recipeData, ingredients);

    res.json({
      success: true,
      message: "Recipe updated successfully",
      data: updatedRecipe,
    });
  } catch (error) {
    console.error("Error updating recipe:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update recipe",
    });
  }
});

/**
 * @swagger
 * /api/production/recipes/{id}/availability:
 *   get:
 *     summary: Check ingredient availability for recipe
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: batch_size
 *         schema:
 *           type: number
 *         description: Custom batch size (optional)
 *     responses:
 *       200:
 *         description: Ingredient availability information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     recipe_id:
 *                       type: integer
 *                     batch_size:
 *                       type: number
 *                     scale_factor:
 *                       type: number
 *                     all_ingredients_available:
 *                       type: boolean
 *                     ingredient_availability:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: Recipe not found
 *       500:
 *         description: Server error
 */
router.get("/recipes/:id/availability", async (req, res) => {
  try {
    const { id } = req.params;
    const batchSize = req.query.batch_size
      ? parseFloat(req.query.batch_size)
      : null;

    const availability = await Recipe.checkIngredientAvailability(
      id,
      batchSize
    );

    res.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error("Error checking ingredient availability:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to check ingredient availability",
    });
  }
});

/**
 * @swagger
 * /api/production/recipes/categories:
 *   get:
 *     summary: Get recipe categories
 *     tags: [Recipes]
 *     responses:
 *       200:
 *         description: List of recipe categories
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
 *                     type: string
 *       500:
 *         description: Server error
 */
router.get("/recipes/categories", async (req, res) => {
  try {
    const categories = await Recipe.getCategories();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching recipe categories:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch recipe categories",
    });
  }
});

/**
 * @swagger
 * /api/production/recipes/{id}:
 *   delete:
 *     summary: Delete recipe
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Recipe deleted successfully
 *       404:
 *         description: Recipe not found
 *       500:
 *         description: Server error
 */
router.delete("/recipes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRecipe = await Recipe.delete(id);

    res.json({
      success: true,
      message: "Recipe deleted successfully",
      data: deletedRecipe,
    });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete recipe",
    });
  }
});

/**
 * @swagger
 * /api/production/orders/{id}:
 *   delete:
 *     summary: Delete production order
 *     tags: [Production Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Production order deleted successfully
 *       404:
 *         description: Production order not found
 *       500:
 *         description: Server error
 */
router.delete("/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedOrder = await ProductionOrder.delete(id);

    res.json({
      success: true,
      message: "Production order deleted successfully",
      data: deletedOrder,
    });
  } catch (error) {
    console.error("Error deleting production order:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete production order",
    });
  }
});

// ==================== WORK ORDERS ====================

/**
 * @swagger
 * /api/production/work-orders:
 *   get:
 *     summary: Get all work orders
 *     tags: [Work Orders]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: Filter by priority
 *       - in: query
 *         name: task_type
 *         schema:
 *           type: string
 *         description: Filter by task type
 *       - in: query
 *         name: assigned_to
 *         schema:
 *           type: integer
 *         description: Filter by assigned user
 *       - in: query
 *         name: production_order_id
 *         schema:
 *           type: integer
 *         description: Filter by production order
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in task name, work order number, or description
 *     responses:
 *       200:
 *         description: List of work orders
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
 *       500:
 *         description: Server error
 */
router.get("/work-orders", async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      task_type: req.query.task_type,
      assigned_to: req.query.assigned_to,
      production_order_id: req.query.production_order_id,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      search: req.query.search,
    };

    const workOrders = await WorkOrder.getAll(filters);

    res.json({
      success: true,
      data: workOrders,
    });
  } catch (error) {
    console.error("Error fetching work orders:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch work orders",
    });
  }
});

/**
 * @swagger
 * /api/production/work-orders/{id}:
 *   get:
 *     summary: Get work order by ID
 *     tags: [Work Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Work order details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       404:
 *         description: Work order not found
 *       500:
 *         description: Server error
 */
router.get("/work-orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const workOrder = await WorkOrder.getById(id);

    if (!workOrder) {
      return res.status(404).json({
        success: false,
        message: "Work order not found",
      });
    }

    res.json({
      success: true,
      data: workOrder,
    });
  } catch (error) {
    console.error("Error fetching work order:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch work order",
    });
  }
});

/**
 * @swagger
 * /api/production/work-orders:
 *   post:
 *     summary: Create new work order
 *     tags: [Work Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Work order created successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post("/work-orders", async (req, res) => {
  try {
    const workOrderData = req.body;

    // Validation
    if (
      !workOrderData.production_order_id ||
      !workOrderData.task_name ||
      !workOrderData.task_description ||
      !workOrderData.task_type ||
      !workOrderData.assigned_to ||
      !workOrderData.scheduled_start ||
      !workOrderData.scheduled_end ||
      !workOrderData.estimated_duration_minutes ||
      !workOrderData.created_by
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const newWorkOrder = await WorkOrder.create(workOrderData);

    res.status(201).json({
      success: true,
      message: "Work order created successfully",
      data: newWorkOrder,
    });
  } catch (error) {
    console.error("Error creating work order:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create work order",
    });
  }
});

/**
 * @swagger
 * /api/production/work-orders/{id}/status:
 *   patch:
 *     summary: Update work order status
 *     tags: [Work Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Pending, In Progress, Completed, On Hold]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Work order not found
 *       500:
 *         description: Server error
 */
router.patch("/work-orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const validStatuses = ["Pending", "In Progress", "Completed", "On Hold"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const updatedWorkOrder = await WorkOrder.updateStatus(
      id,
      status,
      "System",
      notes
    );

    res.json({
      success: true,
      message: `Work order ${status.toLowerCase()} successfully`,
      data: updatedWorkOrder,
    });
  } catch (error) {
    console.error("Error updating work order status:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update work order status",
    });
  }
});

/**
 * @swagger
 * /api/production/work-orders/stats:
 *   get:
 *     summary: Get work order statistics
 *     tags: [Work Orders]
 *     responses:
 *       200:
 *         description: Work order statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       500:
 *         description: Server error
 */
router.get("/work-orders/stats", async (req, res) => {
  try {
    const stats = await WorkOrder.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching work order stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch work order statistics",
    });
  }
});

// ==================== QUALITY INSPECTIONS ====================

/**
 * @swagger
 * /api/production/quality-inspections:
 *   get:
 *     summary: Get all quality inspections
 *     tags: [Quality Inspections]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: inspection_type
 *         schema:
 *           type: string
 *         description: Filter by inspection type
 *       - in: query
 *         name: inspection_stage
 *         schema:
 *           type: string
 *         description: Filter by inspection stage
 *       - in: query
 *         name: inspector_id
 *         schema:
 *           type: integer
 *         description: Filter by inspector
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in inspection number, findings, or batch number
 *     responses:
 *       200:
 *         description: List of quality inspections
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
 *       500:
 *         description: Server error
 */
router.get("/quality-inspections", async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      inspection_type: req.query.inspection_type,
      inspection_stage: req.query.inspection_stage,
      inspector_id: req.query.inspector_id,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
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
 * /api/production/quality-inspections/{id}:
 *   get:
 *     summary: Get quality inspection by ID
 *     tags: [Quality Inspections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Quality inspection details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       404:
 *         description: Quality inspection not found
 *       500:
 *         description: Server error
 */
router.get("/quality-inspections/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const inspection = await QualityInspection.getById(id);

    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: "Quality inspection not found",
      });
    }

    res.json({
      success: true,
      data: inspection,
    });
  } catch (error) {
    console.error("Error fetching quality inspection:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch quality inspection",
    });
  }
});

/**
 * @swagger
 * /api/production/quality-inspections:
 *   post:
 *     summary: Create new quality inspection
 *     tags: [Quality Inspections]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Quality inspection created successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post("/quality-inspections", async (req, res) => {
  try {
    const { checklist_items, ...inspectionData } = req.body;

    // Validation
    if (
      !inspectionData.production_batch_id ||
      !inspectionData.inspection_type ||
      !inspectionData.inspection_stage ||
      !inspectionData.inspector_id
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const newInspection = await QualityInspection.create(
      inspectionData,
      checklist_items || []
    );

    res.status(201).json({
      success: true,
      message: "Quality inspection created successfully",
      data: newInspection,
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
 * /api/production/quality-inspections/stats:
 *   get:
 *     summary: Get quality inspection statistics
 *     tags: [Quality Inspections]
 *     responses:
 *       200:
 *         description: Quality inspection statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       500:
 *         description: Server error
 */
router.get("/quality-inspections/stats", async (req, res) => {
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

/**
 * @swagger
 * /api/production/quality-inspections/critical-failures:
 *   get:
 *     summary: Get critical quality failures
 *     tags: [Quality Inspections]
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *     responses:
 *       200:
 *         description: List of critical failures
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
 *       500:
 *         description: Server error
 */
router.get("/quality-inspections/critical-failures", async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const failures = await QualityInspection.getCriticalFailures(
      date_from,
      date_to
    );

    res.json({
      success: true,
      data: failures,
    });
  } catch (error) {
    console.error("Error fetching critical failures:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch critical failures",
    });
  }
});

// ==================== PRODUCTION WASTE ====================

/**
 * @swagger
 * /api/production/waste:
 *   get:
 *     summary: Get all production waste records
 *     tags: [Production Waste]
 *     parameters:
 *       - in: query
 *         name: waste_type
 *         schema:
 *           type: string
 *         description: Filter by waste type
 *       - in: query
 *         name: is_preventable
 *         schema:
 *           type: boolean
 *         description: Filter by preventable status
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *       - in: query
 *         name: production_batch_id
 *         schema:
 *           type: integer
 *         description: Filter by production batch
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in waste record number, reason, or item name
 *     responses:
 *       200:
 *         description: List of production waste records
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
 *       500:
 *         description: Server error
 */
router.get("/waste", async (req, res) => {
  try {
    const filters = {
      waste_type: req.query.waste_type,
      is_preventable:
        req.query.is_preventable !== undefined
          ? req.query.is_preventable === "true"
          : undefined,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      production_batch_id: req.query.production_batch_id,
      search: req.query.search,
    };

    const wasteRecords = await ProductionWaste.getAll(filters);

    res.json({
      success: true,
      data: wasteRecords,
    });
  } catch (error) {
    console.error("Error fetching production waste:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch production waste records",
    });
  }
});

/**
 * @swagger
 * /api/production/waste/{id}:
 *   get:
 *     summary: Get production waste record by ID
 *     tags: [Production Waste]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Production waste record details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       404:
 *         description: Production waste record not found
 *       500:
 *         description: Server error
 */
router.get("/waste/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const waste = await ProductionWaste.getById(id);

    if (!waste) {
      return res.status(404).json({
        success: false,
        message: "Production waste record not found",
      });
    }

    res.json({
      success: true,
      data: waste,
    });
  } catch (error) {
    console.error("Error fetching production waste:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch production waste record",
    });
  }
});

/**
 * @swagger
 * /api/production/waste:
 *   post:
 *     summary: Create new production waste record
 *     tags: [Production Waste]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Production waste record created successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post("/waste", async (req, res) => {
  try {
    const wasteData = req.body;

    // Validation
    if (
      !wasteData.production_batch_id ||
      !wasteData.inventory_item_type_id ||
      !wasteData.waste_type ||
      !wasteData.quantity_wasted ||
      !wasteData.unit ||
      !wasteData.reason ||
      !wasteData.reported_by
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const newWaste = await ProductionWaste.create(wasteData);

    res.status(201).json({
      success: true,
      message: "Production waste record created successfully",
      data: newWaste,
    });
  } catch (error) {
    console.error("Error creating production waste record:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create production waste record",
    });
  }
});

/**
 * @swagger
 * /api/production/waste/stats:
 *   get:
 *     summary: Get production waste statistics
 *     tags: [Production Waste]
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *     responses:
 *       200:
 *         description: Production waste statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       500:
 *         description: Server error
 */
router.get("/waste/stats", async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const stats = await ProductionWaste.getStats(date_from, date_to);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching waste stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch waste statistics",
    });
  }
});

// ==================== EQUIPMENT ====================

/**
 * @swagger
 * /api/production/equipment:
 *   get:
 *     summary: Get all equipment
 *     tags: [Equipment]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: equipment_type
 *         schema:
 *           type: string
 *         description: Filter by equipment type
 *       - in: query
 *         name: assigned_to
 *         schema:
 *           type: integer
 *         description: Filter by assigned user
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in equipment name, code, or description
 *     responses:
 *       200:
 *         description: List of equipment
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
 *       500:
 *         description: Server error
 */
router.get("/equipment", async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      equipment_type: req.query.equipment_type,
      assigned_to: req.query.assigned_to,
      search: req.query.search,
    };

    const equipment = await Equipment.getAll(filters);

    res.json({
      success: true,
      data: equipment,
    });
  } catch (error) {
    console.error("Error fetching equipment:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch equipment",
    });
  }
});

/**
 * @swagger
 * /api/production/equipment/{id}:
 *   get:
 *     summary: Get equipment by ID
 *     tags: [Equipment]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Equipment details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       404:
 *         description: Equipment not found
 *       500:
 *         description: Server error
 */
router.get("/equipment/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const equipment = await Equipment.getById(id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found",
      });
    }

    res.json({
      success: true,
      data: equipment,
    });
  } catch (error) {
    console.error("Error fetching equipment:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch equipment",
    });
  }
});

/**
 * @swagger
 * /api/production/equipment:
 *   post:
 *     summary: Create new equipment
 *     tags: [Equipment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Equipment created successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post("/equipment", async (req, res) => {
  try {
    const equipmentData = req.body;

    // Validation
    if (
      !equipmentData.equipment_name ||
      !equipmentData.category ||
      !equipmentData.created_by
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const newEquipment = await Equipment.create(equipmentData);

    res.status(201).json({
      success: true,
      message: "Equipment created successfully",
      data: newEquipment,
    });
  } catch (error) {
    console.error("Error creating equipment:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create equipment",
    });
  }
});

/**
 * @swagger
 * /api/production/equipment/stats:
 *   get:
 *     summary: Get equipment statistics
 *     tags: [Equipment]
 *     responses:
 *       200:
 *         description: Equipment statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       500:
 *         description: Server error
 */
router.get("/equipment/stats", async (req, res) => {
  try {
    const stats = await Equipment.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching equipment stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch equipment statistics",
    });
  }
});

// ==================== MAINTENANCE SCHEDULES ====================

/**
 * @swagger
 * /api/production/maintenance/schedules:
 *   get:
 *     summary: Get all maintenance schedules
 *     tags: [Maintenance Schedules]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: maintenance_type
 *         schema:
 *           type: string
 *         description: Filter by maintenance type
 *       - in: query
 *         name: equipment_id
 *         schema:
 *           type: integer
 *         description: Filter by equipment
 *       - in: query
 *         name: assigned_to
 *         schema:
 *           type: integer
 *         description: Filter by assigned user
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in maintenance number, description, or equipment name
 *     responses:
 *       200:
 *         description: List of maintenance schedules
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
 *       500:
 *         description: Server error
 */
router.get("/maintenance/schedules", async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      maintenance_type: req.query.maintenance_type,
      equipment_id: req.query.equipment_id,
      assigned_to: req.query.assigned_to,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      search: req.query.search,
    };

    const schedules = await MaintenanceSchedule.getAll(filters);

    res.json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    console.error("Error fetching maintenance schedules:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch maintenance schedules",
    });
  }
});

/**
 * @swagger
 * /api/production/maintenance/schedules/{id}:
 *   get:
 *     summary: Get maintenance schedule by ID
 *     tags: [Maintenance Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Maintenance schedule details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       404:
 *         description: Maintenance schedule not found
 *       500:
 *         description: Server error
 */
router.get("/maintenance/schedules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await MaintenanceSchedule.getById(id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Maintenance schedule not found",
      });
    }

    res.json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    console.error("Error fetching maintenance schedule:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch maintenance schedule",
    });
  }
});

/**
 * @swagger
 * /api/production/maintenance/schedules:
 *   post:
 *     summary: Create new maintenance schedule
 *     tags: [Maintenance Schedules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Maintenance schedule created successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post("/maintenance/schedules", async (req, res) => {
  try {
    const scheduleData = req.body;

    // Validation
    if (
      !scheduleData.equipment_id ||
      !scheduleData.maintenance_type ||
      !scheduleData.description ||
      !scheduleData.scheduled_date ||
      !scheduleData.assigned_to
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const newSchedule = await MaintenanceSchedule.create(scheduleData);

    res.status(201).json({
      success: true,
      message: "Maintenance schedule created successfully",
      data: newSchedule,
    });
  } catch (error) {
    console.error("Error creating maintenance schedule:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create maintenance schedule",
    });
  }
});

/**
 * @swagger
 * /api/production/maintenance/schedules/stats:
 *   get:
 *     summary: Get maintenance schedule statistics
 *     tags: [Maintenance Schedules]
 *     responses:
 *       200:
 *         description: Maintenance schedule statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       500:
 *         description: Server error
 */
router.get("/maintenance/schedules/stats", async (req, res) => {
  try {
    const stats = await MaintenanceSchedule.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching maintenance schedule stats:", error);
    res.status(500).json({
      success: false,
      message:
        error.message || "Failed to fetch maintenance schedule statistics",
    });
  }
});

/**
 * @swagger
 * /api/production/maintenance/schedules/overdue:
 *   get:
 *     summary: Get overdue maintenance schedules
 *     tags: [Maintenance Schedules]
 *     responses:
 *       200:
 *         description: List of overdue maintenance schedules
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
 *       500:
 *         description: Server error
 */
router.get("/maintenance/schedules/overdue", async (req, res) => {
  try {
    const overdueSchedules = await MaintenanceSchedule.getOverdueSchedules();

    res.json({
      success: true,
      data: overdueSchedules,
    });
  } catch (error) {
    console.error("Error fetching overdue maintenance schedules:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch overdue maintenance schedules",
    });
  }
});

// ========================================
// PRODUCTION ANALYTICS ROUTES
// ========================================

/**
 * @swagger
 * /api/production/analytics/metrics:
 *   get:
 *     summary: Get production analytics metrics
 *     tags: [Production Analytics]
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for metrics (YYYY-MM-DD)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for metrics (YYYY-MM-DD)
 *       - in: query
 *         name: metric_type
 *         schema:
 *           type: string
 *           enum: [all, performance, quality, waste, maintenance]
 *         description: Type of metrics to retrieve
 *     responses:
 *       200:
 *         description: Production analytics metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     performance_metrics:
 *                       type: object
 *                     quality_metrics:
 *                       type: object
 *                     waste_metrics:
 *                       type: object
 *                     maintenance_metrics:
 *                       type: object
 *                     trends:
 *                       type: object
 *       500:
 *         description: Server error
 */
router.get("/analytics/metrics", async (req, res) => {
  try {
    const { date_from, date_to, metric_type = "all" } = req.query;

    // Get performance metrics
    const performanceMetrics = await getPerformanceMetrics(date_from, date_to);

    // Get quality metrics
    const qualityMetrics = await getQualityMetrics(date_from, date_to);

    // Get waste metrics
    const wasteMetrics = await getWasteMetrics(date_from, date_to);

    // Get maintenance metrics
    const maintenanceMetrics = await getMaintenanceMetrics(date_from, date_to);

    // Get production trends
    const trends = await getProductionTrends(date_from, date_to);

    const metrics = {
      performance_metrics: performanceMetrics,
      quality_metrics: qualityMetrics,
      waste_metrics: wasteMetrics,
      maintenance_metrics: maintenanceMetrics,
      trends: trends,
    };

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error("Error fetching production analytics metrics:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch production analytics metrics",
    });
  }
});

/**
 * @swagger
 * /api/production/analytics/dashboard:
 *   get:
 *     summary: Get production dashboard analytics
 *     tags: [Production Analytics]
 *     responses:
 *       200:
 *         description: Production dashboard analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       500:
 *         description: Server error
 */
router.get("/analytics/dashboard", async (req, res) => {
  try {
    const dashboardData = await getDashboardAnalytics();

    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("Error fetching production dashboard analytics:", error);
    res.status(500).json({
      success: false,
      message:
        error.message || "Failed to fetch production dashboard analytics",
    });
  }
});

/**
 * @swagger
 * /api/production/analytics/reports:
 *   get:
 *     summary: Generate production analytics reports
 *     tags: [Production Analytics]
 *     parameters:
 *       - in: query
 *         name: report_type
 *         schema:
 *           type: string
 *           enum: [performance, quality, waste, maintenance, comprehensive]
 *         description: Type of report to generate
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for report (YYYY-MM-DD)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for report (YYYY-MM-DD)
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, pdf]
 *         description: Report format
 *     responses:
 *       200:
 *         description: Production analytics report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       500:
 *         description: Server error
 */
router.get("/analytics/reports", async (req, res) => {
  try {
    const { report_type, date_from, date_to, format = "json" } = req.query;

    const report = await generateAnalyticsReport(
      report_type,
      date_from,
      date_to,
      format
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Error generating production analytics report:", error);
    res.status(500).json({
      success: false,
      message:
        error.message || "Failed to generate production analytics report",
    });
  }
});

// Helper functions for analytics
async function getPerformanceMetrics(dateFrom, dateTo) {
  try {
    const orders = await ProductionOrder.getAll();

    // Filter by date if provided
    let filteredOrders = orders;
    if (dateFrom) {
      filteredOrders = filteredOrders.filter(
        (o) => o.planned_start_date >= dateFrom
      );
    }
    if (dateTo) {
      filteredOrders = filteredOrders.filter(
        (o) => o.planned_start_date <= dateTo
      );
    }

    const totalOrders = filteredOrders.length;
    const completedOrders = filteredOrders.filter(
      (o) => o.status === "Completed"
    );
    const inProgressOrders = filteredOrders.filter(
      (o) => o.status === "In Progress"
    );

    const totalPlanned = filteredOrders.reduce(
      (sum, o) => sum + (o.quantity_planned || 0),
      0
    );
    const totalProduced = filteredOrders.reduce(
      (sum, o) => sum + (o.quantity_produced || 0),
      0
    );

    const efficiency =
      totalPlanned > 0 ? (totalProduced / totalPlanned) * 100 : 0;

    // Calculate on-time delivery
    const onTimeOrders = completedOrders.filter((order) => {
      if (!order.actual_end_date || !order.planned_end_date) return false;
      return (
        new Date(order.actual_end_date) <= new Date(order.planned_end_date)
      );
    });

    const onTimeRate =
      completedOrders.length > 0
        ? (onTimeOrders.length / completedOrders.length) * 100
        : 0;

    // Calculate cost metrics
    const totalCost = filteredOrders.reduce(
      (sum, o) => sum + (o.actual_cost || 0),
      0
    );
    const avgCostPerUnit = totalProduced > 0 ? totalCost / totalProduced : 0;

    return {
      total_orders: totalOrders,
      completed_orders: completedOrders.length,
      in_progress_orders: inProgressOrders.length,
      total_planned_quantity: totalPlanned,
      total_produced_quantity: totalProduced,
      efficiency_rate: Math.round(efficiency),
      on_time_delivery_rate: Math.round(onTimeRate),
      total_cost: totalCost,
      average_cost_per_unit: avgCostPerUnit,
      completion_rate:
        totalOrders > 0
          ? Math.round((completedOrders.length / totalOrders) * 100)
          : 0,
    };
  } catch (error) {
    console.error("Error getting performance metrics:", error);
    throw new Error("Failed to get performance metrics");
  }
}

async function getQualityMetrics(dateFrom, dateTo) {
  try {
    const inspections = await QualityInspection.getAll();

    // Filter by date if provided
    let filteredInspections = inspections;
    if (dateFrom) {
      filteredInspections = filteredInspections.filter(
        (i) => i.inspection_date >= dateFrom
      );
    }
    if (dateTo) {
      filteredInspections = filteredInspections.filter(
        (i) => i.inspection_date <= dateTo
      );
    }

    const totalInspections = filteredInspections.length;
    const passedInspections = filteredInspections.filter(
      (i) => i.status === "Passed"
    );
    const failedInspections = filteredInspections.filter(
      (i) => i.status === "Failed"
    );

    const passRate =
      totalInspections > 0
        ? (passedInspections.length / totalInspections) * 100
        : 0;
    const failureRate =
      totalInspections > 0
        ? (failedInspections.length / totalInspections) * 100
        : 0;

    // Get critical failures
    const criticalFailures = await QualityInspection.getCriticalFailures(
      dateFrom,
      dateTo
    );

    return {
      total_inspections: totalInspections,
      passed_inspections: passedInspections.length,
      failed_inspections: failedInspections.length,
      pass_rate: Math.round(passRate),
      failure_rate: Math.round(failureRate),
      critical_failures: criticalFailures.length,
      average_inspections_per_day:
        totalInspections > 0 ? Math.round(totalInspections / 30) : 0,
    };
  } catch (error) {
    console.error("Error getting quality metrics:", error);
    throw new Error("Failed to get quality metrics");
  }
}

async function getWasteMetrics(dateFrom, dateTo) {
  try {
    const wasteRecords = await ProductionWaste.getAll();

    // Filter by date if provided
    let filteredWasteRecords = wasteRecords;
    if (dateFrom) {
      filteredWasteRecords = filteredWasteRecords.filter(
        (w) => w.waste_date >= dateFrom
      );
    }
    if (dateTo) {
      filteredWasteRecords = filteredWasteRecords.filter(
        (w) => w.waste_date <= dateTo
      );
    }

    const totalWasteRecords = filteredWasteRecords.length;
    const totalQuantityWasted = filteredWasteRecords.reduce(
      (sum, w) => sum + (w.quantity_wasted || 0),
      0
    );
    const totalWasteCost = filteredWasteRecords.reduce(
      (sum, w) => sum + (w.estimated_cost || 0),
      0
    );

    const preventableWaste = filteredWasteRecords.filter(
      (w) => w.is_preventable
    );
    const preventableCost = preventableWaste.reduce(
      (sum, w) => sum + (w.estimated_cost || 0),
      0
    );

    const preventableRate =
      totalWasteRecords > 0
        ? (preventableWaste.length / totalWasteRecords) * 100
        : 0;

    // Group by waste type
    const wasteByType = {};
    filteredWasteRecords.forEach((waste) => {
      const type = waste.waste_type || "Unknown";
      if (!wasteByType[type]) {
        wasteByType[type] = { count: 0, quantity: 0, cost: 0 };
      }
      wasteByType[type].count++;
      wasteByType[type].quantity += waste.quantity_wasted || 0;
      wasteByType[type].cost += waste.estimated_cost || 0;
    });

    return {
      total_waste_records: totalWasteRecords,
      total_quantity_wasted: totalQuantityWasted,
      total_waste_cost: totalWasteCost,
      preventable_waste_count: preventableWaste.length,
      preventable_waste_cost: preventableCost,
      preventable_rate: Math.round(preventableRate),
      waste_by_type: wasteByType,
      average_waste_per_day:
        totalWasteRecords > 0 ? Math.round(totalWasteRecords / 30) : 0,
    };
  } catch (error) {
    console.error("Error getting waste metrics:", error);
    throw new Error("Failed to get waste metrics");
  }
}

async function getMaintenanceMetrics(dateFrom, dateTo) {
  try {
    const schedules = await MaintenanceSchedule.getAll();

    // Filter by date if provided
    let filteredSchedules = schedules;
    if (dateFrom) {
      filteredSchedules = filteredSchedules.filter((s) => {
        if (!s.next_due_date) return false;
        return s.next_due_date >= dateFrom;
      });
    }
    if (dateTo) {
      filteredSchedules = filteredSchedules.filter((s) => {
        if (!s.next_due_date) return false;
        return s.next_due_date <= dateTo;
      });
    }

    const totalSchedules = filteredSchedules.length;
    const activeSchedules = filteredSchedules.filter((s) => s.is_active);

    // Get overdue schedules (this method doesn't take date parameters)
    let overdueSchedules = [];
    try {
      overdueSchedules = await MaintenanceSchedule.getOverdueSchedules();
    } catch (overdueError) {
      console.warn("Could not fetch overdue schedules:", overdueError.message);
      // Filter manually if the method fails
      const today = new Date().toISOString().split("T")[0];
      overdueSchedules = filteredSchedules.filter(
        (s) => s.next_due_date && s.next_due_date < today && s.is_active
      );
    }

    const completionRate =
      totalSchedules > 0 ? (activeSchedules.length / totalSchedules) * 100 : 0;

    // Calculate average maintenance frequency
    const avgFrequency =
      filteredSchedules.length > 0
        ? filteredSchedules.reduce(
            (sum, s) => sum + (s.frequency_days || 30),
            0
          ) / filteredSchedules.length
        : 30;

    return {
      total_schedules: totalSchedules,
      active_schedules: activeSchedules.length,
      overdue_schedules: overdueSchedules.length,
      completion_rate: Math.round(completionRate),
      average_frequency_days: Math.round(avgFrequency),
      overdue_percentage:
        totalSchedules > 0
          ? Math.round((overdueSchedules.length / totalSchedules) * 100)
          : 0,
    };
  } catch (error) {
    console.error("Error getting maintenance metrics:", error);
    throw new Error("Failed to get maintenance metrics");
  }
}

async function getProductionTrends(dateFrom, dateTo) {
  try {
    const orders = await ProductionOrder.getAll();

    // Filter by date if provided
    let filteredOrders = orders;
    if (dateFrom) {
      filteredOrders = filteredOrders.filter(
        (o) => o.planned_start_date >= dateFrom
      );
    }
    if (dateTo) {
      filteredOrders = filteredOrders.filter(
        (o) => o.planned_start_date <= dateTo
      );
    }

    // Group by date and calculate daily metrics
    const dailyMetrics = {};
    filteredOrders.forEach((order) => {
      const date = order.planned_start_date;
      if (!dailyMetrics[date]) {
        dailyMetrics[date] = {
          orders: 0,
          planned_quantity: 0,
          produced_quantity: 0,
          cost: 0,
        };
      }
      dailyMetrics[date].orders++;
      dailyMetrics[date].planned_quantity += order.quantity_planned || 0;
      dailyMetrics[date].produced_quantity += order.quantity_produced || 0;
      dailyMetrics[date].cost += order.actual_cost || 0;
    });

    // Convert to array and sort by date
    const trends = Object.entries(dailyMetrics)
      .map(([date, metrics]) => ({
        date,
        ...metrics,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return trends;
  } catch (error) {
    console.error("Error getting production trends:", error);
    throw new Error("Failed to get production trends");
  }
}

async function getDashboardAnalytics() {
  try {
    const performanceMetrics = await getPerformanceMetrics();
    const qualityMetrics = await getQualityMetrics();
    const wasteMetrics = await getWasteMetrics();
    const maintenanceMetrics = await getMaintenanceMetrics();

    return {
      performance: performanceMetrics,
      quality: qualityMetrics,
      waste: wasteMetrics,
      maintenance: maintenanceMetrics,
      last_updated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error getting dashboard analytics:", error);
    throw new Error("Failed to get dashboard analytics");
  }
}

async function generateAnalyticsReport(reportType, dateFrom, dateTo, format) {
  try {
    let reportData = {};

    switch (reportType) {
      case "performance":
        reportData = await getPerformanceMetrics(dateFrom, dateTo);
        break;
      case "quality":
        reportData = await getQualityMetrics(dateFrom, dateTo);
        break;
      case "waste":
        reportData = await getWasteMetrics(dateFrom, dateTo);
        break;
      case "maintenance":
        reportData = await getMaintenanceMetrics(dateFrom, dateTo);
        break;
      case "comprehensive":
        reportData = {
          performance: await getPerformanceMetrics(dateFrom, dateTo),
          quality: await getQualityMetrics(dateFrom, dateTo),
          waste: await getWasteMetrics(dateFrom, dateTo),
          maintenance: await getMaintenanceMetrics(dateFrom, dateTo),
          trends: await getProductionTrends(dateFrom, dateTo),
        };
        break;
      default:
        throw new Error("Invalid report type");
    }

    return {
      report_type: reportType,
      date_range: { from: dateFrom, to: dateTo },
      generated_at: new Date().toISOString(),
      data: reportData,
    };
  } catch (error) {
    console.error("Error generating analytics report:", error);
    throw new Error("Failed to generate analytics report");
  }
}

module.exports = router;
