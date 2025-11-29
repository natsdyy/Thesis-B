const express = require("express");
const FAQ = require("../models/FAQ");
const { authenticateToken, requirePermission } = require("../middleware/rbac");
const router = express.Router();

/**
 * @swagger
 * /api/faqs:
 *   get:
 *     summary: Get all FAQs
 *     tags: [FAQs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Offset for pagination
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in question and answer
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
 *         name: include_deleted
 *         schema:
 *           type: boolean
 *         description: Include soft-deleted FAQs
 *     responses:
 *       200:
 *         description: List of FAQs
 */
router.get("/", async (req, res) => {
  try {
    const filters = {
      limit: req.query.limit ? parseInt(req.query.limit) : null,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
      search: req.query.search || null,
      category: req.query.category || null,
      is_active:
        req.query.is_active !== undefined
          ? req.query.is_active === "true"
          : null,
      include_deleted: req.query.include_deleted === "true",
    };

    const { faqs, total } = await FAQ.getAll(filters);

    res.json({
      success: true,
      data: faqs,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
      },
    });
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch FAQs",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @swagger
 * /api/faqs/active:
 *   get:
 *     summary: Get active FAQs (public endpoint)
 *     tags: [FAQs]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: List of active FAQs
 */
router.get("/active", async (req, res) => {
  try {
    const category = req.query.category || null;
    const faqs = await FAQ.getActive(category);

    res.json({
      success: true,
      data: faqs,
    });
  } catch (error) {
    console.error("Error fetching active FAQs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active FAQs",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @swagger
 * /api/faqs/categories:
 *   get:
 *     summary: Get all FAQ categories
 *     tags: [FAQs]
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get("/categories", async (req, res) => {
  try {
    const categories = await FAQ.getCategories();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching FAQ categories:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch FAQ categories",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @swagger
 * /api/faqs/stats:
 *   get:
 *     summary: Get FAQ statistics
 *     tags: [FAQs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: FAQ statistics
 */
router.get("/stats", authenticateToken, requirePermission("Manage FAQ"), async (req, res) => {
  try {
    const stats = await FAQ.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching FAQ stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch FAQ statistics",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @swagger
 * /api/faqs/{id}:
 *   get:
 *     summary: Get FAQ by ID
 *     tags: [FAQs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: FAQ ID
 *     responses:
 *       200:
 *         description: FAQ details
 *       404:
 *         description: FAQ not found
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const faqId = parseInt(id);

    const faq = await FAQ.getById(faqId);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    res.json({
      success: true,
      data: faq,
    });
  } catch (error) {
    console.error("Error fetching FAQ:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch FAQ",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @swagger
 * /api/faqs:
 *   post:
 *     summary: Create a new FAQ
 *     tags: [FAQs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - answer
 *             properties:
 *               question:
 *                 type: string
 *               answer:
 *                 type: string
 *               category:
 *                 type: string
 *               display_order:
 *                 type: integer
 *               is_active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: FAQ created successfully
 *       400:
 *         description: Invalid input
 */
router.post("/", authenticateToken, requirePermission("Manage FAQ"), async (req, res) => {
  try {
    const { question, answer, category, display_order, is_active } = req.body;

    // Validate required fields
    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question is required",
      });
    }

    if (!answer || !answer.trim()) {
      return res.status(400).json({
        success: false,
        message: "Answer is required",
      });
    }

    // Get user ID from request (if available)
    const created_by = req.user?.id || null;

    const faqData = {
      question: question.trim(),
      answer: answer.trim(),
      category: category && category.trim() ? category.trim() : null,
      display_order: display_order || 0,
      is_active: is_active !== undefined ? is_active : true,
      created_by: created_by || null,
    };

    const faq = await FAQ.create(faqData);

    res.status(201).json({
      success: true,
      message: "FAQ created successfully",
      data: faq,
    });
  } catch (error) {
    console.error("Error creating FAQ:", error);
    console.error("Error stack:", error.stack);
    
    // Return more detailed error in development
    const errorMessage = process.env.NODE_ENV === "development" 
      ? error.message 
      : "Failed to create FAQ";
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === "development" ? {
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
  }
});

/**
 * @swagger
 * /api/faqs/{id}:
 *   put:
 *     summary: Update FAQ
 *     tags: [FAQs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: FAQ ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *               answer:
 *                 type: string
 *               category:
 *                 type: string
 *               display_order:
 *                 type: integer
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: FAQ updated successfully
 *       404:
 *         description: FAQ not found
 *       400:
 *         description: Invalid input
 */
router.put("/:id", authenticateToken, requirePermission("Manage FAQ"), async (req, res) => {
  try {
    const { id } = req.params;
    const faqId = parseInt(id);
    const updateData = req.body;

    // Validate question if provided
    if (updateData.question !== undefined && !updateData.question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question cannot be empty",
      });
    }

    // Validate answer if provided
    if (updateData.answer !== undefined && !updateData.answer.trim()) {
      return res.status(400).json({
        success: false,
        message: "Answer cannot be empty",
      });
    }

    const updatedFAQ = await FAQ.update(faqId, updateData);

    res.json({
      success: true,
      message: "FAQ updated successfully",
      data: updatedFAQ,
    });
  } catch (error) {
    console.error("Error updating FAQ:", error);
    if (error.message === "FAQ not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to update FAQ",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @swagger
 * /api/faqs/{id}:
 *   delete:
 *     summary: Delete FAQ (soft delete)
 *     tags: [FAQs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: FAQ ID
 *     responses:
 *       200:
 *         description: FAQ deleted successfully
 *       404:
 *         description: FAQ not found
 */
router.delete("/:id", authenticateToken, requirePermission("Manage FAQ"), async (req, res) => {
  try {
    const { id } = req.params;
    const faqId = parseInt(id);

    await FAQ.delete(faqId);

    res.json({
      success: true,
      message: "FAQ deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    if (error.message === "FAQ not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to delete FAQ",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @swagger
 * /api/faqs/{id}/restore:
 *   patch:
 *     summary: Restore soft-deleted FAQ
 *     tags: [FAQs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: FAQ ID
 *     responses:
 *       200:
 *         description: FAQ restored successfully
 *       404:
 *         description: FAQ not found
 */
router.patch(
  "/:id/restore",
  authenticateToken,
  requirePermission("Manage FAQ"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const faqId = parseInt(id);

      const restoredFAQ = await FAQ.restore(faqId);

      res.json({
        success: true,
        message: "FAQ restored successfully",
        data: restoredFAQ,
      });
    } catch (error) {
      console.error("Error restoring FAQ:", error);
      if (
        error.message === "FAQ not found" ||
        error.message === "FAQ not found or not deleted"
      ) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      res.status(500).json({
        success: false,
        message: "Failed to restore FAQ",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;

